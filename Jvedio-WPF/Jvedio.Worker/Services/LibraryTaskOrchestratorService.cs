using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;
using Jvedio.Contracts.Tasks;

namespace Jvedio.Worker.Services;

public sealed class LibraryTaskOrchestratorService
{
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
        if (workerTaskRegistryService.HasRunningTask(library.LibraryId, "library.scan"))
        {
            throw CreateConflictException("library.scan.conflict", "当前媒体库已有扫描任务在执行。", library.LibraryId);
        }

        var task = workerTaskRegistryService.CreateTask("library.scan", library.LibraryId, library.Name, $"准备扫描媒体库“{library.Name}”");
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

    public WorkerTaskDto StartScrapeTask(string libraryId, StartLibraryScrapeRequest request)
    {
        var library = libraryService.GetLibrary(libraryId) ?? throw CreateNotFoundException("library.scrape.not_found", libraryId);
        if (workerTaskRegistryService.HasRunningTask(library.LibraryId, "library.scrape"))
        {
            throw CreateConflictException("library.scrape.conflict", "当前媒体库已有抓取任务在执行。", library.LibraryId);
        }

        var task = workerTaskRegistryService.CreateTask("library.scrape", library.LibraryId, library.Name, $"准备抓取媒体库“{library.Name}”");
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
}
