using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;

using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class LibraryScanService
{
    private static readonly Regex Fc2Regex = new(@"(?<prefix>FC2)[-_ ]?(?<middle>PPV)[-_ ]?(?<number>\d{3,8})", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex GeneralVidRegex = new(@"(?<prefix>[A-Z]{2,10})[-_ ]?(?<number>\d{2,5})(?:[-_ ]?(?<suffix>[A-Z]))?", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly HashSet<string> SubtitleExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".ass",
        ".srt",
        ".ssa",
        ".sub",
        ".vtt",
    };

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".3g2", ".3gp", ".3gp2", ".3gpp", ".amr", ".amv", ".asf", ".avi", ".bdmv", ".bik", ".d2v",
        ".divx", ".drc", ".dsa", ".dsm", ".dss", ".dsv", ".evo", ".f4v", ".flc", ".fli", ".flic",
        ".flv", ".hdmov", ".ifo", ".ivf", ".m1v", ".m2p", ".m2t", ".m2ts", ".m2v", ".m4b", ".m4p",
        ".m4v", ".mkv", ".mp2v", ".mp4", ".mp4v", ".mpe", ".mpeg", ".mpg", ".mpls", ".mpv2", ".mpv4",
        ".mov", ".mts", ".ogm", ".ogv", ".pss", ".pva", ".qt", ".ram", ".ratdvd", ".rm", ".rmm", ".rmvb",
        ".roq", ".rpm", ".smil", ".smk", ".swf", ".tp", ".tpr", ".ts", ".vob", ".vp6", ".webm", ".wm",
        ".wmp", ".wmv",
    };

    private readonly ConfigStoreService configStoreService;
    private readonly LibraryService libraryService;
    private readonly ILogger<LibraryScanService> logger;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;
    private readonly WorkerTaskRegistryService workerTaskRegistryService;

    public LibraryScanService(
        ConfigStoreService configStoreService,
        LibraryService libraryService,
        ILogger<LibraryScanService> logger,
        SqliteConnectionFactory sqliteConnectionFactory,
        WorkerTaskRegistryService workerTaskRegistryService)
    {
        this.configStoreService = configStoreService;
        this.libraryService = libraryService;
        this.logger = logger;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
        this.workerTaskRegistryService = workerTaskRegistryService;
    }

    public async Task<string> ScanLibraryAsync(string taskId, LibraryListItemDto library, StartLibraryScanRequest request, CancellationToken cancellationToken)
    {
        var scanPaths = ResolveScanPaths(library, request);
        var discoveredFiles = new List<string>();
        for (var i = 0; i < scanPaths.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            discoveredFiles.AddRange(EnumerateVideoFiles(scanPaths[i]));
            workerTaskRegistryService.ReportProgress(taskId, "discovering", i + 1, scanPaths.Count, $"正在扫描目录 {i + 1}/{scanPaths.Count}");
            await Task.Yield();
        }

        if (discoveredFiles.Count == 0)
        {
            libraryService.RefreshLibraryState(library.LibraryId, "scan.completed", lastScanAtUtc: DateTimeOffset.UtcNow);
            return "扫描完成，未发现可导入的影片文件。";
        }

        using var connection = sqliteConnectionFactory.OpenAppDataConnection();
        var existingVideos = LoadExistingVideos(connection, library.LibraryId);
        var minFileSizeBytes = ReadMinFileSizeBytes();
        var importedCount = 0;
        var updatedCount = 0;
        var skippedCount = 0;
        var organizedCount = 0;

        for (var index = 0; index < discoveredFiles.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var originalPath = discoveredFiles[index];
            var currentPath = originalPath;
            if (!File.Exists(originalPath))
            {
                skippedCount++;
                continue;
            }

            var fileInfo = new FileInfo(originalPath);
            if (fileInfo.Length < minFileSizeBytes)
            {
                skippedCount++;
                continue;
            }

            var vid = ExtractVideoId(originalPath);
            if (request.OrganizeBeforeScan)
            {
                var organizeResult = TryOrganize(originalPath, vid);
                if (!organizeResult.Success)
                {
                    skippedCount++;
                    logger.LogWarning("[Library-Organize] skip {SourcePath}: {Message}", originalPath, organizeResult.Message);
                    continue;
                }

                currentPath = organizeResult.TargetVideoPath;
                if (organizeResult.Organized)
                {
                    organizedCount++;
                }
            }

            var currentFileInfo = new FileInfo(currentPath);
            var hash = CreatePathHash(currentPath);
            if (existingVideos.ByPath.TryGetValue(currentPath, out var byPath))
            {
                UpdateExistingVideo(connection, byPath, currentPath, currentFileInfo.Length, hash);
                existingVideos.ByVid[byPath.Vid] = byPath with { Path = currentPath, Size = currentFileInfo.Length, Hash = hash };
                updatedCount++;
            }
            else if (!string.IsNullOrWhiteSpace(vid) && existingVideos.ByVid.TryGetValue(vid, out var byVid))
            {
                UpdateExistingVideo(connection, byVid, currentPath, currentFileInfo.Length, hash);
                existingVideos.ByPath[currentPath] = byVid with { Path = currentPath, Size = currentFileInfo.Length, Hash = hash };
                existingVideos.ByVid[vid] = byVid with { Path = currentPath, Size = currentFileInfo.Length, Hash = hash };
                updatedCount++;
            }
            else
            {
                var inserted = InsertVideo(connection, library.LibraryId, currentPath, vid, currentFileInfo.Length, hash);
                existingVideos.ByPath[currentPath] = inserted;
                if (!string.IsNullOrWhiteSpace(inserted.Vid))
                {
                    existingVideos.ByVid[inserted.Vid] = inserted;
                }

                importedCount++;
            }

            workerTaskRegistryService.ReportProgress(
                taskId,
                "importing",
                index + 1,
                discoveredFiles.Count,
                $"正在导入影片 {index + 1}/{discoveredFiles.Count}");
        }

        libraryService.RefreshLibraryState(library.LibraryId, "scan.completed", lastScanAtUtc: DateTimeOffset.UtcNow);
        return $"扫描完成：新增 {importedCount}，更新 {updatedCount}，跳过 {skippedCount}，整理目录 {organizedCount}。";
    }

    private long ReadMinFileSizeBytes()
    {
        var scanConfig = configStoreService.LoadConfigObject("ScanConfig");
        var minFileSizeMb = configStoreService.ReadInt64(scanConfig, "MinFileSize");
        return Math.Max(0, minFileSizeMb) * 1024L * 1024L;
    }

    private IReadOnlyList<string> ResolveScanPaths(LibraryListItemDto library, StartLibraryScanRequest request)
    {
        var candidates = request.Paths.Count > 0 ? request.Paths : library.ScanPaths;
        var normalized = candidates
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Select(path => Path.GetFullPath(path.Trim()))
            .Where(Directory.Exists)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalized.Count == 0)
        {
            throw new WorkerApiException(StatusCodes.Status422UnprocessableEntity, new ApiErrorDto
            {
                Code = "library.scan_path_missing",
                Message = "The library does not have any valid scan paths.",
                UserMessage = "请先为媒体库配置有效的扫描目录。",
                Retryable = false,
                Details = new { libraryId = library.LibraryId },
            });
        }

        return normalized;
    }

    private static IEnumerable<string> EnumerateVideoFiles(string scanPath)
    {
        try
        {
            return Directory
                .EnumerateFiles(scanPath, "*.*", SearchOption.AllDirectories)
                .Where(filePath => VideoExtensions.Contains(Path.GetExtension(filePath)));
        }
        catch (Exception)
        {
            return Array.Empty<string>();
        }
    }

    private ExistingVideoIndex LoadExistingVideos(SqliteConnection connection, string libraryId)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT metadata.DataID,
                   IFNULL(metadata.Path, ''),
                   IFNULL(metadata.Size, 0),
                   IFNULL(metadata.Hash, ''),
                   IFNULL(metadata_video.MVID, 0),
                   IFNULL(metadata_video.VID, '')
            FROM metadata
            LEFT JOIN metadata_video ON metadata_video.DataID = metadata.DataID
            WHERE metadata.DBId = $libraryId
              AND metadata.DataType = 0;
            """;
        command.Parameters.AddWithValue("$libraryId", long.Parse(libraryId));

        var byPath = new Dictionary<string, ExistingVideoRecord>(StringComparer.OrdinalIgnoreCase);
        var byVid = new Dictionary<string, ExistingVideoRecord>(StringComparer.OrdinalIgnoreCase);
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var record = new ExistingVideoRecord(
                reader.GetInt64(0),
                reader.IsDBNull(4) ? 0 : reader.GetInt64(4),
                reader.GetString(1),
                reader.GetString(5),
                reader.IsDBNull(2) ? 0 : reader.GetInt64(2),
                reader.GetString(3));

            if (!string.IsNullOrWhiteSpace(record.Path))
            {
                byPath[record.Path] = record;
            }

            if (!string.IsNullOrWhiteSpace(record.Vid))
            {
                byVid[record.Vid] = record;
            }
        }

        return new ExistingVideoIndex(byPath, byVid);
    }

    private static string ExtractVideoId(string filePath)
    {
        var fileName = Path.GetFileNameWithoutExtension(filePath).ToUpperInvariant();
        var fc2Match = Fc2Regex.Match(fileName);
        if (fc2Match.Success)
        {
            return $"{fc2Match.Groups["prefix"].Value}-{fc2Match.Groups["middle"].Value}-{fc2Match.Groups["number"].Value}";
        }

        var match = GeneralVidRegex.Match(fileName);
        if (!match.Success)
        {
            return string.Empty;
        }

        var prefix = match.Groups["prefix"].Value.ToUpperInvariant();
        var number = match.Groups["number"].Value;
        var suffix = match.Groups["suffix"].Success ? $"-{match.Groups["suffix"].Value.ToUpperInvariant()}" : string.Empty;
        return $"{prefix}-{number}{suffix}";
    }

    private static LibraryOrganizeResult TryOrganize(string sourcePath, string vid)
    {
        var result = new LibraryOrganizeResult
        {
            Success = true,
            Organized = false,
            SourcePath = sourcePath,
            TargetVideoPath = sourcePath,
        };

        var parentDir = Path.GetDirectoryName(sourcePath);
        if (string.IsNullOrWhiteSpace(parentDir))
        {
            result.Success = false;
            result.Message = "影片目录不存在。";
            return result;
        }

        var folderName = SanitizeFileName(string.IsNullOrWhiteSpace(vid) ? Path.GetFileNameWithoutExtension(sourcePath) : vid);
        var parentDirName = Path.GetFileName(parentDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
        var alreadyInDedicatedDirectory = string.Equals(parentDirName, folderName, StringComparison.OrdinalIgnoreCase);
        var targetDir = alreadyInDedicatedDirectory
            ? parentDir
            : Path.Combine(parentDir, folderName);
        result.TargetDirectory = targetDir;
        var files = Directory.GetFiles(parentDir, "*.*", SearchOption.TopDirectoryOnly);
        var videoCount = files.Count(filePath => VideoExtensions.Contains(Path.GetExtension(filePath)));
        if (alreadyInDedicatedDirectory || (videoCount <= 1 && string.Equals(parentDir, targetDir, StringComparison.OrdinalIgnoreCase)))
        {
            result.Message = "无需整理";
            return result;
        }

        Directory.CreateDirectory(targetDir);
        var targetVideoPath = Path.Combine(targetDir, Path.GetFileName(sourcePath));
        if (!string.Equals(sourcePath, targetVideoPath, StringComparison.OrdinalIgnoreCase))
        {
            if (File.Exists(targetVideoPath))
            {
                result.Success = false;
                result.Message = $"目标目录已存在同名文件：{targetVideoPath}";
                return result;
            }

            File.Move(sourcePath, targetVideoPath);
            result.Organized = true;
            result.TargetVideoPath = targetVideoPath;
        }

        foreach (var siblingFile in Directory.GetFiles(parentDir, $"{Path.GetFileNameWithoutExtension(sourcePath)}.*", SearchOption.TopDirectoryOnly))
        {
            if (!SubtitleExtensions.Contains(Path.GetExtension(siblingFile)))
            {
                continue;
            }

            var targetSubtitlePath = Path.Combine(targetDir, Path.GetFileName(siblingFile));
            if (File.Exists(targetSubtitlePath))
            {
                continue;
            }

            File.Move(siblingFile, targetSubtitlePath);
            result.Organized = true;
        }

        result.Message = result.Organized ? $"已整理到目录：{targetDir}" : "无需整理";
        return result;
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

    private static string CreatePathHash(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value.ToLowerInvariant());
        var hash = MD5.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static void UpdateExistingVideo(SqliteConnection connection, ExistingVideoRecord existingVideo, string currentPath, long size, string hash)
    {
        using var metadataCommand = connection.CreateCommand();
        metadataCommand.CommandText =
            """
            UPDATE metadata
            SET Path = $path,
                Size = $size,
                Hash = $hash,
                LastScanDate = $lastScanDate,
                UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
            WHERE DataID = $dataId;
            """;
        metadataCommand.Parameters.AddWithValue("$dataId", existingVideo.DataId);
        metadataCommand.Parameters.AddWithValue("$path", currentPath);
        metadataCommand.Parameters.AddWithValue("$size", size);
        metadataCommand.Parameters.AddWithValue("$hash", hash);
        metadataCommand.Parameters.AddWithValue("$lastScanDate", DateTimeOffset.Now.ToString("yyyy-MM-dd HH:mm:ss"));
        metadataCommand.ExecuteNonQuery();
    }

    private static ExistingVideoRecord InsertVideo(SqliteConnection connection, string libraryId, string currentPath, string vid, long size, string hash)
    {
        var localNow = DateTimeOffset.Now.ToString("yyyy-MM-dd HH:mm:ss");
        using var metadataCommand = connection.CreateCommand();
        metadataCommand.CommandText =
            """
            INSERT INTO metadata (DBId, Title, Size, Path, Hash, DataType, FirstScanDate, LastScanDate)
            VALUES ($libraryId, '', $size, $path, $hash, 0, $now, $now);
            SELECT last_insert_rowid();
            """;
        metadataCommand.Parameters.AddWithValue("$libraryId", long.Parse(libraryId));
        metadataCommand.Parameters.AddWithValue("$size", size);
        metadataCommand.Parameters.AddWithValue("$path", currentPath);
        metadataCommand.Parameters.AddWithValue("$hash", hash);
        metadataCommand.Parameters.AddWithValue("$now", localNow);
        var dataId = Convert.ToInt64(metadataCommand.ExecuteScalar());

        using var videoCommand = connection.CreateCommand();
        videoCommand.CommandText =
            """
            INSERT INTO metadata_video (DataID, VID, VideoType, Series, Director, Studio, Publisher, Plot, Outline, Duration, SubSection, ImageUrls, WebType, WebUrl, ExtraInfo)
            VALUES ($dataId, $vid, 0, '', '', '', '', '', '', 0, '', '', '', '', '');
            SELECT last_insert_rowid();
            """;
        videoCommand.Parameters.AddWithValue("$dataId", dataId);
        videoCommand.Parameters.AddWithValue("$vid", vid);
        var mvid = Convert.ToInt64(videoCommand.ExecuteScalar());
        return new ExistingVideoRecord(dataId, mvid, currentPath, vid, size, hash);
    }

    private readonly record struct ExistingVideoRecord(long DataId, long Mvid, string Path, string Vid, long Size, string Hash);

    private readonly record struct ExistingVideoIndex(
        Dictionary<string, ExistingVideoRecord> ByPath,
        Dictionary<string, ExistingVideoRecord> ByVid);

    private sealed class LibraryOrganizeResult
    {
        public string Message { get; set; } = string.Empty;

        public bool Organized { get; set; }

        public string SourcePath { get; set; } = string.Empty;

        public bool Success { get; set; }

        public string TargetDirectory { get; set; } = string.Empty;

        public string TargetVideoPath { get; set; } = string.Empty;
    }
}
