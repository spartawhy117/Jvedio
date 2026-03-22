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
    private readonly ActorService actorService;
    private readonly LibraryService libraryService;
    private readonly ILogger<VideoService> logger;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;
    private readonly WorkerPathResolver workerPathResolver;

    public VideoService(
        ConfigStoreService configStoreService,
        ActorService actorService,
        LibraryService libraryService,
        ILogger<VideoService> logger,
        SqliteConnectionFactory sqliteConnectionFactory,
        WorkerPathResolver workerPathResolver)
    {
        this.configStoreService = configStoreService;
        this.actorService = actorService;
        this.libraryService = libraryService;
        this.logger = logger;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
        this.workerPathResolver = workerPathResolver;
    }

    public GetLibraryVideosResponse GetLibraryVideos(string libraryId, GetLibraryVideosRequest request)
    {
        var library = libraryService.GetLibrary(libraryId) ?? throw CreateNotFoundException("library.video-query.not_found", $"Library {libraryId} was not found.");

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var videos = LoadLibraryVideos(connection, library.LibraryId, library.Name);
        var filtered = ApplyVideoFilters(videos, request.Keyword, request.MissingSidecarOnly, request.ScrapeStatus);
        var pagedResult = BuildPagedResult(filtered, request.SortBy, request.SortOrder, request.PageIndex, request.PageSize);

        return new GetLibraryVideosResponse
        {
            Items = pagedResult.Items,
            PageIndex = pagedResult.PageIndex,
            PageSize = pagedResult.PageSize,
            TotalCount = pagedResult.TotalCount,
        };
    }

    public GetFavoriteVideosResponse GetFavoriteVideos(GetFavoriteVideosRequest request)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var favorites = LoadFavoriteVideos(connection);
        var filtered = ApplyVideoFilters(favorites, request.Keyword, request.MissingSidecarOnly);
        var pagedResult = BuildPagedResult(filtered, request.SortBy, request.SortOrder, request.PageIndex, request.PageSize);

        return new GetFavoriteVideosResponse
        {
            Items = pagedResult.Items,
            PageIndex = pagedResult.PageIndex,
            PageSize = pagedResult.PageSize,
            TotalCount = pagedResult.TotalCount,
        };
    }

    public GetVideoGroupsResponse GetCategoryGroups()
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var groups = LoadVideoGroups(connection, static record => record.Genre);

        return new GetVideoGroupsResponse
        {
            Items = groups,
            TotalCount = groups.Count,
        };
    }

    public GetVideoGroupVideosResponse GetCategoryVideos(string categoryName, GetVideoGroupVideosRequest request)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var videos = LoadVideosByGroup(connection, static record => record.Genre, categoryName);
        var filtered = ApplyVideoFilters(videos, request.Keyword, request.MissingSidecarOnly);
        var pagedResult = BuildPagedResult(filtered, request.SortBy, request.SortOrder, request.PageIndex, request.PageSize);

        return new GetVideoGroupVideosResponse
        {
            Items = pagedResult.Items,
            PageIndex = pagedResult.PageIndex,
            PageSize = pagedResult.PageSize,
            TotalCount = pagedResult.TotalCount,
        };
    }

    public GetVideoGroupsResponse GetSeriesGroups()
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var groups = LoadVideoGroups(connection, static record => record.Series);

        return new GetVideoGroupsResponse
        {
            Items = groups,
            TotalCount = groups.Count,
        };
    }

    public GetVideoGroupVideosResponse GetSeriesVideos(string seriesName, GetVideoGroupVideosRequest request)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var videos = LoadVideosByGroup(connection, static record => record.Series, seriesName);
        var filtered = ApplyVideoFilters(videos, request.Keyword, request.MissingSidecarOnly);
        var pagedResult = BuildPagedResult(filtered, request.SortBy, request.SortOrder, request.PageIndex, request.PageSize);

        return new GetVideoGroupVideosResponse
        {
            Items = pagedResult.Items,
            PageIndex = pagedResult.PageIndex,
            PageSize = pagedResult.PageSize,
            TotalCount = pagedResult.TotalCount,
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
        var sidecars = BuildSidecarState(record.Value.Path, record.Value.Vid, library?.Name);
        var video = new VideoDetailDto
        {
            Actors = LoadActors(connection, record.Value.DataId),
            Director = record.Value.Director,
            DisplayTitle = BuildDisplayTitle(record.Value.Title, record.Value.Vid, record.Value.Path),
            DurationSeconds = record.Value.DurationSeconds,
            FirstAddedAt = NullIfWhiteSpace(record.Value.FirstAddedAt),
            IsFavorite = record.Value.FavoriteCount > 0,
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
            ScrapeStatus = record.Value.ScrapeStatus,
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

    public string GetPosterPath(string videoId)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = LoadVideoDetailRecord(connection, videoId);
        if (record is null)
        {
            throw CreateNotFoundException("video.poster.not_found", $"Video {videoId} was not found.");
        }

        var library = libraryService.GetLibrary(record.Value.LibraryId.ToString());
        var sidecars = BuildSidecarState(record.Value.Path, record.Value.Vid, library?.Name);
        if (!sidecars.Poster.Exists || string.IsNullOrWhiteSpace(sidecars.Poster.Path))
        {
            throw CreateNotFoundException("video.poster.not_found", $"Poster for video {videoId} was not found.");
        }

        return sidecars.Poster.Path;
    }

    public string GetThumbPath(string videoId)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = LoadVideoDetailRecord(connection, videoId);
        if (record is null)
        {
            throw CreateNotFoundException("video.thumb.not_found", $"Video {videoId} was not found.");
        }

        var library = libraryService.GetLibrary(record.Value.LibraryId.ToString());
        var sidecars = BuildSidecarState(record.Value.Path, record.Value.Vid, library?.Name);
        if (!sidecars.Thumb.Exists || string.IsNullOrWhiteSpace(sidecars.Thumb.Path))
        {
            throw CreateNotFoundException("video.thumb.not_found", $"Thumb for video {videoId} was not found.");
        }

        return sidecars.Thumb.Path;
    }

    public ToggleFavoriteResponse ToggleFavorite(string videoId)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = LoadVideoDetailRecord(connection, videoId);
        if (record is null)
        {
            throw CreateNotFoundException("video.favorite.not_found", $"Video {videoId} was not found.");
        }

        var currentFavoriteCount = record.Value.FavoriteCount;
        var newFavoriteCount = currentFavoriteCount > 0 ? 0 : 1;

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            UPDATE metadata
            SET FavoriteCount = $favoriteCount,
                UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
            WHERE DataID = $dataId;
            """;
        command.Parameters.AddWithValue("$dataId", record.Value.DataId);
        command.Parameters.AddWithValue("$favoriteCount", newFavoriteCount);
        command.ExecuteNonQuery();

        logger.LogInformation(
            "[Worker-Video] Toggled favorite for video {VideoId}: {OldCount} -> {NewCount}",
            videoId, currentFavoriteCount, newFavoriteCount);

        return new ToggleFavoriteResponse
        {
            VideoId = videoId,
            IsFavorite = newFavoriteCount > 0,
            FavoriteCount = newFavoriteCount,
        };
    }

    public DeleteVideoResponse DeleteVideo(string videoId, bool deleteFile)
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = LoadVideoDetailRecord(connection, videoId);
        if (record is null)
        {
            throw CreateNotFoundException("video.delete.not_found", $"Video {videoId} was not found.");
        }

        var libraryId = record.Value.LibraryId.ToString();

        var fileDeleted = false;
        if (deleteFile && File.Exists(record.Value.Path))
        {
            try
            {
                // Delete sidecar files first
                var vid = record.Value.Vid;
                var prefix = NormalizeSidecarPrefix(record.Value.Path, vid);
                var library = libraryService.GetLibrary(record.Value.LibraryId.ToString());
                var sidecarDir = ResolveSidecarDirectory(record.Value.Path, prefix, library?.Name);
                foreach (var suffix in new[] { ".nfo", "-poster.jpg", "-thumb.jpg", "-fanart.jpg" })
                {
                    var sidecarPath = Path.Combine(sidecarDir, $"{prefix}{suffix}");
                    if (File.Exists(sidecarPath)) File.Delete(sidecarPath);
                }

                File.Delete(record.Value.Path);
                TryDeleteEmptySidecarDirectory(sidecarDir, library);
                TryDeleteEmptyVideoDirectory(Path.GetDirectoryName(record.Value.Path), library);
                fileDeleted = true;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[Worker-Video] Failed to delete file for video {VideoId}: {Path}", videoId, record.Value.Path);
            }
        }

        // Delete from DB
        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = "DELETE FROM metadata_to_actor WHERE DataID = $dataId;";
            cmd.Parameters.AddWithValue("$dataId", record.Value.DataId);
            cmd.ExecuteNonQuery();
        }

        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = "DELETE FROM metadata_video WHERE DataID = $dataId;";
            cmd.Parameters.AddWithValue("$dataId", record.Value.DataId);
            cmd.ExecuteNonQuery();
        }

        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = "DELETE FROM metadata WHERE DataID = $dataId;";
            cmd.Parameters.AddWithValue("$dataId", record.Value.DataId);
            cmd.ExecuteNonQuery();
        }

        logger.LogInformation(
            "[Worker-Video] Deleted video {VideoId}, fileDeleted={FileDeleted}",
            videoId, fileDeleted);

        libraryService.RefreshLibraryState(libraryId, "updated");

        return new DeleteVideoResponse
        {
            VideoId = videoId,
            Deleted = true,
            FileDeleted = fileDeleted,
        };
    }

    public BatchOperationResponse BatchFavorite(BatchOperationRequest request, bool favorite)
    {
        var successCount = 0;
        var failedIds = new List<string>();

        foreach (var videoId in request.VideoIds)
        {
            try
            {
                using var connection = sqliteConnectionFactory.OpenAppDataConnection();
                if (!long.TryParse(videoId, out var dataId) || dataId <= 0)
                {
                    failedIds.Add(videoId);
                    continue;
                }

                using var command = connection.CreateCommand();
                command.CommandText =
                    """
                    UPDATE metadata
                    SET FavoriteCount = $favoriteCount,
                        UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
                    WHERE DataID = $dataId;
                    """;
                command.Parameters.AddWithValue("$dataId", dataId);
                command.Parameters.AddWithValue("$favoriteCount", favorite ? 1 : 0);
                var affected = command.ExecuteNonQuery();
                if (affected > 0) successCount++;
                else failedIds.Add(videoId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[Worker-Video] BatchFavorite failed for video {VideoId}", videoId);
                failedIds.Add(videoId);
            }
        }

        logger.LogInformation(
            "[Worker-Video] BatchFavorite: {SuccessCount} success, {FailedCount} failed, favorite={Favorite}",
            successCount, failedIds.Count, favorite);

        return new BatchOperationResponse
        {
            SuccessCount = successCount,
            FailedCount = failedIds.Count,
            FailedVideoIds = failedIds,
        };
    }

    public BatchOperationResponse BatchDelete(BatchOperationRequest request, bool deleteFiles)
    {
        var successCount = 0;
        var failedIds = new List<string>();

        foreach (var videoId in request.VideoIds)
        {
            try
            {
                DeleteVideo(videoId, deleteFiles);
                successCount++;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[Worker-Video] BatchDelete failed for video {VideoId}", videoId);
                failedIds.Add(videoId);
            }
        }

        logger.LogInformation(
            "[Worker-Video] BatchDelete: {SuccessCount} success, {FailedCount} failed, deleteFiles={DeleteFiles}",
            successCount, failedIds.Count, deleteFiles);

        return new BatchOperationResponse
        {
            SuccessCount = successCount,
            FailedCount = failedIds.Count,
            FailedVideoIds = failedIds,
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
        var useSystemDefaultFallback = ResolveUseSystemDefaultFallback();
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
            else if (!useSystemDefaultFallback)
            {
                throw CreateException(
                    StatusCodes.Status422UnprocessableEntity,
                    "video.play.player_missing",
                    $"Video player path is empty and system fallback is disabled for video {videoId}.",
                    "未配置自定义播放器，且已关闭系统默认播放器回退。",
                    new { videoId });
            }
            else
            {
                StartProcess(record.Value.Path, null, Path.GetDirectoryName(record.Value.Path));
            }
        }
        catch (WorkerApiException)
        {
            throw;
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

    private List<VideoListItemDto> LoadLibraryVideos(SqliteConnection connection, string libraryId, string? libraryName = null)
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
                   IFNULL(metadata.FavoriteCount, 0),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.Duration, 0),
                   IFNULL(metadata_video.ScrapeStatus, 'none')
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
            var favoriteCount = reader.IsDBNull(10) ? 0 : Convert.ToInt32(reader.GetValue(10));
            var vid = reader.GetString(11);
            var scrapeStatus = reader.GetString(13);
            var sidecars = BuildSidecarState(path, vid, libraryName);
            result.Add(new VideoListItemDto
            {
                DisplayTitle = BuildDisplayTitle(reader.GetString(2), vid, path),
                DurationSeconds = reader.IsDBNull(12) ? 0 : Convert.ToInt32(reader.GetValue(12)),
                FirstAddedAt = NullIfWhiteSpace(reader.GetString(5)),
                HasFanart = sidecars.Fanart.Exists,
                HasMissingAssets = sidecars.HasMissingAssets,
                HasNfo = sidecars.Nfo.Exists,
                HasPoster = sidecars.Poster.Exists,
                HasThumb = sidecars.Thumb.Exists,
                IsFavorite = favoriteCount > 0,
                LibraryId = reader.GetInt64(1).ToString(),
                LastPlayedAt = NullIfWhiteSpace(reader.GetString(7)),
                LastScanAt = NullIfWhiteSpace(reader.GetString(6)),
                Path = path,
                ReleaseDate = NullIfWhiteSpace(reader.GetString(4)),
                Rating = reader.IsDBNull(9) ? 0d : Convert.ToDouble(reader.GetValue(9)),
                ScrapeStatus = scrapeStatus,
                Title = reader.GetString(2),
                Vid = vid,
                VideoId = dataId.ToString(),
                ViewCount = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
            });
        }

        return result;
    }

    private List<VideoListItemDto> LoadFavoriteVideos(SqliteConnection connection)
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
                   IFNULL(metadata.FavoriteCount, 0),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.Duration, 0),
                   IFNULL(metadata_video.ScrapeStatus, 'none')
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DataType = 0
              AND IFNULL(metadata.FavoriteCount, 0) > 0
            ORDER BY metadata.FavoriteCount DESC, metadata.ViewDate DESC, metadata.DataID DESC;
            """;

        var result = new List<VideoListItemDto>();
        var libraryNameCache = new Dictionary<string, string?>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var dataId = reader.GetInt64(0);
            var libId = reader.GetInt64(1).ToString();
            var path = reader.GetString(3);
            var vid = reader.GetString(11);
            var scrapeStatus = reader.GetString(13);
            if (!libraryNameCache.TryGetValue(libId, out var libName))
            {
                libName = libraryService.GetLibrary(libId)?.Name;
                libraryNameCache[libId] = libName;
            }

            var sidecars = BuildSidecarState(path, vid, libName);
            result.Add(new VideoListItemDto
            {
                DisplayTitle = BuildDisplayTitle(reader.GetString(2), vid, path),
                DurationSeconds = reader.IsDBNull(12) ? 0 : Convert.ToInt32(reader.GetValue(12)),
                FirstAddedAt = NullIfWhiteSpace(reader.GetString(5)),
                HasFanart = sidecars.Fanart.Exists,
                HasMissingAssets = sidecars.HasMissingAssets,
                HasNfo = sidecars.Nfo.Exists,
                HasPoster = sidecars.Poster.Exists,
                HasThumb = sidecars.Thumb.Exists,
                LibraryId = libId,
                LastPlayedAt = NullIfWhiteSpace(reader.GetString(7)),
                LastScanAt = NullIfWhiteSpace(reader.GetString(6)),
                Path = path,
                ReleaseDate = NullIfWhiteSpace(reader.GetString(4)),
                Rating = reader.IsDBNull(9) ? 0d : Convert.ToDouble(reader.GetValue(9)),
                ScrapeStatus = scrapeStatus,
                Title = reader.GetString(2),
                Vid = vid,
                VideoId = dataId.ToString(),
                ViewCount = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
            });
        }

        return result;
    }

    private List<VideoGroupListItemDto> LoadVideoGroups(
        SqliteConnection connection,
        Func<VideoGroupRecord, string> selector)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT IFNULL(metadata.Genre, ''),
                   IFNULL(metadata_video.Series, ''),
                   IFNULL(metadata.ViewDate, ''),
                   IFNULL(metadata.LastScanDate, '')
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DataType = 0;
            """;

        var groups = new Dictionary<string, VideoGroupAccumulator>(StringComparer.OrdinalIgnoreCase);
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var record = new VideoGroupRecord(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3));

            foreach (var item in SplitGroupValues(selector(record)))
            {
                if (!groups.TryGetValue(item, out var accumulator))
                {
                    accumulator = new VideoGroupAccumulator(item);
                    groups[item] = accumulator;
                }

                accumulator.VideoCount += 1;
                if (string.CompareOrdinal(record.LastPlayedAt, accumulator.LastPlayedAt) > 0)
                {
                    accumulator.LastPlayedAt = record.LastPlayedAt;
                }
                if (string.CompareOrdinal(record.LastScanAt, accumulator.LastScanAt) > 0)
                {
                    accumulator.LastScanAt = record.LastScanAt;
                }
            }
        }

        return groups.Values
            .OrderByDescending(group => group.VideoCount)
            .ThenBy(group => group.Name, StringComparer.OrdinalIgnoreCase)
            .Select(group => new VideoGroupListItemDto
            {
                LastPlayedAt = group.LastPlayedAt,
                LastScanAt = group.LastScanAt,
                Name = group.Name,
                VideoCount = group.VideoCount,
            })
            .ToList();
    }

    private List<VideoListItemDto> LoadVideosByGroup(
        SqliteConnection connection,
        Func<VideoGroupRecord, string> selector,
        string groupName)
    {
        var normalizedGroupName = groupName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedGroupName))
        {
            return new List<VideoListItemDto>();
        }

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
                   IFNULL(metadata.Genre, ''),
                   IFNULL(metadata_video.VID, ''),
                   IFNULL(metadata_video.Duration, 0),
                   IFNULL(metadata_video.Series, ''),
                   IFNULL(metadata_video.ScrapeStatus, 'none')
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DataType = 0
            ORDER BY metadata.DataID DESC;
            """;

        var result = new List<VideoListItemDto>();
        var libraryNameCache = new Dictionary<string, string?>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var record = new VideoGroupRecord(
                reader.GetString(10),
                reader.GetString(13),
                reader.GetString(7),
                reader.GetString(6));

            if (!SplitGroupValues(selector(record)).Any(item => string.Equals(item, normalizedGroupName, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            var dataId = reader.GetInt64(0);
            var libId = reader.GetInt64(1).ToString();
            var path = reader.GetString(3);
            var vid = reader.GetString(11);
            var scrapeStatus = reader.GetString(14);
            if (!libraryNameCache.TryGetValue(libId, out var libName))
            {
                libName = libraryService.GetLibrary(libId)?.Name;
                libraryNameCache[libId] = libName;
            }

            var sidecars = BuildSidecarState(path, vid, libName);
            result.Add(new VideoListItemDto
            {
                DisplayTitle = BuildDisplayTitle(reader.GetString(2), vid, path),
                DurationSeconds = reader.IsDBNull(12) ? 0 : Convert.ToInt32(reader.GetValue(12)),
                FirstAddedAt = NullIfWhiteSpace(reader.GetString(5)),
                HasFanart = sidecars.Fanart.Exists,
                HasMissingAssets = sidecars.HasMissingAssets,
                HasNfo = sidecars.Nfo.Exists,
                HasPoster = sidecars.Poster.Exists,
                HasThumb = sidecars.Thumb.Exists,
                LibraryId = libId,
                LastPlayedAt = NullIfWhiteSpace(reader.GetString(7)),
                LastScanAt = NullIfWhiteSpace(reader.GetString(6)),
                Path = path,
                ReleaseDate = NullIfWhiteSpace(reader.GetString(4)),
                Rating = reader.IsDBNull(9) ? 0d : Convert.ToDouble(reader.GetValue(9)),
                ScrapeStatus = scrapeStatus,
                Title = reader.GetString(2),
                Vid = vid,
                VideoId = dataId.ToString(),
                ViewCount = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
            });
        }

        return result;
    }

    private static List<VideoListItemDto> ApplyVideoFilters(
        IEnumerable<VideoListItemDto> videos,
        string? keyword,
        bool missingSidecarOnly,
        string? scrapeStatus = null)
    {
        var result = videos.ToList();
        var normalizedKeyword = keyword?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(normalizedKeyword))
        {
            result = result
                .Where(video =>
                    ContainsIgnoreCase(video.Title, normalizedKeyword)
                    || ContainsIgnoreCase(video.DisplayTitle, normalizedKeyword)
                    || ContainsIgnoreCase(video.Vid, normalizedKeyword)
                    || ContainsIgnoreCase(video.Path, normalizedKeyword))
                .ToList();
        }

        if (missingSidecarOnly)
        {
            result = result.Where(video => video.HasMissingAssets).ToList();
        }

        if (!string.IsNullOrWhiteSpace(scrapeStatus))
        {
            result = result.Where(video => string.Equals(video.ScrapeStatus, scrapeStatus, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return result;
    }

    private static IEnumerable<string> SplitGroupValues(string? value)
    {
        return (value ?? string.Empty)
            .Split(new[] { ';', '|', ',', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(item => item.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase);
    }

    private static PagedVideoResult BuildPagedResult(
        IReadOnlyList<VideoListItemDto> videos,
        string? sortBy,
        string? sortOrder,
        int pageIndex,
        int pageSize)
    {
        var sorted = SortVideos(videos, sortBy, sortOrder);
        var normalizedPageIndex = Math.Max(0, pageIndex);
        var normalizedPageSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
        var paged = sorted
            .Skip(normalizedPageIndex * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToList();

        return new PagedVideoResult(paged, normalizedPageIndex, normalizedPageSize, sorted.Count);
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
                   IFNULL(NULLIF(metadata.FirstScanDate, ''), IFNULL(metadata.CreateDate, '')),
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
                   IFNULL(metadata_video.WebUrl, ''),
                   IFNULL(metadata.FavoriteCount, 0),
                   IFNULL(metadata_video.ScrapeStatus, 'none')
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
            reader.GetString(7),
            reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
            reader.IsDBNull(9) ? 0d : Convert.ToDouble(reader.GetValue(9)),
            reader.GetString(10),
            reader.IsDBNull(11) ? 0 : Convert.ToInt32(reader.GetValue(11)),
            reader.GetString(12),
            reader.GetString(13),
            reader.GetString(14),
            reader.GetString(15),
            reader.GetString(16),
            reader.GetString(17),
            reader.IsDBNull(18) ? 0 : Convert.ToInt32(reader.GetValue(18)),
            reader.GetString(19));
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
            var actorId = reader.GetInt64(0).ToString();
            result.Add(new VideoActorDto
            {
                ActorId = actorId,
                AvatarPath = actorService.TryGetActorAvatarPath(actorId),
                Name = reader.GetString(1),
            });
        }

        return result;
    }

    private PlaybackAvailabilityDto BuildPlaybackAvailability(string videoPath)
    {
        var configuredPlayerPath = ResolvePlayerPath();
        var hasConfiguredPlayer = !string.IsNullOrWhiteSpace(configuredPlayerPath) && File.Exists(configuredPlayerPath);
        var useSystemDefaultFallback = ResolveUseSystemDefaultFallback();

        return new PlaybackAvailabilityDto
        {
            CanPlay = File.Exists(videoPath) && (hasConfiguredPlayer || useSystemDefaultFallback),
            PlayerPath = hasConfiguredPlayer ? configuredPlayerPath : null,
            UsesSystemDefault = !hasConfiguredPlayer && useSystemDefaultFallback,
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

    private bool ResolveUseSystemDefaultFallback()
    {
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("JVEDIO_VIDEO_PLAYER_PATH")))
        {
            return true;
        }

        var settings = configStoreService.LoadConfigObject(SettingsConfigName);
        return configStoreService.ReadBoolean(settings, "UseSystemDefaultFallback", true);
    }

    private SidecarStateDto BuildSidecarState(string videoPath, string vid, string? libraryName = null)
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

    private static string BuildAssetPath(string videoPath, string prefix, string suffix)
    {
        var directoryPath = Path.GetDirectoryName(videoPath) ?? string.Empty;
        return Path.Combine(directoryPath, $"{prefix}{suffix}");
    }

    /// <summary>
    /// Resolves the sidecar directory for a video.
    /// In test environment (JVEDIO_APP_BASE_DIR set): cache/video/{libraryName}/{vid}/
    /// In production: same directory as the video file.
    /// </summary>
    private string ResolveSidecarDirectory(string videoPath, string normalizedVid, string? libraryName)
    {
        if (workerPathResolver.IsTestEnvironment && !string.IsNullOrWhiteSpace(libraryName))
        {
            var sanitizedLibName = SanitizeLibraryName(libraryName);
            return Path.Combine(workerPathResolver.VideoCacheFolder, sanitizedLibName, normalizedVid);
        }

        return Path.GetDirectoryName(videoPath) ?? string.Empty;
    }

    private void TryDeleteEmptySidecarDirectory(string? directoryPath, LibraryListItemDto? library)
    {
        if (string.IsNullOrWhiteSpace(directoryPath))
        {
            return;
        }

        if (!workerPathResolver.IsTestEnvironment)
        {
            return;
        }

        TryDeleteDirectoryIfEmpty(directoryPath, library);
    }

    private void TryDeleteEmptyVideoDirectory(string? directoryPath, LibraryListItemDto? library)
    {
        if (string.IsNullOrWhiteSpace(directoryPath))
        {
            return;
        }

        TryDeleteDirectoryIfEmpty(directoryPath, library);
    }

    private void TryDeleteDirectoryIfEmpty(string directoryPath, LibraryListItemDto? library)
    {
        if (!Directory.Exists(directoryPath))
        {
            return;
        }

        try
        {
            if (!IsSafeToDeleteDirectory(directoryPath, library))
            {
                return;
            }

            if (Directory.EnumerateFileSystemEntries(directoryPath).Any())
            {
                return;
            }

            Directory.Delete(directoryPath, false);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "[Worker-Video] Skip empty directory cleanup for {DirectoryPath}", directoryPath);
        }
    }

    private static bool IsSafeToDeleteDirectory(string directoryPath, LibraryListItemDto? library)
    {
        var normalizedDirectoryPath = NormalizeDirectoryPath(directoryPath);
        if (string.IsNullOrWhiteSpace(normalizedDirectoryPath))
        {
            return false;
        }

        var rootPath = NormalizeDirectoryPath(Path.GetPathRoot(normalizedDirectoryPath));
        if (string.Equals(normalizedDirectoryPath, rootPath, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (library is null)
        {
            return true;
        }

        var protectedPaths = library.ScanPaths
            .Append(library.Path)
            .Select(NormalizeDirectoryPath)
            .Where(path => !string.IsNullOrWhiteSpace(path));

        return protectedPaths.All(path => !string.Equals(path, normalizedDirectoryPath, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeDirectoryPath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return string.Empty;
        }

        return Path.GetFullPath(path)
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }

    private static string SanitizeLibraryName(string value)
    {
        var result = value.Trim();
        foreach (var item in Path.GetInvalidFileNameChars())
        {
            result = result.Replace(item, '_');
        }

        return result;
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
        string FirstAddedAt,
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
        string WebUrl,
        int FavoriteCount,
        string ScrapeStatus);

    private readonly record struct PagedVideoResult(
        IReadOnlyList<VideoListItemDto> Items,
        int PageIndex,
        int PageSize,
        int TotalCount);

    private sealed class VideoGroupAccumulator
    {
        public VideoGroupAccumulator(string name)
        {
            Name = name;
        }

        public string LastPlayedAt { get; set; } = string.Empty;

        public string LastScanAt { get; set; } = string.Empty;

        public string Name { get; }

        public int VideoCount { get; set; }
    }

    private readonly record struct VideoGroupRecord(
        string Genre,
        string Series,
        string LastPlayedAt,
        string LastScanAt);
}
