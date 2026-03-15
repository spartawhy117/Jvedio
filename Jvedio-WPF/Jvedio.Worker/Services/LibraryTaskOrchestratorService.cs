using System.Collections.Concurrent;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;
using Jvedio.Contracts.Tasks;

namespace Jvedio.Worker.Services;

public sealed class LibraryTaskOrchestratorService
{
    private readonly ConcurrentDictionary<string, TaskRetryDescriptor> retryDescriptors = new(StringComparer.OrdinalIgnoreCase);
    private readonly LibraryScanService libraryScanService;
    private readonly LibraryScrapeService libraryScrapeService;
    private readonly LibraryService libraryService;
    private readonly ILogger<LibraryTaskOrchestratorService> logger;
    private readonly WorkerTaskRegistryService workerTaskRegistryService;

    public LibraryTaskOrchestratorService(
        LibraryScanService libraryScanService,
        LibraryScrapeService libraryScrapeService,
        LibraryService libraryService,
        ILogger<LibraryTaskOrchestratorService> logger,
        WorkerTaskRegistryService workerTaskRegistryService)
    {
        this.libraryScanService = libraryScanService;
        this.libraryScrapeService = libraryScrapeService;
        this.libraryService = libraryService;
        this.logger = logger;
        this.workerTaskRegistryService = workerTaskRegistryService;
    }

    public WorkerTaskDto StartScanTask(string libraryId, StartLibraryScanRequest request)
    {
        var library = libraryService.GetLibrary(libraryId) ?? throw CreateNotFoundException("library.scan.not_found", libraryId);
        return StartScanTaskCore(library, Clone(request), retriedFromTaskId: null);
    }

    public WorkerTaskDto StartScrapeTask(string libraryId, StartLibraryScrapeRequest request)
    {
        var library = libraryService.GetLibrary(libraryId) ?? throw CreateNotFoundException("library.scrape.not_found", libraryId);
        return StartScrapeTaskCore(library, Clone(request), retriedFromTaskId: null);
    }

    public WorkerTaskDto RetryTask(string taskId)
    {
        var task = workerTaskRegistryService.GetTask(taskId);
        if (task is null)
        {
            throw CreateTaskNotFoundException(taskId);
        }

        if (!string.Equals(task.Status, "failed", StringComparison.OrdinalIgnoreCase))
        {
            throw CreateTaskRetryConflictException("task.retry.not_failed", "仅失败任务支持重试。", taskId);
        }

        if (!task.CanRetry)
        {
            throw CreateTaskRetryConflictException("task.retry.unsupported", "当前任务类型暂不支持重试。", taskId);
        }

        if (!retryDescriptors.TryGetValue(taskId, out var descriptor))
        {
            throw CreateTaskRetryConflictException("task.retry.payload_missing", "当前任务缺少可重试的原始上下文。", taskId);
        }

        return descriptor switch
        {
            ScanTaskRetryDescriptor scan => StartScanTaskCore(
                libraryService.GetLibrary(scan.LibraryId) ?? throw CreateNotFoundException("library.scan.not_found", scan.LibraryId),
                Clone(scan.Request),
                taskId),
            ScrapeTaskRetryDescriptor scrape => StartScrapeTaskCore(
                libraryService.GetLibrary(scrape.LibraryId) ?? throw CreateNotFoundException("library.scrape.not_found", scrape.LibraryId),
                Clone(scrape.Request),
                taskId),
            _ => throw CreateTaskRetryConflictException("task.retry.unsupported", "当前任务类型暂不支持重试。", taskId),
        };
    }

    private static WorkerApiException CreateConflictException(string code, string userMessage, string libraryId)
    {
        return new WorkerApiException(StatusCodes.Status409Conflict, new ApiErrorDto
        {
            Code = code,
            Message = userMessage,
            UserMessage = userMessage,
            Retryable = false,
            Details = new { libraryId },
        });
    }

    private static WorkerApiException CreateNotFoundException(string code, string libraryId)
    {
        return new WorkerApiException(StatusCodes.Status404NotFound, new ApiErrorDto
        {
            Code = code,
            Message = $"Library {libraryId} was not found.",
            UserMessage = "媒体库不存在。",
            Retryable = false,
            Details = new { libraryId },
        });
    }

    private WorkerTaskDto StartScanTaskCore(LibraryListItemDto library, StartLibraryScanRequest request, string? retriedFromTaskId)
    {
        if (workerTaskRegistryService.HasRunningTask(library.LibraryId, "library.scan"))
        {
            throw CreateConflictException("library.scan.conflict", "当前媒体库已有扫描任务在执行。", library.LibraryId);
        }

        var task = workerTaskRegistryService.CreateTask(
            "library.scan",
            library.LibraryId,
            library.Name,
            retriedFromTaskId is null ? $"准备扫描媒体库“{library.Name}”" : $"正在重试扫描媒体库“{library.Name}”",
            canRetry: true,
            retriedFromTaskId: retriedFromTaskId);
        retryDescriptors[task.Id] = new ScanTaskRetryDescriptor(library.LibraryId, Clone(request));
        _ = Task.Run(async () =>
        {
            try
            {
                workerTaskRegistryService.MarkRunning(task.Id, "preparing", $"正在准备扫描媒体库“{library.Name}”");
                var summary = await libraryScanService.ScanLibraryAsync(task.Id, library, request, CancellationToken.None);
                workerTaskRegistryService.CompleteTask(task.Id, summary);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[Worker-HomeMvp] Library scan task failed: {TaskId}", task.Id);
                workerTaskRegistryService.FailTask(task.Id, ex.Message, $"扫描媒体库“{library.Name}”失败");
            }
        });

        return task;
    }

    private WorkerTaskDto StartScrapeTaskCore(LibraryListItemDto library, StartLibraryScrapeRequest request, string? retriedFromTaskId)
    {
        if (workerTaskRegistryService.HasRunningTask(library.LibraryId, "library.scrape"))
        {
            throw CreateConflictException("library.scrape.conflict", "当前媒体库已有抓取任务在执行。", library.LibraryId);
        }

        var task = workerTaskRegistryService.CreateTask(
            "library.scrape",
            library.LibraryId,
            library.Name,
            retriedFromTaskId is null ? $"准备抓取媒体库“{library.Name}”" : $"正在重试抓取媒体库“{library.Name}”",
            canRetry: true,
            retriedFromTaskId: retriedFromTaskId);
        retryDescriptors[task.Id] = new ScrapeTaskRetryDescriptor(library.LibraryId, Clone(request));
        _ = Task.Run(async () =>
        {
            try
            {
                workerTaskRegistryService.MarkRunning(task.Id, "preparing", $"正在准备抓取媒体库“{library.Name}”");
                var summary = await libraryScrapeService.ScrapeLibraryAsync(task.Id, library, request, CancellationToken.None);
                workerTaskRegistryService.CompleteTask(task.Id, summary);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[Worker-HomeMvp] Library scrape task failed: {TaskId}", task.Id);
                workerTaskRegistryService.FailTask(task.Id, ex.Message, $"抓取媒体库“{library.Name}”失败");
            }
        });

        return task;
    }

    private static StartLibraryScanRequest Clone(StartLibraryScanRequest request)
    {
        return new StartLibraryScanRequest
        {
            ForceRescan = request.ForceRescan,
            OrganizeBeforeScan = request.OrganizeBeforeScan,
            Paths = request.Paths?.ToArray() ?? Array.Empty<string>(),
        };
    }

    private static StartLibraryScrapeRequest Clone(StartLibraryScrapeRequest request)
    {
        return new StartLibraryScrapeRequest
        {
            DownloadActorAvatars = request.DownloadActorAvatars,
            ForceRefreshMetadata = request.ForceRefreshMetadata,
            Mode = request.Mode,
            VideoIds = request.VideoIds?.ToArray() ?? Array.Empty<string>(),
            WriteSidecars = request.WriteSidecars,
        };
    }

    private static WorkerApiException CreateTaskNotFoundException(string taskId)
    {
        return new WorkerApiException(StatusCodes.Status404NotFound, new ApiErrorDto
        {
            Code = "task.retry.not_found",
            Message = $"Task {taskId} was not found.",
            UserMessage = "任务不存在。",
            Retryable = false,
            Details = new { taskId },
        });
    }

    private static WorkerApiException CreateTaskRetryConflictException(string code, string userMessage, string taskId)
    {
        return new WorkerApiException(StatusCodes.Status409Conflict, new ApiErrorDto
        {
            Code = code,
            Message = userMessage,
            UserMessage = userMessage,
            Retryable = false,
            Details = new { taskId },
        });
    }

    private abstract record TaskRetryDescriptor(string LibraryId);

    private sealed record ScanTaskRetryDescriptor(string LibraryId, StartLibraryScanRequest Request) : TaskRetryDescriptor(LibraryId);

    private sealed record ScrapeTaskRetryDescriptor(string LibraryId, StartLibraryScrapeRequest Request) : TaskRetryDescriptor(LibraryId);
}
