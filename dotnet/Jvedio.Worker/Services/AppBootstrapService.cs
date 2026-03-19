using System.Diagnostics;

using Jvedio.Contracts.App;
using Jvedio.Worker.Hosting;

namespace Jvedio.Worker.Services;

public sealed class AppBootstrapService
{
    private readonly LibraryService libraryService;
    private readonly TaskSummarySnapshotService taskSummarySnapshotService;
    private readonly WorkerPathResolver workerPathResolver;
    private readonly WorkerRuntimeState workerRuntimeState;

    public AppBootstrapService(
        LibraryService libraryService,
        TaskSummarySnapshotService taskSummarySnapshotService,
        WorkerPathResolver workerPathResolver,
        WorkerRuntimeState workerRuntimeState)
    {
        this.libraryService = libraryService;
        this.taskSummarySnapshotService = taskSummarySnapshotService;
        this.workerPathResolver = workerPathResolver;
        this.workerRuntimeState = workerRuntimeState;
    }

    public GetBootstrapResponse GetBootstrap()
    {
        var libraries = libraryService.GetLibraries();

        return new GetBootstrapResponse
        {
            App = new AppInfoDto
            {
                Name = "Jvedio",
                Version = ResolveAppVersion(),
            },
            Shell = new ShellBootstrapDto
            {
                StartRoute = "/home",
                SupportsDynamicWorkerPort = true,
                Theme = "system",
                TaskDrawerEnabled = false,
            },
            Libraries = libraries,
            TaskSummary = taskSummarySnapshotService.GetCurrent(),
            Worker = new WorkerStatusDto
            {
                Status = workerRuntimeState.IsReady ? "ready" : "starting",
                BaseUrl = workerRuntimeState.BaseUrl,
                StartedAtUtc = workerRuntimeState.StartedAtUtc,
                Healthy = workerRuntimeState.IsReady,
                EventStreamPath = "/api/events",
            },
        };
    }

    private string ResolveAppVersion()
    {
        var executablePath = Path.Combine(workerPathResolver.SharedAppBaseDirectory, "Jvedio.exe");
        if (File.Exists(executablePath))
        {
            var info = FileVersionInfo.GetVersionInfo(executablePath);
            if (!string.IsNullOrWhiteSpace(info.FileVersion))
            {
                return info.FileVersion;
            }

            if (!string.IsNullOrWhiteSpace(info.ProductVersion))
            {
                return info.ProductVersion;
            }
        }

        return "unknown";
    }
}
