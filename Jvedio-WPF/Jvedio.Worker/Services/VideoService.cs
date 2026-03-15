using System.Diagnostics;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;
using Jvedio.Contracts.Videos;

using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class VideoService
{
    private const string SettingsConfigName = "WindowConfig.Settings";
    private const int DefaultPageSize = 60;
    private const int MaxPageSize = 200;

    private readonly ConfigStoreService configStoreService;
    private readonly LibraryService libraryService;
    private readonly ILogger<VideoService> logger;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;

    public VideoService(
        ConfigStoreService configStoreService,
        LibraryService libraryService,
        ILogger<VideoService> logger,
        SqliteConnectionFactory sqliteConnectionFactory)
    {
        this.configStoreService = configStoreService;
        this.libraryService = libraryService;
        this.logger = logger;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
    }

    public GetLibraryVideosResponse GetLibraryVideos(string libraryId, GetLibraryVideosRequest request)
    {
        var library = libraryService.GetLibrary(libraryId) ?? throw CreateNotFoundException("library.video-query.not_found", $"Library {libraryId} was not found.");

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var videos = LoadLibraryVideos(connection, library.LibraryId);
        var keyword = request.Keyword?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            videos = videos
                .Where(video =>
                    ContainsIgnoreCase(video.Title, keyword)
                    || ContainsIgnoreCase(video.DisplayTitle, keyword)
                    || ContainsIgnoreCase(video.Vid, keyword)
                    || ContainsIgnoreCase(video.Path, keyword))
                .ToList();
        }

        if (request.MissingSidecarOnly)
        {
            videos = videos.Where(video => video.HasMissingAssets).ToList();
        }

        var sorted = SortVideos(videos, request.SortBy, request.SortOrder);
        var pageIndex = Math.Max(0, request.PageIndex);
        var pageSize = Math.Clamp(request.PageSize <= 0 ? DefaultPageSize : request.PageSize, 1, MaxPageSize);
        var paged = sorted
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .ToList();

        return new GetLibraryVideosResponse
        {
            Items = paged,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalCount = sorted.Count,
        };
    }

    public GetVideoDetailResponse GetVideoDetail(string videoId)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = LoadVideoDetailRecord(connection, videoId);
        if (record is null)
        {
            throw CreateNotFoundException("video.detail.not_found", $"Video {videoId} was not found.");
        }

        var library = libraryService.GetLibrary(record.Value.LibraryId.ToString());
        var sidecars = BuildSidecarState(record.Value.Path, record.Value.Vid);
        var video = new VideoDetailDto
        {
            Actors = LoadActors(connection, record.Value.DataId),
            Director = record.Value.Director,
            DisplayTitle = BuildDisplayTitle(record.Value.Title, record.Value.Vid, record.Value.Path),
            DurationSeconds = record.Value.DurationSeconds,
            LibraryId = record.Value.LibraryId.ToString(),
            LibraryName = library?.Name ?? string.Empty,
            LastPlayedAt = NullIfWhiteSpace(record.Value.LastPlayedAt),
            LastScanAt = NullIfWhiteSpace(record.Value.LastScanAt),
            Outline = record.Value.Outline,
            Path = record.Value.Path,
            Playback = BuildPlaybackAvailability(record.Value.Path),
            Plot = record.Value.Plot,
            ReleaseDate = NullIfWhiteSpace(record.Value.ReleaseDate),
            Rating = record.Value.Rating,
            Series = record.Value.Series,
            Sidecars = sidecars,
            Studio = record.Value.Studio,
            Title = record.Value.Title,
            Vid = record.Value.Vid,
            VideoId = record.Value.DataId.ToString(),
            ViewCount = record.Value.ViewCount,
            WebUrl = record.Value.WebUrl,
        };

        return new GetVideoDetailResponse
        {
            Video = video,
        };
    }

    public PlayVideoResponse PlayVideo(string videoId, PlayVideoRequest request)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = LoadVideoDetailRecord(connection, videoId);
        if (record is null)
        {
            throw CreateNotFoundException("video.play.not_found", $"Video {videoId} was not found.");
        }

        if (!File.Exists(record.Value.Path))
        {
            throw CreateException(
                StatusCodes.Status422UnprocessableEntity,
                "video.play.file_missing",
                $"Video file is missing: {record.Value.Path}",
                "影片文件不存在，无法播放。",
                new { videoId, path = record.Value.Path });
        }

        var configuredPlayerPath = ResolvePlayerPath();
        var launchedAtUtc = DateTimeOffset.UtcNow;
        var lastPlayedAt = DateTimeOffset.Now.ToString("yyyy-MM-dd HH:mm:ss");
        var usedSystemDefault = true;
        string? usedPlayerPath = null;

        try
        {
            if (!string.IsNullOrWhiteSpace(configuredPlayerPath) && File.Exists(configuredPlayerPath))
            {
                StartProcess(configuredPlayerPath, $"\"{record.Value.Path}\"", Path.GetDirectoryName(configuredPlayerPath));
                usedSystemDefault = false;
                usedPlayerPath = configuredPlayerPath;
            }
            else
            {
                StartProcess(record.Value.Path, null, Path.GetDirectoryName(record.Value.Path));
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Worker-Video] Failed to launch player for video {VideoId}", videoId);
            throw CreateException(
                StatusCodes.Status500InternalServerError,
                "video.play.launch_failed",
                $"Failed to launch player for video {videoId}.",
                "调用播放器失败，请检查播放器路径或系统默认播放器。",
                new
                {
                    playerPath = configuredPlayerPath,
                    videoId,
                },
                ex);
        }

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            UPDATE metadata
            SET ViewDate = $viewDate,
                UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
            WHERE DataID = $dataId;
            """;
        command.Parameters.AddWithValue("$dataId", record.Value.DataId);
        command.Parameters.AddWithValue("$viewDate", lastPlayedAt);
        command.ExecuteNonQuery();

        logger.LogInformation(
            "[Worker-Video] Launched player for video {VideoId} with player={PlayerPath}, systemDefault={SystemDefault}, profile={Profile}, resume={Resume}",
            videoId,
            usedPlayerPath ?? "<system-default>",
            usedSystemDefault,
            request.PlayerProfile,
            request.Resume);

        return new PlayVideoResponse
        {
            LaunchedAtUtc = launchedAtUtc,
            LastPlayedAt = lastPlayedAt,
            UsedPlayerPath = usedPlayerPath,
            UsedSystemDefault = usedSystemDefault,
            VideoId = videoId,
        };
    }

    private static IReadOnlyList<VideoListItemDto> SortVideos(IReadOnlyList<VideoListItemDto> videos, string? sortBy, string? sortOrder)
    {
        var descending = !string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        Func<VideoListItemDto, object?> keySelector = (sortBy ?? string.Empty).ToLowerInvariant() switch
        {
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

    private List<VideoListItemDto> LoadLibraryVideos(SqliteConnection connection, string libraryId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT metadata.DataID,
                   metadata.DBId,
                   IFNULL(metadata.Title, ''),
                   IFNULL(metadata.Path, ''),
                   IFNULL(metadata.ReleaseDate, ''),
                   IFNULL(metadata.LastScanDate, ''),
                   IFNULL(metadata.ViewDate, ''),
                   IFNULL(metadata.ViewCount, 0),
                   IFNULL(metadata.Rating, 0),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.Duration, 0)
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DBId = $libraryId
              AND metadata.DataType = 0
            ORDER BY metadata.DataID DESC;
            """;
        command.Parameters.AddWithValue("$libraryId", long.Parse(libraryId));

        var result = new List<VideoListItemDto>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var dataId = reader.GetInt64(0);
            var path = reader.GetString(3);
            var vid = reader.GetString(9);
            var sidecars = BuildSidecarState(path, vid);
            result.Add(new VideoListItemDto
            {
                DisplayTitle = BuildDisplayTitle(reader.GetString(2), vid, path),
                DurationSeconds = reader.IsDBNull(10) ? 0 : Convert.ToInt32(reader.GetValue(10)),
                HasFanart = sidecars.Fanart.Exists,
                HasMissingAssets = sidecars.HasMissingAssets,
                HasNfo = sidecars.Nfo.Exists,
                HasPoster = sidecars.Poster.Exists,
                HasThumb = sidecars.Thumb.Exists,
                LibraryId = reader.GetInt64(1).ToString(),
                LastPlayedAt = NullIfWhiteSpace(reader.GetString(6)),
                LastScanAt = NullIfWhiteSpace(reader.GetString(5)),
                Path = path,
                ReleaseDate = NullIfWhiteSpace(reader.GetString(4)),
                Rating = reader.IsDBNull(8) ? 0d : Convert.ToDouble(reader.GetValue(8)),
                Title = reader.GetString(2),
                Vid = vid,
                VideoId = dataId.ToString(),
                ViewCount = reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7)),
            });
        }

        return result;
    }

    private VideoDetailRecord? LoadVideoDetailRecord(SqliteConnection connection, string videoId)
    {
        if (!long.TryParse(videoId, out var parsedVideoId) || parsedVideoId <= 0)
        {
            return null;
        }

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT metadata.DataID,
                   metadata.DBId,
                   IFNULL(metadata.Title, ''),
                   IFNULL(metadata.Path, ''),
                   IFNULL(metadata.ReleaseDate, ''),
                   IFNULL(metadata.LastScanDate, ''),
                   IFNULL(metadata.ViewDate, ''),
                   IFNULL(metadata.ViewCount, 0),
                   IFNULL(metadata.Rating, 0),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.Duration, 0),
                   IFNULL(metadata_video.Series, ''),
                   IFNULL(metadata_video.Director, ''),
                   IFNULL(metadata_video.Studio, ''),
                   IFNULL(metadata_video.Plot, ''),
                   IFNULL(metadata_video.Outline, ''),
                   IFNULL(metadata_video.WebUrl, '')
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DataID = $videoId
              AND metadata.DataType = 0
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$videoId", parsedVideoId);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new VideoDetailRecord(
            reader.GetInt64(0),
            reader.GetInt64(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetString(5),
            reader.GetString(6),
            reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7)),
            reader.IsDBNull(8) ? 0d : Convert.ToDouble(reader.GetValue(8)),
            reader.GetString(9),
            reader.IsDBNull(10) ? 0 : Convert.ToInt32(reader.GetValue(10)),
            reader.GetString(11),
            reader.GetString(12),
            reader.GetString(13),
            reader.GetString(14),
            reader.GetString(15),
            reader.GetString(16));
    }

    private List<VideoActorDto> LoadActors(SqliteConnection connection, long dataId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT actor_info.ActorID,
                   IFNULL(actor_info.ActorName, '')
            FROM actor_info
            INNER JOIN metadata_to_actor ON metadata_to_actor.ActorID = actor_info.ActorID
            WHERE metadata_to_actor.DataID = $dataId
            ORDER BY actor_info.ActorName COLLATE NOCASE ASC;
            """;
        command.Parameters.AddWithValue("$dataId", dataId);

        var result = new List<VideoActorDto>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            result.Add(new VideoActorDto
            {
                ActorId = reader.GetInt64(0).ToString(),
                AvatarPath = null,
                Name = reader.GetString(1),
            });
        }

        return result;
    }

    private PlaybackAvailabilityDto BuildPlaybackAvailability(string videoPath)
    {
        var configuredPlayerPath = ResolvePlayerPath();
        var hasConfiguredPlayer = !string.IsNullOrWhiteSpace(configuredPlayerPath) && File.Exists(configuredPlayerPath);

        return new PlaybackAvailabilityDto
        {
            CanPlay = File.Exists(videoPath),
            PlayerPath = hasConfiguredPlayer ? configuredPlayerPath : null,
            UsesSystemDefault = !hasConfiguredPlayer,
        };
    }

    private string ResolvePlayerPath()
    {
        var overridePath = Environment.GetEnvironmentVariable("JVEDIO_VIDEO_PLAYER_PATH");
        if (!string.IsNullOrWhiteSpace(overridePath))
        {
            return overridePath.Trim();
        }

        var settings = configStoreService.LoadConfigObject(SettingsConfigName);
        return configStoreService.ReadString(settings, "VideoPlayerPath");
    }

    private static SidecarStateDto BuildSidecarState(string videoPath, string vid)
    {
        var normalizedVid = NormalizeSidecarPrefix(videoPath, vid);
        var nfoPath = BuildAssetPath(videoPath, normalizedVid, ".nfo");
        var posterPath = BuildAssetPath(videoPath, normalizedVid, "-poster.jpg");
        var thumbPath = BuildAssetPath(videoPath, normalizedVid, "-thumb.jpg");
        var fanartPath = BuildAssetPath(videoPath, normalizedVid, "-fanart.jpg");

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

    private static string BuildAssetPath(string videoPath, string prefix, string suffix)
    {
        var directoryPath = Path.GetDirectoryName(videoPath) ?? string.Empty;
        return Path.Combine(directoryPath, $"{prefix}{suffix}");
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

    private static string? NullIfWhiteSpace(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static bool ContainsIgnoreCase(string? value, string keyword)
    {
        return !string.IsNullOrWhiteSpace(value)
            && value.Contains(keyword, StringComparison.OrdinalIgnoreCase);
    }

    private static void StartProcess(string fileName, string? arguments, string? workingDirectory)
    {
        var startInfo = new ProcessStartInfo
        {
            Arguments = arguments ?? string.Empty,
            FileName = fileName,
            UseShellExecute = true,
            WorkingDirectory = string.IsNullOrWhiteSpace(workingDirectory) ? Environment.CurrentDirectory : workingDirectory,
        };

        _ = Process.Start(startInfo) ?? throw new InvalidOperationException($"Process start returned null: {fileName}");
    }

    private static WorkerApiException CreateNotFoundException(string code, string message)
    {
        return CreateException(
            StatusCodes.Status404NotFound,
            code,
            message,
            "影片不存在。");
    }

    private static WorkerApiException CreateException(
        int statusCode,
        string code,
        string message,
        string userMessage,
        object? details = null,
        Exception? exception = null)
    {
        var error = new ApiErrorDto
        {
            Code = code,
            Details = details,
            Message = message,
            Retryable = false,
            UserMessage = userMessage,
        };

        return exception is null
            ? new WorkerApiException(statusCode, error)
            : new WorkerApiException(statusCode, error, exception);
    }

    private readonly record struct VideoDetailRecord(
        long DataId,
        long LibraryId,
        string Title,
        string Path,
        string ReleaseDate,
        string LastScanAt,
        string LastPlayedAt,
        int ViewCount,
        double Rating,
        string Vid,
        int DurationSeconds,
        string Series,
        string Director,
        string Studio,
        string Plot,
        string Outline,
        string WebUrl);
}
