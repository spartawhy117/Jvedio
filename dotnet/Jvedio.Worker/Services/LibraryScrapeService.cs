using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml.Linq;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;

using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class LibraryScrapeService
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly HttpClient DownloadHttpClient = CreateDownloadHttpClient();

    private readonly ConfigStoreService configStoreService;
    private readonly LibraryService libraryService;
    private readonly ILogger<LibraryScrapeService> logger;
    private readonly ILoggerFactory loggerFactory;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;
    private readonly WorkerPathResolver workerPathResolver;
    private readonly WorkerTaskRegistryService workerTaskRegistryService;

    public LibraryScrapeService(
        ConfigStoreService configStoreService,
        LibraryService libraryService,
        ILogger<LibraryScrapeService> logger,
        ILoggerFactory loggerFactory,
        SqliteConnectionFactory sqliteConnectionFactory,
        WorkerPathResolver workerPathResolver,
        WorkerTaskRegistryService workerTaskRegistryService)
    {
        this.configStoreService = configStoreService;
        this.libraryService = libraryService;
        this.logger = logger;
        this.loggerFactory = loggerFactory;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
        this.workerPathResolver = workerPathResolver;
        this.workerTaskRegistryService = workerTaskRegistryService;
    }

    public async Task<string> ScrapeLibraryAsync(string taskId, LibraryListItemDto library, StartLibraryScrapeRequest request, CancellationToken cancellationToken)
    {
        var metaTubeConfig = configStoreService.LoadConfigObject("MetaTubeConfig");
        var serverUrl = Environment.GetEnvironmentVariable("JVEDIO_METATUBE_SERVER_URL");
        if (string.IsNullOrWhiteSpace(serverUrl))
        {
            serverUrl = configStoreService.ReadString(metaTubeConfig, "ServerUrl");
        }

        if (string.IsNullOrWhiteSpace(serverUrl))
        {
            throw new WorkerApiException(StatusCodes.Status422UnprocessableEntity, new ApiErrorDto
            {
                Code = "library.scrape.metatube_missing",
                Message = "MetaTube server url is empty.",
                UserMessage = "MetaTube 服务地址未配置，无法开始抓取。",
                Retryable = false,
                Details = new { libraryId = library.LibraryId },
            });
        }

        var timeoutSeconds = (int)Math.Max(15, configStoreService.ReadInt64(metaTubeConfig, "RequestTimeoutSeconds", 60));
        var client = new MetaTubeWorkerClient(serverUrl, timeoutSeconds, loggerFactory.CreateLogger<MetaTubeWorkerClient>());
        await client.WarmupAsync(cancellationToken);

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var candidates = LoadCandidates(connection, library.LibraryId, request, library.Name);
        if (candidates.Count == 0)
        {
            libraryService.RefreshLibraryState(library.LibraryId, "scrape.completed", lastScrapeAtUtc: DateTimeOffset.UtcNow);
            return "抓取完成，当前媒体库没有需要抓取的影片。";
        }

        var succeededCount = 0;
        var failedCount = 0;
        var sidecarCount = 0;
        var actorCache = new Dictionary<string, MetaTubeActorSearchResult?>(StringComparer.OrdinalIgnoreCase);
        var actorCacheLock = new object();
        for (var index = 0; index < candidates.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var candidate = candidates[index];
            workerTaskRegistryService.ReportProgress(taskId, "scraping", index + 1, candidates.Count, $"正在抓取 {candidate.Vid} ({index + 1}/{candidates.Count})");

            try
            {
                var movieSearchResults = await client.SearchMovieAsync(candidate.Vid, cancellationToken);
                var selectedMovie = movieSearchResults
                    .FirstOrDefault(item => string.Equals(item.Number, candidate.Vid, StringComparison.OrdinalIgnoreCase))
                    ?? movieSearchResults.FirstOrDefault();
                if (selectedMovie is null)
                {
                    failedCount++;
                    if (request.WriteSidecars)
                        await WriteStubSidecarAsync(candidate.Path, candidate.Vid, library.Name, cancellationToken);
                    PersistScrapeStatus(connection, candidate.DataId, "failed");
                    continue;
                }

                var movieInfo = await client.GetMovieInfoAsync(selectedMovie.Provider, selectedMovie.Id, cancellationToken);
                if (movieInfo is null)
                {
                    failedCount++;
                    if (request.WriteSidecars)
                        await WriteStubSidecarAsync(candidate.Path, candidate.Vid, library.Name, cancellationToken);
                    PersistScrapeStatus(connection, candidate.DataId, "failed");
                    continue;
                }

                var actorResults = await ResolveActorsAsync(movieInfo, client, actorCache, actorCacheLock, cancellationToken);

                var scrapeResult = MapScrapeResult(movieInfo, actorResults);
                PersistScrapeResult(connection, candidate, scrapeResult);
                PersistScrapeStatus(connection, candidate.DataId, "full");
                if (request.WriteSidecars)
                {
                    await WriteSidecarsAsync(candidate.Path, candidate.Vid, scrapeResult, request.DownloadActorAvatars, library.Name, cancellationToken);
                    sidecarCount++;
                }

                succeededCount++;
            }
            catch (Exception ex)
            {
                failedCount++;
                logger.LogWarning(ex, "[Worker-HomeMvp] Failed to scrape video {Vid}", candidate.Vid);
                try
                {
                    if (request.WriteSidecars)
                        await WriteStubSidecarAsync(candidate.Path, candidate.Vid, library.Name, cancellationToken);
                    PersistScrapeStatus(connection, candidate.DataId, "failed");
                }
                catch (Exception stubEx)
                {
                    logger.LogWarning(stubEx, "[Worker-HomeMvp] Failed to write stub sidecar for {Vid}", candidate.Vid);
                }
            }
        }

        libraryService.RefreshLibraryState(library.LibraryId, "scrape.completed", lastScrapeAtUtc: DateTimeOffset.UtcNow);
        return $"抓取完成：成功 {succeededCount}，失败 {failedCount}，写入 sidecar {sidecarCount}。";
    }

    private async Task<List<MetaTubeActorSearchResult>> ResolveActorsAsync(
        MetaTubeMovieInfo movieInfo,
        MetaTubeWorkerClient client,
        Dictionary<string, MetaTubeActorSearchResult?> actorCache,
        object actorCacheLock,
        CancellationToken cancellationToken)
    {
        var actorNames = movieInfo.Actors
            .Where(actorName => !string.IsNullOrWhiteSpace(actorName))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (actorNames.Length == 0)
        {
            return new List<MetaTubeActorSearchResult>();
        }

        var results = await Task.WhenAll(actorNames.Select(actorName => ResolveActorAsync(actorName, client, actorCache, actorCacheLock, cancellationToken)));
        return results
            .Where(actor => actor is not null)
            .Select(actor => actor!)
            .ToList();
    }

    private async Task<MetaTubeActorSearchResult?> ResolveActorAsync(
        string actorName,
        MetaTubeWorkerClient client,
        Dictionary<string, MetaTubeActorSearchResult?> actorCache,
        object actorCacheLock,
        CancellationToken cancellationToken)
    {
        bool hasCachedActor;
        MetaTubeActorSearchResult? cachedActor;
        lock (actorCacheLock)
        {
            hasCachedActor = actorCache.TryGetValue(actorName, out cachedActor);
        }

        if (hasCachedActor)
        {
            return CloneActor(cachedActor);
        }

        try
        {
            var searchResults = await client.SearchActorAsync(actorName, cancellationToken);
            var actor = searchResults
                .FirstOrDefault(item => string.Equals(item.Name, actorName, StringComparison.OrdinalIgnoreCase))
                ?? searchResults.FirstOrDefault();
            if (actor is null)
            {
                lock (actorCacheLock)
                {
                    actorCache[actorName] = null;
                }
                return null;
            }

            if (!string.IsNullOrWhiteSpace(actor.Provider) && !string.IsNullOrWhiteSpace(actor.Id))
            {
                var actorInfo = await client.GetActorInfoAsync(actor.Provider, actor.Id, cancellationToken);
                if (actorInfo?.Images is { Length: > 0 })
                {
                    actor.Images = actorInfo.Images;
                }
            }

            lock (actorCacheLock)
            {
                actorCache[actorName] = CloneActor(actor);
            }
            return actor;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Worker-HomeMvp] Actor search failed for {ActorName}", actorName);
            return null;
        }
    }

    private List<ScrapeCandidate> LoadCandidates(SqliteConnection connection, string libraryId, StartLibraryScrapeRequest request, string libraryName)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT metadata.DataID,
                   IFNULL(metadata.Path, ''),
                   IFNULL(metadata.Title, ''),
                   IFNULL(metadata.ReleaseDate, ''),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.WebUrl, ''),
                   IFNULL(metadata_video.ImageUrls, ''),
                   IFNULL(metadata_video.ScrapeStatus, 'none')
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DBId = $libraryId
              AND metadata.DataType = 0
            ORDER BY metadata.DataID ASC;
            """;
        command.Parameters.AddWithValue("$libraryId", long.Parse(libraryId));

        var requestedIds = request.VideoIds
            .Where(videoId => !string.IsNullOrWhiteSpace(videoId))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var result = new List<ScrapeCandidate>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var candidate = new ScrapeCandidate(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetString(7));

            if (!File.Exists(candidate.Path) || string.IsNullOrWhiteSpace(candidate.Vid))
            {
                continue;
            }

            if (requestedIds.Count > 0 && !requestedIds.Contains(candidate.DataId.ToString()))
            {
                continue;
            }

            // VideoIds specified (right-click rescrape): bypass NeedsScrape and ScrapeStatus check
            if (requestedIds.Count > 0)
            {
                result.Add(candidate);
                continue;
            }

            if (string.Equals(request.Mode, "all", StringComparison.OrdinalIgnoreCase) || NeedsScrape(candidate, libraryName))
            {
                result.Add(candidate);
            }
        }

        return result;
    }

    private bool NeedsScrape(ScrapeCandidate candidate, string libraryName)
    {
        // Already tried and failed — skip in missing-only mode (user can use mode=all to force retry)
        if (string.Equals(candidate.ScrapeStatus, "failed", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(candidate.Title) || string.IsNullOrWhiteSpace(candidate.WebUrl))
        {
            return true;
        }

        var sidecarDir = ResolveSidecarDirectory(candidate.Path, candidate.Vid, libraryName);
        var nfoPath = Path.Combine(sidecarDir, $"{SanitizeFileName(candidate.Vid)}.nfo");
        var posterPath = Path.Combine(sidecarDir, $"{SanitizeFileName(candidate.Vid)}-poster.jpg");
        var thumbPath = Path.Combine(sidecarDir, $"{SanitizeFileName(candidate.Vid)}-thumb.jpg");
        var fanartPath = Path.Combine(sidecarDir, $"{SanitizeFileName(candidate.Vid)}-fanart.jpg");
        return !File.Exists(nfoPath) || !File.Exists(posterPath) || !File.Exists(thumbPath) || !File.Exists(fanartPath);
    }

    private async Task WriteStubSidecarAsync(string videoPath, string vid, string libraryName, CancellationToken ct)
    {
        var sanitizedVid = SanitizeFileName(vid);
        var sidecarDir = ResolveSidecarDirectory(videoPath, vid, libraryName);
        Directory.CreateDirectory(sidecarDir);

        var nfoPath = Path.Combine(sidecarDir, $"{sanitizedVid}.nfo");
        if (!File.Exists(nfoPath))
        {
            var stubNfo = $"<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<movie>\n  <num>{vid}</num>\n</movie>";
            await File.WriteAllTextAsync(nfoPath, stubNfo, Encoding.UTF8, ct);
        }
        // Do not write poster/thumb/fanart — keep them missing so the frontend shows the placeholder image
    }

    private static void PersistScrapeStatus(SqliteConnection connection, long dataId, string status)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE metadata_video SET ScrapeStatus = $status WHERE DataID = $dataId";
        cmd.Parameters.AddWithValue("$status", status);
        cmd.Parameters.AddWithValue("$dataId", dataId);
        cmd.ExecuteNonQuery();
    }

    private void PersistScrapeResult(SqliteConnection connection, ScrapeCandidate candidate, ScrapeResultData scrapeResult)
    {
        using var metadataCommand = connection.CreateCommand();
        metadataCommand.CommandText =
            """
            UPDATE metadata
            SET Title = $title,
                ReleaseDate = $releaseDate,
                ReleaseYear = $releaseYear,
                Rating = $rating,
                Genre = $genre,
                UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
            WHERE DataID = $dataId;
            """;
        metadataCommand.Parameters.AddWithValue("$dataId", candidate.DataId);
        metadataCommand.Parameters.AddWithValue("$title", scrapeResult.Title);
        metadataCommand.Parameters.AddWithValue("$releaseDate", scrapeResult.ReleaseDate ?? string.Empty);
        metadataCommand.Parameters.AddWithValue("$releaseYear", scrapeResult.ReleaseYear);
        metadataCommand.Parameters.AddWithValue("$rating", scrapeResult.Rating);
        metadataCommand.Parameters.AddWithValue("$genre", string.Join("/", scrapeResult.Genres));
        metadataCommand.ExecuteNonQuery();

        using var videoCommand = connection.CreateCommand();
        videoCommand.CommandText =
            """
            UPDATE metadata_video
            SET Series = $series,
                Director = $director,
                Studio = $studio,
                Plot = $plot,
                Outline = $outline,
                Duration = $duration,
                ImageUrls = $imageUrls,
                WebType = $webType,
                WebUrl = $webUrl,
                ExtraInfo = $extraInfo
            WHERE DataID = $dataId;
            """;
        videoCommand.Parameters.AddWithValue("$dataId", candidate.DataId);
        videoCommand.Parameters.AddWithValue("$series", scrapeResult.Series);
        videoCommand.Parameters.AddWithValue("$director", scrapeResult.Director);
        videoCommand.Parameters.AddWithValue("$studio", scrapeResult.Studio);
        videoCommand.Parameters.AddWithValue("$plot", scrapeResult.Plot);
        videoCommand.Parameters.AddWithValue("$outline", scrapeResult.Plot);
        videoCommand.Parameters.AddWithValue("$duration", scrapeResult.Duration);
        videoCommand.Parameters.AddWithValue("$imageUrls", BuildImageUrlsPayload(scrapeResult).ToJsonString());
        videoCommand.Parameters.AddWithValue("$webType", scrapeResult.Provider);
        videoCommand.Parameters.AddWithValue("$webUrl", scrapeResult.Homepage);
        videoCommand.Parameters.AddWithValue("$extraInfo", string.Empty);
        videoCommand.ExecuteNonQuery();

        using var deleteActorsCommand = connection.CreateCommand();
        deleteActorsCommand.CommandText = "DELETE FROM metadata_to_actor WHERE DataID = $dataId;";
        deleteActorsCommand.Parameters.AddWithValue("$dataId", candidate.DataId);
        deleteActorsCommand.ExecuteNonQuery();

        foreach (var actor in scrapeResult.Actors.Where(actor => !string.IsNullOrWhiteSpace(actor.Name)))
        {
            var actorId = EnsureActor(connection, actor);
            using var relationCommand = connection.CreateCommand();
            relationCommand.CommandText =
                """
                INSERT OR IGNORE INTO metadata_to_actor (ActorID, DataID)
                VALUES ($actorId, $dataId);
                """;
            relationCommand.Parameters.AddWithValue("$actorId", actorId);
            relationCommand.Parameters.AddWithValue("$dataId", candidate.DataId);
            relationCommand.ExecuteNonQuery();
        }
    }

    private static JsonObject BuildImageUrlsPayload(ScrapeResultData scrapeResult)
    {
        return new JsonObject
        {
            ["ActorIds"] = JsonSerializer.SerializeToNode(scrapeResult.Actors.Select(actor => actor.ActorId).ToList(), JsonSerializerOptions),
            ["ActorNames"] = JsonSerializer.SerializeToNode(scrapeResult.Actors.Select(actor => actor.Name).ToList(), JsonSerializerOptions),
            ["ActressImageUrl"] = JsonSerializer.SerializeToNode(scrapeResult.Actors.Select(actor => actor.AvatarUrl).ToList(), JsonSerializerOptions),
            ["BigImageUrl"] = scrapeResult.FanartUrl,
            ["ExtraImageUrl"] = JsonSerializer.SerializeToNode(scrapeResult.PreviewImages, JsonSerializerOptions),
            ["SmallImageUrl"] = scrapeResult.PosterUrl,
            ["ThumbImageUrl"] = scrapeResult.ThumbUrl,
        };
    }

    private static long EnsureActor(SqliteConnection connection, ScrapedActorData actor)
    {
        using var existingCommand = connection.CreateCommand();
        existingCommand.CommandText =
            """
            SELECT ActorID,
                   IFNULL(ImageUrl, ''),
                   IFNULL(WebType, ''),
                   IFNULL(WebUrl, '')
            FROM actor_info
            WHERE LOWER(ActorName) = LOWER($actorName)
            LIMIT 1;
            """;
        existingCommand.Parameters.AddWithValue("$actorName", actor.Name);
        using var existingReader = existingCommand.ExecuteReader();
        if (existingReader.Read())
        {
            var actorId = existingReader.GetInt64(0);
            var currentImageUrl = existingReader.GetString(1);
            var currentWebType = existingReader.GetString(2);
            var currentWebUrl = existingReader.GetString(3);

            var nextImageUrl = string.IsNullOrWhiteSpace(actor.AvatarUrl) ? currentImageUrl : actor.AvatarUrl;
            var nextWebType = string.IsNullOrWhiteSpace(actor.Provider) ? currentWebType : actor.Provider;
            var nextWebUrl = string.IsNullOrWhiteSpace(actor.Homepage) ? currentWebUrl : actor.Homepage;

            if (!string.Equals(currentImageUrl, nextImageUrl, StringComparison.Ordinal)
                || !string.Equals(currentWebType, nextWebType, StringComparison.Ordinal)
                || !string.Equals(currentWebUrl, nextWebUrl, StringComparison.Ordinal))
            {
                using var updateCommand = connection.CreateCommand();
                updateCommand.CommandText =
                    """
                    UPDATE actor_info
                    SET ImageUrl = $imageUrl,
                        WebType = $webType,
                        WebUrl = $webUrl
                    WHERE ActorID = $actorId;
                    """;
                updateCommand.Parameters.AddWithValue("$actorId", actorId);
                updateCommand.Parameters.AddWithValue("$imageUrl", nextImageUrl);
                updateCommand.Parameters.AddWithValue("$webType", nextWebType);
                updateCommand.Parameters.AddWithValue("$webUrl", nextWebUrl);
                updateCommand.ExecuteNonQuery();
            }

            return actorId;
        }

        using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText =
            """
            INSERT INTO actor_info (ActorName, ImageUrl, WebType, WebUrl, ExtraInfo)
            VALUES ($actorName, $imageUrl, $webType, $webUrl, '');
            SELECT last_insert_rowid();
            """;
        insertCommand.Parameters.AddWithValue("$actorName", actor.Name);
        insertCommand.Parameters.AddWithValue("$imageUrl", actor.AvatarUrl);
        insertCommand.Parameters.AddWithValue("$webType", actor.Provider);
        insertCommand.Parameters.AddWithValue("$webUrl", actor.Homepage);
        return Convert.ToInt64(insertCommand.ExecuteScalar());
    }

    private async Task WriteSidecarsAsync(string videoPath, string localVid, ScrapeResultData scrapeResult, bool downloadActorAvatars, string libraryName, CancellationToken cancellationToken)
    {
        var directoryPath = Path.GetDirectoryName(videoPath);
        if (string.IsNullOrWhiteSpace(directoryPath))
        {
            return;
        }

        var vid = string.IsNullOrWhiteSpace(localVid)
            ? (string.IsNullOrWhiteSpace(scrapeResult.Vid) ? Path.GetFileNameWithoutExtension(videoPath) : scrapeResult.Vid)
            : localVid;

        var sidecarDir = ResolveSidecarDirectory(videoPath, vid, libraryName);
        Directory.CreateDirectory(sidecarDir);

        var sanitizedVid = SanitizeFileName(vid);
        await File.WriteAllTextAsync(Path.Combine(sidecarDir, $"{sanitizedVid}.nfo"), BuildNfoDocument(scrapeResult).ToString(), Encoding.UTF8, cancellationToken);
        await Task.WhenAll(
            DownloadFileAsync(scrapeResult.PosterUrl, Path.Combine(sidecarDir, $"{sanitizedVid}-poster.jpg"), scrapeResult.Homepage, cancellationToken),
            DownloadFileAsync(scrapeResult.ThumbUrl, Path.Combine(sidecarDir, $"{sanitizedVid}-thumb.jpg"), scrapeResult.Homepage, cancellationToken),
            DownloadFileAsync(scrapeResult.FanartUrl, Path.Combine(sidecarDir, $"{sanitizedVid}-fanart.jpg"), scrapeResult.Homepage, cancellationToken));

        if (!downloadActorAvatars)
        {
            return;
        }

        var actorAvatarCacheDir = Path.Combine(workerPathResolver.CurrentUserFolder, "cache", "actor-avatar");
        Directory.CreateDirectory(actorAvatarCacheDir);
        await Task.WhenAll(scrapeResult.Actors
            .Where(actor => !string.IsNullOrWhiteSpace(actor.AvatarUrl))
            .Select(actor => DownloadActorAvatarAsync(actorAvatarCacheDir, scrapeResult.Homepage, actor, cancellationToken)));
    }

    private async Task DownloadActorAvatarAsync(string actorAvatarCacheDir, string refererUrl, ScrapedActorData actor, CancellationToken cancellationToken)
    {
        var extension = GetExtensionFromUrl(actor.AvatarUrl);
        var avatarPath = Path.Combine(
            actorAvatarCacheDir,
            BuildActorAvatarCacheKey(actor.AvatarUrl, actor.ActorId, actor.Name) + extension);

        try
        {
            await DownloadFileAsync(actor.AvatarUrl, avatarPath, refererUrl, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Worker-HomeMvp] Failed to cache actor avatar for {ActorName}", actor.Name);
        }
    }

    private static MetaTubeActorSearchResult? CloneActor(MetaTubeActorSearchResult? actor)
    {
        if (actor is null)
        {
            return null;
        }

        return new MetaTubeActorSearchResult
        {
            Homepage = actor.Homepage,
            Id = actor.Id,
            Images = actor.Images.ToArray(),
            Name = actor.Name,
            Provider = actor.Provider,
        };
    }


    private static XDocument BuildNfoDocument(ScrapeResultData scrapeResult)
    {
        var root = new XElement("movie",
            new XElement("source", scrapeResult.Homepage),
            new XElement("plot", scrapeResult.Plot),
            new XElement("title", scrapeResult.Title),
            new XElement("director", scrapeResult.Director),
            new XElement("rating", scrapeResult.Rating),
            new XElement("release", scrapeResult.ReleaseDate),
            new XElement("premiered", scrapeResult.ReleaseDate),
            new XElement("runtime", scrapeResult.Duration),
            new XElement("studio", scrapeResult.Studio),
            new XElement("id", scrapeResult.Vid),
            new XElement("num", scrapeResult.Vid));

        foreach (var genre in scrapeResult.Genres.Where(genre => !string.IsNullOrWhiteSpace(genre)))
        {
            root.Add(new XElement("genre", genre));
        }

        if (!string.IsNullOrWhiteSpace(scrapeResult.Series))
        {
            root.Add(new XElement("tag", scrapeResult.Series));
        }

        if (!string.IsNullOrWhiteSpace(scrapeResult.Label))
        {
            root.Add(new XElement("tag", scrapeResult.Label));
        }

        foreach (var actor in scrapeResult.Actors.Where(actor => !string.IsNullOrWhiteSpace(actor.Name)))
        {
            root.Add(new XElement("actor",
                new XElement("name", actor.Name),
                new XElement("type", "Actor")));
        }

        if (scrapeResult.PreviewImages.Count > 0)
        {
            var fanart = new XElement("fanart");
            foreach (var imageUrl in scrapeResult.PreviewImages)
            {
                fanart.Add(new XElement("thumb", new XAttribute("preview", imageUrl), imageUrl));
            }

            root.Add(fanart);
        }

        return new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root);
    }

    private static string GetMovieNfoPath(string videoPath, string vid)
    {
        return Path.Combine(Path.GetDirectoryName(videoPath) ?? string.Empty, $"{SanitizeFileName(vid)}.nfo");
    }

    private static string GetPosterPath(string videoPath, string vid)
    {
        return Path.Combine(Path.GetDirectoryName(videoPath) ?? string.Empty, $"{SanitizeFileName(vid)}-poster.jpg");
    }

    private static string GetThumbPath(string videoPath, string vid)
    {
        return Path.Combine(Path.GetDirectoryName(videoPath) ?? string.Empty, $"{SanitizeFileName(vid)}-thumb.jpg");
    }

    private static string GetFanartPath(string videoPath, string vid)
    {
        return Path.Combine(Path.GetDirectoryName(videoPath) ?? string.Empty, $"{SanitizeFileName(vid)}-fanart.jpg");
    }

    /// <summary>
    /// Resolves the sidecar output directory.
    /// In test environment (JVEDIO_APP_BASE_DIR set): cache/video/{libraryName}/{VID}/
    /// In production: same directory as the video file.
    /// </summary>
    private string ResolveSidecarDirectory(string videoPath, string vid, string libraryName)
    {
        if (workerPathResolver.IsTestEnvironment)
        {
            var sanitizedLibName = SanitizeFileName(libraryName);
            var sanitizedVid = SanitizeFileName(vid);
            return Path.Combine(workerPathResolver.VideoCacheFolder, sanitizedLibName, sanitizedVid);
        }

        return Path.GetDirectoryName(videoPath) ?? string.Empty;
    }

    private static string SanitizeFileName(string value)
    {
        var result = value.Trim();
        foreach (var item in Path.GetInvalidFileNameChars())
        {
            result = result.Replace(item, '_');
        }

        return result;
    }

    private static string BuildActorAvatarCacheKey(string? avatarUrl, string? actorId, string actorName)
    {
        var imageKey = TryExtractAvatarCacheKey(avatarUrl);
        if (!string.IsNullOrWhiteSpace(imageKey))
        {
            return SanitizeFileName(imageKey);
        }

        if (!string.IsNullOrWhiteSpace(actorId))
        {
            return SanitizeFileName(actorId);
        }

        var bytes = SHA1.HashData(Encoding.UTF8.GetBytes(actorName.Trim().ToLowerInvariant()));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string? TryExtractAvatarCacheKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            var fromUrl = Path.GetFileNameWithoutExtension(uri.AbsolutePath);
            if (!string.IsNullOrWhiteSpace(fromUrl))
            {
                return fromUrl;
            }
        }

        var fileName = Path.GetFileNameWithoutExtension(value.Trim());
        return string.IsNullOrWhiteSpace(fileName) ? null : fileName;
    }

    private static string GetExtensionFromUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return ".jpg";
        }

        var extension = Path.GetExtension(uri.AbsolutePath);
        return string.IsNullOrWhiteSpace(extension) ? ".jpg" : extension;
    }

    private static ScrapeResultData MapScrapeResult(MetaTubeMovieInfo movieInfo, IReadOnlyList<MetaTubeActorSearchResult> actorResults)
    {
        var actors = actorResults.Count > 0
            ? actorResults
                .Where(actor => !string.IsNullOrWhiteSpace(actor.Name))
                .Select(actor => new ScrapedActorData(
                    actor.Id,
                    actor.Name,
                    actor.Images.FirstOrDefault(image => !string.IsNullOrWhiteSpace(image)) ?? string.Empty,
                    actor.Provider,
                    actor.Homepage))
                .ToList()
            : movieInfo.Actors
                .Where(actorName => !string.IsNullOrWhiteSpace(actorName))
                .Select(actorName => new ScrapedActorData(string.Empty, actorName, string.Empty, string.Empty, string.Empty))
                .ToList();

        return new ScrapeResultData(
            movieInfo.Provider,
            movieInfo.Homepage,
            movieInfo.Number,
            movieInfo.Title,
            movieInfo.Summary,
            movieInfo.ReleaseDate?.ToString("yyyy-MM-dd"),
            movieInfo.ReleaseDate?.Year ?? 0,
            movieInfo.Maker,
            movieInfo.Director,
            movieInfo.Runtime,
            movieInfo.Score,
            movieInfo.Genres.Where(genre => !string.IsNullOrWhiteSpace(genre)).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            movieInfo.Series,
            movieInfo.Label,
            string.IsNullOrWhiteSpace(movieInfo.BigCoverUrl) ? movieInfo.CoverUrl : movieInfo.BigCoverUrl,
            string.IsNullOrWhiteSpace(movieInfo.BigThumbUrl) ? movieInfo.ThumbUrl : movieInfo.BigThumbUrl,
            string.IsNullOrWhiteSpace(movieInfo.CoverUrl) ? movieInfo.BigCoverUrl : movieInfo.CoverUrl,
            movieInfo.PreviewImages.Where(image => !string.IsNullOrWhiteSpace(image)).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            actors);
    }

    private static HttpClient CreateDownloadHttpClient()
    {
        return new HttpClient(new HttpClientHandler
        {
            AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate,
            UseCookies = false,
        })
        {
            Timeout = TimeSpan.FromSeconds(100),
        };
    }

    private static async Task DownloadFileAsync(string url, string targetPath, string? refererUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(targetPath))
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(targetPath) ?? string.Empty);
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");
        request.Headers.TryAddWithoutValidation("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
        request.Headers.TryAddWithoutValidation("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");
        if (!string.IsNullOrWhiteSpace(refererUrl) && Uri.TryCreate(refererUrl, UriKind.Absolute, out var referer))
        {
            request.Headers.Referrer = referer;
        }

        using var response = await DownloadHttpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var sourceStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var fileStream = File.Create(targetPath);
        await sourceStream.CopyToAsync(fileStream, cancellationToken);
    }

    private readonly record struct ScrapeCandidate(long DataId, string Path, string Title, string ReleaseDate, string Vid, string WebUrl, string ImageUrls, string ScrapeStatus);

    private readonly record struct ScrapeResultData(
        string Provider,
        string Homepage,
        string Vid,
        string Title,
        string Plot,
        string? ReleaseDate,
        int ReleaseYear,
        string Studio,
        string Director,
        int Duration,
        float Rating,
        IReadOnlyList<string> Genres,
        string Series,
        string Label,
        string PosterUrl,
        string ThumbUrl,
        string FanartUrl,
        IReadOnlyList<string> PreviewImages,
        IReadOnlyList<ScrapedActorData> Actors);

    private readonly record struct ScrapedActorData(string ActorId, string Name, string AvatarUrl, string Provider, string Homepage);
}
