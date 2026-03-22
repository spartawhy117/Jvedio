using Jvedio.Contracts.Actors;
using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;
using Jvedio.Contracts.Videos;

using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class ActorService
{
    private static readonly string[] AvatarExtensions = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"];
    private const int DefaultPageSize = 60;
    private const int MaxPageSize = 200;

    private readonly LibraryService libraryService;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;
    private readonly WorkerPathResolver workerPathResolver;

    public ActorService(
        LibraryService libraryService,
        SqliteConnectionFactory sqliteConnectionFactory,
        WorkerPathResolver workerPathResolver)
    {
        this.libraryService = libraryService;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
        this.workerPathResolver = workerPathResolver;
    }

    public GetActorsResponse GetActors(GetActorsRequest request)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var actors = LoadActors(connection);
        var keyword = request.Keyword?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            actors = actors
                .Where(actor =>
                    ContainsIgnoreCase(actor.Name, keyword)
                    || ContainsIgnoreCase(actor.WebType, keyword)
                    || ContainsIgnoreCase(actor.WebUrl, keyword))
                .ToList();
        }

        var sorted = SortActors(actors, request.SortBy, request.SortOrder);
        var pageIndex = Math.Max(0, request.PageIndex);
        var pageSize = Math.Clamp(request.PageSize <= 0 ? DefaultPageSize : request.PageSize, 1, MaxPageSize);
        var paged = sorted
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .ToList();

        return new GetActorsResponse
        {
            Items = paged,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalCount = sorted.Count,
        };
    }

    public GetActorDetailResponse GetActorDetail(string actorId)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var actor = LoadActorRecord(connection, actorId) ?? throw CreateNotFoundException("actor.detail.not_found", $"Actor {actorId} was not found.");
        var libraries = LoadActorLibraries(connection, actor.ActorId);

        return new GetActorDetailResponse
        {
            Actor = new ActorDetailDto
            {
                ActorId = actor.ActorId.ToString(),
                AvatarPath = ResolveActorAvatarPath(actor.ActorId, actor.Name, actor.ImageUrl, actor.WebUrl),
                LibraryCount = libraries.Count,
                LibraryIds = libraries.Select(item => item.LibraryId).ToList(),
                LibraryNames = libraries.Select(item => item.LibraryName).ToList(),
                LastPlayedAt = NullIfWhiteSpace(actor.LastPlayedAt),
                LastScanAt = NullIfWhiteSpace(actor.LastScanAt),
                Name = actor.Name,
                VideoCount = actor.VideoCount,
                WebType = actor.WebType,
                WebUrl = actor.WebUrl,
            },
        };
    }

    public string GetActorAvatarPath(string actorId)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var actor = LoadActorRecord(connection, actorId) ?? throw CreateNotFoundException("actor.avatar.not_found", $"Actor {actorId} was not found.");
        var avatarPath = ResolveActorAvatarPath(actor.ActorId, actor.Name, actor.ImageUrl, actor.WebUrl);
        if (string.IsNullOrWhiteSpace(avatarPath))
        {
            throw CreateNotFoundException("actor.avatar.not_found", $"Avatar for actor {actorId} was not found.");
        }

        return avatarPath;
    }

    public GetActorVideosResponse GetActorVideos(string actorId, GetActorVideosRequest request)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var actor = LoadActorRecord(connection, actorId) ?? throw CreateNotFoundException("actor.video-query.not_found", $"Actor {actorId} was not found.");
        var libraries = libraryService.GetLibraries().ToDictionary(item => item.LibraryId, StringComparer.OrdinalIgnoreCase);
        var videos = LoadActorVideos(connection, actor.ActorId, libraries);
        var keyword = request.Keyword?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            videos = videos
                .Where(video =>
                    ContainsIgnoreCase(video.Title, keyword)
                    || ContainsIgnoreCase(video.DisplayTitle, keyword)
                    || ContainsIgnoreCase(video.Vid, keyword)
                    || ContainsIgnoreCase(video.Path, keyword)
                    || ContainsIgnoreCase(video.LibraryName, keyword))
                .ToList();
        }

        var sorted = SortVideos(videos, request.SortBy, request.SortOrder);
        var pageIndex = Math.Max(0, request.PageIndex);
        var pageSize = Math.Clamp(request.PageSize <= 0 ? DefaultPageSize : request.PageSize, 1, MaxPageSize);
        var paged = sorted
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .ToList();

        return new GetActorVideosResponse
        {
            Items = paged,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalCount = sorted.Count,
        };
    }

    private static IReadOnlyList<ActorListItemDto> SortActors(IReadOnlyList<ActorListItemDto> actors, string? sortBy, string? sortOrder)
    {
        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        var normalizedSortBy = (sortBy ?? string.Empty).Trim().ToLowerInvariant();

        IOrderedEnumerable<ActorListItemDto> ordered = normalizedSortBy switch
        {
            "actorid" => descending
                ? actors.OrderByDescending(actor => ParseActorSortId(actor.ActorId))
                : actors.OrderBy(actor => ParseActorSortId(actor.ActorId)),
            "librarycount" => descending
                ? actors.OrderByDescending(actor => actor.LibraryCount)
                : actors.OrderBy(actor => actor.LibraryCount),
            "lastplayedat" => descending
                ? actors.OrderByDescending(actor => actor.LastPlayedAt, StringComparer.OrdinalIgnoreCase)
                : actors.OrderBy(actor => actor.LastPlayedAt, StringComparer.OrdinalIgnoreCase),
            "lastscanat" => descending
                ? actors.OrderByDescending(actor => actor.LastScanAt, StringComparer.OrdinalIgnoreCase)
                : actors.OrderBy(actor => actor.LastScanAt, StringComparer.OrdinalIgnoreCase),
            "videocount" => descending
                ? actors.OrderByDescending(actor => actor.VideoCount)
                : actors.OrderBy(actor => actor.VideoCount),
            "webtype" => descending
                ? actors.OrderByDescending(actor => actor.WebType, StringComparer.OrdinalIgnoreCase)
                : actors.OrderBy(actor => actor.WebType, StringComparer.OrdinalIgnoreCase),
            _ => descending
                ? actors.OrderByDescending(actor => actor.Name, StringComparer.OrdinalIgnoreCase)
                : actors.OrderBy(actor => actor.Name, StringComparer.OrdinalIgnoreCase),
        };

        return ordered
            .ThenBy(actor => ParseActorSortId(actor.ActorId))
            .ThenBy(actor => actor.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static IReadOnlyList<ActorVideoListItemDto> SortVideos(IReadOnlyList<ActorVideoListItemDto> videos, string? sortBy, string? sortOrder)
    {
        var descending = !string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        Func<ActorVideoListItemDto, object?> keySelector = (sortBy ?? string.Empty).ToLowerInvariant() switch
        {
            "importtime" => video => video.FirstAddedAt,
            "firstaddedat" => video => video.FirstAddedAt,
            "title" => video => video.DisplayTitle,
            "vid" => video => video.Vid,
            "releasedate" => video => video.ReleaseDate,
            "lastplayedat" => video => video.LastPlayedAt,
            "viewcount" => video => video.ViewCount,
            _ => video => video.LastScanAt,
        };

        return descending
            ? videos.OrderByDescending(keySelector).ThenBy(video => video.VideoId, StringComparer.OrdinalIgnoreCase).ToList()
            : videos.OrderBy(keySelector).ThenBy(video => video.VideoId, StringComparer.OrdinalIgnoreCase).ToList();
    }

    private List<ActorListItemDto> LoadActors(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT actor_info.ActorID,
                   IFNULL(actor_info.ActorName, ''),
                   IFNULL(actor_info.ImageUrl, ''),
                   IFNULL(actor_info.WebType, ''),
                   IFNULL(actor_info.WebUrl, ''),
                   COUNT(DISTINCT metadata.DataID) AS VideoCount,
                   COUNT(DISTINCT metadata.DBId) AS LibraryCount,
                   MAX(IFNULL(metadata.ViewDate, '')) AS LastPlayedAt,
                   MAX(IFNULL(metadata.LastScanDate, '')) AS LastScanAt
            FROM actor_info
            INNER JOIN metadata_to_actor ON metadata_to_actor.ActorID = actor_info.ActorID
            INNER JOIN metadata ON metadata.DataID = metadata_to_actor.DataID
            WHERE metadata.DataType = 0
            GROUP BY actor_info.ActorID, actor_info.ActorName, actor_info.WebType, actor_info.WebUrl
            ORDER BY actor_info.ActorName COLLATE NOCASE ASC;
            """;

        var result = new List<ActorListItemDto>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var name = reader.GetString(1);
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            result.Add(new ActorListItemDto
            {
                ActorId = reader.GetInt64(0).ToString(),
                AvatarPath = ResolveActorAvatarPath(reader.GetInt64(0), name, reader.GetString(2), reader.GetString(4)),
                LibraryCount = reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6)),
                LastPlayedAt = NullIfWhiteSpace(reader.GetString(7)),
                LastScanAt = NullIfWhiteSpace(reader.GetString(8)),
                Name = name,
                VideoCount = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
                WebType = reader.GetString(3),
                WebUrl = reader.GetString(4),
            });
        }

        return result;
    }

    private List<ActorVideoListItemDto> LoadActorVideos(
        SqliteConnection connection,
        long actorId,
        IReadOnlyDictionary<string, LibraryListItemDto> libraries)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT metadata.DataID,
                   metadata.DBId,
                   IFNULL(metadata.Title, ''),
                   IFNULL(metadata.Path, ''),
                   IFNULL(metadata.ReleaseDate, ''),
                   IFNULL(NULLIF(metadata.FirstScanDate, ''), IFNULL(metadata.CreateDate, '')),
                   IFNULL(metadata.LastScanDate, ''),
                   IFNULL(metadata.ViewDate, ''),
                   IFNULL(metadata.ViewCount, 0),
                   IFNULL(metadata.Rating, 0),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.Duration, 0)
            FROM metadata_to_actor
            INNER JOIN metadata ON metadata.DataID = metadata_to_actor.DataID
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata_to_actor.ActorID = $actorId
              AND metadata.DataType = 0
            ORDER BY metadata.DataID DESC;
            """;
        command.Parameters.AddWithValue("$actorId", actorId);

        var result = new List<ActorVideoListItemDto>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var dataId = reader.GetInt64(0);
            var libraryId = reader.GetInt64(1).ToString();
            var path = reader.GetString(3);
            var vid = reader.GetString(10);
            var libraryName = libraries.TryGetValue(libraryId, out var library) ? library.Name : string.Empty;
            var sidecars = BuildSidecarState(path, vid, libraryName);
            result.Add(new ActorVideoListItemDto
            {
                DisplayTitle = BuildDisplayTitle(reader.GetString(2), vid, path),
                DurationSeconds = reader.IsDBNull(11) ? 0 : Convert.ToInt32(reader.GetValue(11)),
                FirstAddedAt = NullIfWhiteSpace(reader.GetString(5)),
                HasFanart = sidecars.Fanart.Exists,
                HasMissingAssets = sidecars.HasMissingAssets,
                HasNfo = sidecars.Nfo.Exists,
                HasPoster = sidecars.Poster.Exists,
                HasThumb = sidecars.Thumb.Exists,
                LibraryId = libraryId,
                LibraryName = libraryName,
                LastPlayedAt = NullIfWhiteSpace(reader.GetString(7)),
                LastScanAt = NullIfWhiteSpace(reader.GetString(6)),
                Path = path,
                Rating = reader.IsDBNull(9) ? 0d : Convert.ToDouble(reader.GetValue(9)),
                ReleaseDate = NullIfWhiteSpace(reader.GetString(4)),
                Title = reader.GetString(2),
                Vid = vid,
                VideoId = dataId.ToString(),
                ViewCount = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
            });
        }

        return result;
    }

    private ActorRecord? LoadActorRecord(SqliteConnection connection, string actorId)
    {
        if (!long.TryParse(actorId, out var parsedActorId) || parsedActorId <= 0)
        {
            return null;
        }

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT actor_info.ActorID,
                   IFNULL(actor_info.ActorName, ''),
                   IFNULL(actor_info.ImageUrl, ''),
                   IFNULL(actor_info.WebType, ''),
                   IFNULL(actor_info.WebUrl, ''),
                   COUNT(DISTINCT metadata.DataID) AS VideoCount,
                   COUNT(DISTINCT metadata.DBId) AS LibraryCount,
                   MAX(IFNULL(metadata.ViewDate, '')) AS LastPlayedAt,
                   MAX(IFNULL(metadata.LastScanDate, '')) AS LastScanAt
            FROM actor_info
            INNER JOIN metadata_to_actor ON metadata_to_actor.ActorID = actor_info.ActorID
            INNER JOIN metadata ON metadata.DataID = metadata_to_actor.DataID
            WHERE actor_info.ActorID = $actorId
              AND metadata.DataType = 0
            GROUP BY actor_info.ActorID, actor_info.ActorName, actor_info.WebType, actor_info.WebUrl
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$actorId", parsedActorId);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new ActorRecord(
            reader.GetInt64(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
            reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6)),
            reader.GetString(7),
            reader.GetString(8));
    }

    private List<(string LibraryId, string LibraryName)> LoadActorLibraries(SqliteConnection connection, long actorId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT DISTINCT metadata.DBId
            FROM metadata_to_actor
            INNER JOIN metadata ON metadata.DataID = metadata_to_actor.DataID
            WHERE metadata_to_actor.ActorID = $actorId
              AND metadata.DataType = 0
            ORDER BY metadata.DBId ASC;
            """;
        command.Parameters.AddWithValue("$actorId", actorId);

        var libraries = libraryService.GetLibraries().ToDictionary(item => item.LibraryId, StringComparer.OrdinalIgnoreCase);
        var result = new List<(string LibraryId, string LibraryName)>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var libraryId = reader.GetInt64(0).ToString();
            result.Add((libraryId, libraries.TryGetValue(libraryId, out var library) ? library.Name : string.Empty));
        }

        return result;
    }

    private SidecarStateDto BuildSidecarState(string videoPath, string vid, string? libraryName)
    {
        var normalizedVid = NormalizeSidecarPrefix(videoPath, vid);
        var sidecarDir = ResolveSidecarDirectory(videoPath, normalizedVid, libraryName);
        var nfoPath = Path.Combine(sidecarDir, $"{normalizedVid}.nfo");
        var posterPath = Path.Combine(sidecarDir, $"{normalizedVid}-poster.jpg");
        var thumbPath = Path.Combine(sidecarDir, $"{normalizedVid}-thumb.jpg");
        var fanartPath = Path.Combine(sidecarDir, $"{normalizedVid}-fanart.jpg");

        var state = new SidecarStateDto
        {
            Fanart = new VideoAssetStateDto
            {
                Exists = File.Exists(fanartPath),
                Path = fanartPath,
            },
            Nfo = new VideoAssetStateDto
            {
                Exists = File.Exists(nfoPath),
                Path = nfoPath,
            },
            Poster = new VideoAssetStateDto
            {
                Exists = File.Exists(posterPath),
                Path = posterPath,
            },
            Thumb = new VideoAssetStateDto
            {
                Exists = File.Exists(thumbPath),
                Path = thumbPath,
            },
        };
        state.HasMissingAssets = !state.Nfo.Exists || !state.Poster.Exists || !state.Thumb.Exists || !state.Fanart.Exists;
        return state;
    }

    private string ResolveSidecarDirectory(string videoPath, string normalizedVid, string? libraryName)
    {
        if (workerPathResolver.IsTestEnvironment && !string.IsNullOrWhiteSpace(libraryName))
        {
            return Path.Combine(workerPathResolver.VideoCacheFolder, SanitizeLibraryName(libraryName), normalizedVid);
        }

        return Path.GetDirectoryName(videoPath) ?? string.Empty;
    }

    private static string BuildDisplayTitle(string title, string vid, string path)
    {
        if (!string.IsNullOrWhiteSpace(title))
        {
            return title.Trim();
        }

        if (!string.IsNullOrWhiteSpace(vid))
        {
            return vid.Trim();
        }

        return Path.GetFileNameWithoutExtension(path);
    }

    private static bool ContainsIgnoreCase(string? value, string keyword)
    {
        return !string.IsNullOrWhiteSpace(value)
            && value.Contains(keyword, StringComparison.OrdinalIgnoreCase);
    }

    private static string? NullIfWhiteSpace(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string NormalizeSidecarPrefix(string videoPath, string vid)
    {
        var candidate = string.IsNullOrWhiteSpace(vid)
            ? Path.GetFileNameWithoutExtension(videoPath)
            : vid.Trim();

        foreach (var invalid in Path.GetInvalidFileNameChars())
        {
            candidate = candidate.Replace(invalid, '_');
        }

        return string.IsNullOrWhiteSpace(candidate) ? "video" : candidate;
    }

    private string? ResolveActorAvatarPath(long actorId, string actorName, string imageUrl, string webUrl)
    {
        if (!string.IsNullOrWhiteSpace(imageUrl))
        {
            var normalizedImageUrl = imageUrl.Trim();
            if (File.Exists(normalizedImageUrl))
            {
                return normalizedImageUrl;
            }
        }

        foreach (var cacheKey in GetActorAvatarCacheKeys(actorId, actorName, imageUrl, webUrl))
        {
            foreach (var extension in AvatarExtensions)
            {
                var cachedPath = Path.Combine(workerPathResolver.ActorAvatarCacheFolder, $"{cacheKey}{extension}");
                if (File.Exists(cachedPath))
                {
                    return cachedPath;
                }
            }
        }

        return null;
    }

    private IEnumerable<string> GetActorAvatarCacheKeys(long actorId, string actorName, string imageUrl, string webUrl)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var candidate in new[]
        {
            actorId.ToString(),
            TryExtractAvatarCacheKey(imageUrl),
            TryExtractAvatarCacheKey(webUrl),
            ComputeActorNameFallbackKey(actorName),
        })
        {
            if (!string.IsNullOrWhiteSpace(candidate) && seen.Add(candidate))
            {
                yield return candidate;
            }
        }
    }

    private static string? TryExtractAvatarCacheKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            var uriFileName = Path.GetFileNameWithoutExtension(uri.AbsolutePath);
            if (!string.IsNullOrWhiteSpace(uriFileName))
            {
                return uriFileName;
            }
        }

        var localFileName = Path.GetFileNameWithoutExtension(value.Trim());
        return string.IsNullOrWhiteSpace(localFileName) ? null : localFileName;
    }

    private static string SanitizeLibraryName(string value)
    {
        var result = value.Trim();
        foreach (var invalid in Path.GetInvalidFileNameChars())
        {
            result = result.Replace(invalid, '_');
        }

        return result;
    }

    private static string ComputeActorNameFallbackKey(string actorName)
    {
        var normalized = NormalizeActorAvatarKey(actorName);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "unknown_actor";
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(normalized);
        var hash = System.Security.Cryptography.SHA1.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string NormalizeActorAvatarKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var result = value.Trim();
        foreach (var invalid in Path.GetInvalidFileNameChars())
        {
            result = result.Replace(invalid, '_');
        }

        return result;
    }

    private static long ParseActorSortId(string? actorId)
    {
        return long.TryParse(actorId, out var parsed) ? parsed : 0L;
    }

    private static WorkerApiException CreateNotFoundException(string code, string message)
    {
        return new WorkerApiException(
            StatusCodes.Status404NotFound,
            new ApiErrorDto
            {
                Code = code,
                Message = message,
                Retryable = false,
                UserMessage = "演员不存在。",
            });
    }

    private readonly record struct ActorRecord(
        long ActorId,
        string Name,
        string ImageUrl,
        string WebType,
        string WebUrl,
        int VideoCount,
        int LibraryCount,
        string LastPlayedAt,
        string LastScanAt);
}
