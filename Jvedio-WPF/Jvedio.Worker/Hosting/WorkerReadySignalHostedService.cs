using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace Jvedio.Worker.Hosting;

public sealed class WorkerReadySignalHostedService : IHostedService
{
    public const string ReadySignalPrefix = "JVEDIO_WORKER_READY";

    private readonly IHostApplicationLifetime applicationLifetime;
    private readonly ILogger<WorkerReadySignalHostedService> logger;
    private readonly WorkerRuntimeState runtimeState;
    private readonly IServer server;

    public WorkerReadySignalHostedService(
        IHostApplicationLifetime applicationLifetime,
        ILogger<WorkerReadySignalHostedService> logger,
        WorkerRuntimeState runtimeState,
        IServer server)
    {
        this.applicationLifetime = applicationLifetime;
        this.logger = logger;
        this.runtimeState = runtimeState;
        this.server = server;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        applicationLifetime.ApplicationStarted.Register(OnStarted);
        applicationLifetime.ApplicationStopping.Register(OnStopping);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    private void OnStarted()
    {
        var baseUrl = ResolveBaseUrl();
        runtimeState.MarkReady(baseUrl);
        logger.LogInformation("[Worker-HomeMvp] Worker ready at {BaseUrl}", baseUrl);
        Console.Out.WriteLine("{0} {1}", ReadySignalPrefix, baseUrl);
    }

    private void OnStopping()
    {
        logger.LogInformation("[Worker-HomeMvp] Worker stopping");
    }

    private string ResolveBaseUrl()
    {
        var addresses = server.Features.Get<IServerAddressesFeature>()?.Addresses;
        return addresses?.FirstOrDefault() ?? "http://127.0.0.1:0";
    }
}
