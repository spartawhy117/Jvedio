using System.Text.Json;
using System.Text.Json.Nodes;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;

using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class LibraryService
{
    private const string MainConfigName = "WindowConfig.Main";
    private const string SettingsConfigName = "WindowConfig.Settings";
    private const long VideoDataType = 0;

    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly IReadOnlyDictionary<long, string> MetadataTablesByDataType = new Dictionary<long, string>
    {
        [0] = "metadata_video",
        [1] = "metadata_picture",
        [2] = "metadata_game",
        [3] = "metadata_comic",
    };

    private readonly ConfigStoreService configStoreService;
    private readonly ILogger<LibraryService> logger;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;
    private readonly TaskSummarySnapshotService taskSummarySnapshotService;
    private readonly WorkerTaskRegistryService workerTaskRegistryService;
    private readonly WorkerEventStreamBroker workerEventStreamBroker;

    public LibraryService(
        ConfigStoreService configStoreService,
        ILogger<LibraryService> logger,
        SqliteConnectionFactory sqliteConnectionFactory,
        TaskSummarySnapshotService taskSummarySnapshotService,
        WorkerTaskRegistryService workerTaskRegistryService,
        WorkerEventStreamBroker workerEventStreamBroker)
    {
        this.configStoreService = configStoreService;
        this.logger = logger;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
        this.taskSummarySnapshotService = taskSummarySnapshotService;
        this.workerTaskRegistryService = workerTaskRegistryService;
        this.workerEventStreamBroker = workerEventStreamBroker;
    }

    public IReadOnlyList<LibraryListItemDto> GetLibraries()
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT DBId, Name, Count, IFNULL(ScanPath, ''), IFNULL(Hide, 0), IFNULL(ExtraInfo, '')
            FROM app_databases
            WHERE DataType = $dataType
              AND IFNULL(Name, '') <> ''
              AND IFNULL(Hide, 0) = 0
            ORDER BY DBId ASC;
            """;
        command.Parameters.AddWithValue("$dataType", VideoDataType);

        using var reader = command.ExecuteReader();
        var libraries = new List<LibraryListItemDto>();
        while (reader.Read())
        {
            var scanPaths = ParseScanPaths(reader.GetString(3));
            var extraInfo = ParseObject(reader.GetString(5));
            var libraryId = reader.GetInt64(0).ToString();
            var videoCount = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2));
            var syncedVideoCount = GetLibrarySyncedVideoCount(connection, long.Parse(libraryId));
            libraries.Add(new LibraryListItemDto
            {
                LibraryId = libraryId,
                Name = reader.GetString(1),
                Path = scanPaths.FirstOrDefault() ?? string.Empty,
                ScanPaths = scanPaths,
                VideoCount = videoCount,
                SyncedVideoCount = syncedVideoCount,
                CompletionPercent = CalculateCompletionPercent(videoCount, syncedVideoCount),
                IsFullySynced = videoCount > 0 && syncedVideoCount >= videoCount,
                LastScanAt = ReadString(extraInfo, "lastScanAt"),
                LastScrapeAt = ReadString(extraInfo, "lastScrapeAt"),
                HasRunningTask = workerTaskRegistryService.HasRunningTask(libraryId),
            });
        }

        return libraries;
    }

    public LibraryListItemDto CreateLibrary(CreateLibraryRequest request)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
        {
            throw CreateException(
                StatusCodes.Status422UnprocessableEntity,
                "library.create.invalid_name",
                "Library name is required.",
                "请输入媒体库名称。");
        }

        var scanPaths = NormalizeScanPaths(request);

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        EnsureLibraryNameNotExists(connection, name);

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            INSERT INTO app_databases (Name, Count, DataType, ViewCount, Hide, ScanPath, ExtraInfo, UpdateDate)
            VALUES ($name, 0, $dataType, 0, 0, $scanPath, '', STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime'));
            SELECT last_insert_rowid();
            """;
        command.Parameters.AddWithValue("$name", name);
        command.Parameters.AddWithValue("$dataType", VideoDataType);
        command.Parameters.AddWithValue("$scanPath", SerializeScanPaths(scanPaths));

        var insertedId = Convert.ToInt64(command.ExecuteScalar());
        EnsureDefaultLibrarySelection(insertedId);

        logger.LogInformation("[Worker-HomeMvp] Created library {LibraryId} {LibraryName}", insertedId, name);
        var createdLibrary = new LibraryListItemDto
        {
            LibraryId = insertedId.ToString(),
            Name = name,
            Path = scanPaths.FirstOrDefault() ?? string.Empty,
            ScanPaths = scanPaths,
            VideoCount = 0,
            SyncedVideoCount = 0,
            CompletionPercent = 0,
            IsFullySynced = false,
            LastScanAt = null,
            LastScrapeAt = null,
            HasRunningTask = workerTaskRegistryService.HasRunningTask(insertedId.ToString()),
        };
        PublishLibraryChanged("created", createdLibrary);
        return createdLibrary;
    }

    public LibraryListItemDto? GetLibrary(string libraryId)
    {
        if (!long.TryParse(libraryId, out var parsedId) || parsedId <= 0)
        {
            return null;
        }

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var record = GetLibraryRecord(connection, parsedId);
        if (record is null)
        {
            return null;
        }

        return ToLibraryListItem(record.Value);
    }

    public LibraryListItemDto UpdateLibrary(string libraryId, UpdateLibraryRequest request)
    {
        if (!long.TryParse(libraryId, out var parsedId) || parsedId <= 0)
        {
            throw CreateException(
                StatusCodes.Status404NotFound,
                "library.update.not_found",
                $"Library {libraryId} was not found.",
                "媒体库不存在。");
        }

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var existingLibrary = GetLibraryRecord(connection, parsedId);
        if (existingLibrary is null)
        {
            throw CreateException(
                StatusCodes.Status404NotFound,
                "library.update.not_found",
                $"Library {libraryId} was not found.",
                "媒体库不存在。");
        }

        var nextName = string.IsNullOrWhiteSpace(request.Name) ? existingLibrary.Value.Name : request.Name.Trim();
        var nextScanPaths = NormalizeScanPaths(new CreateLibraryRequest
        {
            Name = nextName,
            ScanPaths = request.ScanPaths,
        });

        if (!string.Equals(existingLibrary.Value.Name, nextName, StringComparison.OrdinalIgnoreCase))
        {
            EnsureLibraryNameNotExists(connection, nextName);
        }

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            UPDATE app_databases
            SET Name = $name,
                ScanPath = $scanPath,
                UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
            WHERE DBId = $libraryId;
            """;
        command.Parameters.AddWithValue("$libraryId", parsedId);
        command.Parameters.AddWithValue("$name", nextName);
        command.Parameters.AddWithValue("$scanPath", SerializeScanPaths(nextScanPaths));
        command.ExecuteNonQuery();

        var updated = new LibraryListItemDto
        {
            LibraryId = parsedId.ToString(),
            Name = nextName,
            Path = nextScanPaths.FirstOrDefault() ?? string.Empty,
            ScanPaths = nextScanPaths,
            VideoCount = existingLibrary.Value.VideoCount,
            SyncedVideoCount = existingLibrary.Value.SyncedVideoCount,
            CompletionPercent = CalculateCompletionPercent(existingLibrary.Value.VideoCount, existingLibrary.Value.SyncedVideoCount),
            IsFullySynced = existingLibrary.Value.VideoCount > 0 && existingLibrary.Value.SyncedVideoCount >= existingLibrary.Value.VideoCount,
            LastScanAt = existingLibrary.Value.LastScanAt,
            LastScrapeAt = existingLibrary.Value.LastScrapeAt,
            HasRunningTask = workerTaskRegistryService.HasRunningTask(parsedId.ToString()),
        };

        PublishLibraryChanged("updated", updated);
        return updated;
    }

    public void DeleteLibrary(string libraryId)
    {
        if (!long.TryParse(libraryId, out var parsedId) || parsedId <= 0)
        {
            throw CreateException(
                StatusCodes.Status404NotFound,
                "library.delete.not_found",
                $"Library {libraryId} was not found.",
                "媒体库不存在。");
        }

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var library = GetLibraryRecord(connection, parsedId);
        if (library is null)
        {
            throw CreateException(
                StatusCodes.Status404NotFound,
                "library.delete.not_found",
                $"Library {libraryId} was not found.",
                "媒体库不存在。");
        }

        using var transaction = connection.BeginTransaction();
        try
        {
            DeleteLibraryRows(connection, transaction, library.Value.Id, library.Value.DataType);
            DeleteLibraryRecord(connection, transaction, library.Value.Id);
            transaction.Commit();
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            throw CreateException(
                StatusCodes.Status500InternalServerError,
                "library.delete.failed",
                $"Failed to delete library {libraryId}.",
                "删除媒体库失败，请查看日志。",
                new { libraryId },
                ex);
        }

        ReassignDefaultLibrarySelection(parsedId);
        logger.LogInformation("[Worker-HomeMvp] Deleted library {LibraryId} {LibraryName}", parsedId, library.Value.Name);
        PublishLibraryChanged(
            "deleted",
            new LibraryListItemDto
            {
                LibraryId = parsedId.ToString(),
                Name = library.Value.Name,
                Path = library.Value.Path,
                ScanPaths = library.Value.ScanPaths,
                VideoCount = library.Value.VideoCount,
                SyncedVideoCount = library.Value.SyncedVideoCount,
                CompletionPercent = CalculateCompletionPercent(library.Value.VideoCount, library.Value.SyncedVideoCount),
                IsFullySynced = library.Value.VideoCount > 0 && library.Value.SyncedVideoCount >= library.Value.VideoCount,
                LastScanAt = library.Value.LastScanAt,
                LastScrapeAt = library.Value.LastScrapeAt,
                HasRunningTask = workerTaskRegistryService.HasRunningTask(parsedId.ToString()),
            });
    }

    public LibraryListItemDto RefreshLibraryState(string libraryId, string action, DateTimeOffset? lastScanAtUtc = null, DateTimeOffset? lastScrapeAtUtc = null)
    {
        if (!long.TryParse(libraryId, out var parsedId) || parsedId <= 0)
        {
            throw CreateException(
                StatusCodes.Status404NotFound,
                "library.refresh.not_found",
                $"Library {libraryId} was not found.",
                "媒体库不存在。");
        }

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var library = GetLibraryRecord(connection, parsedId);
        if (library is null)
        {
            throw CreateException(
                StatusCodes.Status404NotFound,
                "library.refresh.not_found",
                $"Library {libraryId} was not found.",
                "媒体库不存在。");
        }

        var videoCount = GetLibraryVideoCount(connection, parsedId);
        var extraInfo = new JsonObject();
        if (!string.IsNullOrWhiteSpace(library.Value.ExtraInfo))
        {
            extraInfo = ParseObject(library.Value.ExtraInfo);
        }

        if (lastScanAtUtc.HasValue)
        {
            extraInfo["lastScanAt"] = lastScanAtUtc.Value.ToString("O");
        }

        if (lastScrapeAtUtc.HasValue)
        {
            extraInfo["lastScrapeAt"] = lastScrapeAtUtc.Value.ToString("O");
        }

        var syncedVideoCount = GetLibrarySyncedVideoCount(connection, parsedId);
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            UPDATE app_databases
            SET Count = $count,
                ExtraInfo = $extraInfo,
                UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
            WHERE DBId = $libraryId;
            """;
        command.Parameters.AddWithValue("$count", videoCount);
        command.Parameters.AddWithValue("$extraInfo", extraInfo.ToJsonString());
        command.Parameters.AddWithValue("$libraryId", parsedId);
        command.ExecuteNonQuery();

        var libraryDto = new LibraryListItemDto
        {
            LibraryId = parsedId.ToString(),
            Name = library.Value.Name,
            Path = library.Value.Path,
            ScanPaths = library.Value.ScanPaths,
            VideoCount = videoCount,
            SyncedVideoCount = syncedVideoCount,
            CompletionPercent = CalculateCompletionPercent(videoCount, syncedVideoCount),
            IsFullySynced = videoCount > 0 && syncedVideoCount >= videoCount,
            LastScanAt = ReadString(extraInfo, "lastScanAt"),
            LastScrapeAt = ReadString(extraInfo, "lastScrapeAt"),
            HasRunningTask = workerTaskRegistryService.HasRunningTask(parsedId.ToString()),
        };

        PublishLibraryChanged(action, libraryDto);
        return libraryDto;
    }

    private static WorkerApiException CreateException(
        int statusCode,
        string code,
        string message,
        string userMessage,
        object? details = null,
        Exception? innerException = null)
    {
        var error = new ApiErrorDto
        {
            Code = code,
            Message = message,
            UserMessage = userMessage,
            Retryable = false,
            Details = details,
        };

        return innerException is null
            ? new WorkerApiException(statusCode, error)
            : new WorkerApiException(statusCode, error, innerException);
    }

    private static IReadOnlyList<string> NormalizeScanPaths(CreateLibraryRequest request)
    {
        var candidates = request.ScanPaths?.Count > 0
            ? request.ScanPaths
            : (string.IsNullOrWhiteSpace(request.Path) ? Array.Empty<string>() : new[] { request.Path });

        var deduplicated = new List<string>();
        foreach (var candidate in candidates)
        {
            var normalized = candidate?.Trim();
            if (string.IsNullOrWhiteSpace(normalized))
            {
                continue;
            }

            if (!deduplicated.Contains(normalized, StringComparer.OrdinalIgnoreCase))
            {
                deduplicated.Add(normalized);
            }
        }

        return deduplicated;
    }

    private static IReadOnlyList<string> ParseScanPaths(string rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return Array.Empty<string>();
        }

        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(rawValue, JsonSerializerOptions);
            if (list is not null)
            {
                return list.Where(path => !string.IsNullOrWhiteSpace(path)).Select(path => path.Trim()).ToList();
            }
        }
        catch (JsonException)
        {
            // Keep backward compatibility with plain-string ScanPath values.
        }

        return new[] { rawValue.Trim() };
    }

    private static string SerializeScanPaths(IReadOnlyList<string> scanPaths)
    {
        return scanPaths.Count == 0 ? string.Empty : JsonSerializer.Serialize(scanPaths, JsonSerializerOptions);
    }

    private void EnsureLibraryNameNotExists(SqliteConnection connection, string name)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT COUNT(1)
            FROM app_databases
            WHERE DataType = $dataType
              AND LOWER(Name) = LOWER($name);
            """;
        command.Parameters.AddWithValue("$dataType", VideoDataType);
        command.Parameters.AddWithValue("$name", name);

        var count = Convert.ToInt32(command.ExecuteScalar());
        if (count > 0)
        {
            throw CreateException(
                StatusCodes.Status409Conflict,
                "library.create.duplicate_name",
                $"Library name already exists: {name}.",
                "媒体库名称已存在，请更换名称。",
                new { name });
        }
    }

    private LibraryRecord? GetLibraryRecord(SqliteConnection connection, long libraryId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT DBId, Name, DataType, IFNULL(Count, 0), IFNULL(ScanPath, ''), IFNULL(ExtraInfo, '')
            FROM app_databases
            WHERE DBId = $libraryId
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$libraryId", libraryId);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new LibraryRecord(
            reader.GetInt64(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? VideoDataType : Convert.ToInt64(reader.GetValue(2)),
            reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3)),
            GetLibrarySyncedVideoCount(connection, reader.GetInt64(0)),
            ParseScanPaths(reader.GetString(4)),
            reader.IsDBNull(5) ? string.Empty : reader.GetString(5));
    }

    private static JsonObject ParseObject(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new JsonObject();
        }

        return JsonNode.Parse(value) as JsonObject ?? new JsonObject();
    }

    private static string? ReadString(JsonObject document, string propertyName)
    {
        if (!document.TryGetPropertyValue(propertyName, out var node) || node is null)
        {
            return null;
        }

        if (node is JsonValue value && value.TryGetValue<string>(out var stringValue) && !string.IsNullOrWhiteSpace(stringValue))
        {
            return stringValue;
        }

        return null;
    }

    private void DeleteLibraryRows(SqliteConnection connection, SqliteTransaction transaction, long libraryId, long dataType)
    {
        var existingTables = GetExistingTables(connection, transaction);
        if (existingTables.Contains("metadata") && MetadataTablesByDataType.TryGetValue(dataType, out var metadataTable) && existingTables.Contains(metadataTable))
        {
            ExecuteNonQuery(connection, transaction, $"DELETE FROM {metadataTable} WHERE DataID IN (SELECT DataID FROM metadata WHERE DBId = $libraryId);", libraryId);
        }

        foreach (var table in new[] { "metadata_to_tagstamp", "metadata_to_actor", "metadata_to_label", "metadata_to_translation" })
        {
            if (!existingTables.Contains(table) || !existingTables.Contains("metadata"))
            {
                continue;
            }

            ExecuteNonQuery(connection, transaction, $"DELETE FROM {table} WHERE DataID IN (SELECT DataID FROM metadata WHERE DBId = $libraryId);", libraryId);
        }

        if (existingTables.Contains("metadata"))
        {
            ExecuteNonQuery(connection, transaction, "DELETE FROM metadata WHERE DBId = $libraryId;", libraryId);
        }
    }

    private void DeleteLibraryRecord(SqliteConnection connection, SqliteTransaction transaction, long libraryId)
    {
        ExecuteNonQuery(connection, transaction, "DELETE FROM app_databases WHERE DBId = $libraryId;", libraryId);
    }

    private HashSet<string> GetExistingTables(SqliteConnection connection, SqliteTransaction transaction)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table';";

        using var reader = command.ExecuteReader();
        var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (reader.Read())
        {
            tables.Add(reader.GetString(0));
        }

        return tables;
    }

    private void ExecuteNonQuery(SqliteConnection connection, SqliteTransaction transaction, string sql, long libraryId)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        command.Parameters.AddWithValue("$libraryId", libraryId);
        command.ExecuteNonQuery();
    }

    private void EnsureDefaultLibrarySelection(long insertedId)
    {
        var mainConfig = configStoreService.LoadConfigObject(MainConfigName);
        var settingsConfig = configStoreService.LoadConfigObject(SettingsConfigName);

        var currentDbId = configStoreService.ReadInt64(mainConfig, "CurrentDBId");
        var defaultDbId = configStoreService.ReadInt64(settingsConfig, "DefaultDBID");

        if (currentDbId <= 0)
        {
            configStoreService.UpsertConfigObject(MainConfigName, document => document["CurrentDBId"] = insertedId);
        }

        if (defaultDbId <= 0)
        {
            configStoreService.UpsertConfigObject(SettingsConfigName, document => document["DefaultDBID"] = insertedId);
        }
    }

    private void ReassignDefaultLibrarySelection(long deletedLibraryId)
    {
        var replacementId = GetFirstRemainingLibraryId();
        var mainConfig = configStoreService.LoadConfigObject(MainConfigName);
        var settingsConfig = configStoreService.LoadConfigObject(SettingsConfigName);

        var currentDbId = configStoreService.ReadInt64(mainConfig, "CurrentDBId");
        var defaultDbId = configStoreService.ReadInt64(settingsConfig, "DefaultDBID");
        var openDatabaseDefault = configStoreService.ReadBoolean(settingsConfig, "OpenDataBaseDefault");

        if (currentDbId == deletedLibraryId)
        {
            configStoreService.UpsertConfigObject(MainConfigName, document => document["CurrentDBId"] = replacementId);
        }

        if (defaultDbId == deletedLibraryId)
        {
            configStoreService.UpsertConfigObject(SettingsConfigName, document => document["DefaultDBID"] = replacementId);
        }

        if (replacementId == 0 && openDatabaseDefault)
        {
            configStoreService.UpsertConfigObject(SettingsConfigName, document => document["OpenDataBaseDefault"] = false);
        }
    }

    private long GetFirstRemainingLibraryId()
    {
        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT DBId
            FROM app_databases
            WHERE DataType = $dataType
              AND IFNULL(Name, '') <> ''
              AND IFNULL(Hide, 0) = 0
            ORDER BY DBId ASC
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$dataType", VideoDataType);

        var result = command.ExecuteScalar();
        return result is null || result == DBNull.Value ? 0 : Convert.ToInt64(result);
    }

    private int GetLibraryVideoCount(SqliteConnection connection, long libraryId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT COUNT(1)
            FROM metadata
            WHERE DBId = $libraryId
              AND DataType = $dataType;
            """;
        command.Parameters.AddWithValue("$libraryId", libraryId);
        command.Parameters.AddWithValue("$dataType", VideoDataType);
        return Convert.ToInt32(command.ExecuteScalar());
    }

    private int GetLibrarySyncedVideoCount(SqliteConnection connection, long libraryId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT COUNT(1)
            FROM metadata
            INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DBId = $libraryId
              AND metadata.DataType = $dataType
              AND LOWER(IFNULL(metadata_video.ScrapeStatus, 'none')) = 'full';
            """;
        command.Parameters.AddWithValue("$libraryId", libraryId);
        command.Parameters.AddWithValue("$dataType", VideoDataType);
        return Convert.ToInt32(command.ExecuteScalar());
    }

    private static int CalculateCompletionPercent(int videoCount, int syncedVideoCount)
    {
        if (videoCount <= 0)
        {
            return 0;
        }

        return Math.Clamp((int)Math.Round((double)syncedVideoCount / videoCount * 100d), 0, 100);
    }

    private LibraryListItemDto ToLibraryListItem(LibraryRecord record)
    {
        var extraInfo = ParseObject(record.ExtraInfo);
        return new LibraryListItemDto
        {
            LibraryId = record.Id.ToString(),
            Name = record.Name,
            Path = record.Path,
            ScanPaths = record.ScanPaths,
            VideoCount = record.VideoCount,
            SyncedVideoCount = record.SyncedVideoCount,
            CompletionPercent = CalculateCompletionPercent(record.VideoCount, record.SyncedVideoCount),
            IsFullySynced = record.VideoCount > 0 && record.SyncedVideoCount >= record.VideoCount,
            LastScanAt = ReadString(extraInfo, "lastScanAt"),
            LastScrapeAt = ReadString(extraInfo, "lastScrapeAt"),
            HasRunningTask = workerTaskRegistryService.HasRunningTask(record.Id.ToString()),
        };
    }

    private void PublishLibraryChanged(string action, LibraryListItemDto library)
    {
        workerEventStreamBroker.Publish(
            "library.changed",
            $"library:{library.LibraryId}",
            new LibraryChangedEvent
            {
                Action = action,
                Library = library,
                OccurredAtUtc = DateTimeOffset.UtcNow,
            });

        var taskSummaryChanged = taskSummarySnapshotService.Touch();
        workerEventStreamBroker.Publish("task.summary.changed", "tasks", taskSummaryChanged);
    }

    private readonly record struct LibraryRecord(
        long Id,
        string Name,
        long DataType,
        int VideoCount,
        int SyncedVideoCount,
        IReadOnlyList<string> ScanPaths,
        string ExtraInfo)
    {
        public string Path => ScanPaths.FirstOrDefault() ?? string.Empty;

        public string? LastScanAt => ReadString(ParseObject(ExtraInfo), "lastScanAt");

        public string? LastScrapeAt => ReadString(ParseObject(ExtraInfo), "lastScrapeAt");
    }
}
