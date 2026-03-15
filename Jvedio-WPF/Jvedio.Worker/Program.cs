using Jvedio.Worker.Hosting;
using Jvedio.Worker.Middleware;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Hosting;

var builder = WebApplication.CreateBuilder(args);

if (string.IsNullOrWhiteSpace(builder.Configuration[WebHostDefaults.ServerUrlsKey]))
{
    builder.WebHost.UseUrls("http://127.0.0.1:0");
}

builder.Services.AddControllers();
builder.Services.AddSingleton<WorkerRuntimeState>();
builder.Services.AddSingleton<WorkerPathResolver>();
builder.Services.AddSingleton<SqliteConnectionFactory>();
builder.Services.AddSingleton<ConfigStoreService>();
builder.Services.AddSingleton<WorkerStorageBootstrapper>();
builder.Services.AddSingleton<WorkerEventStreamBroker>();
builder.Services.AddSingleton<WorkerTaskRegistryService>();
builder.Services.AddSingleton<LibraryService>();
builder.Services.AddSingleton<LibraryTaskOrchestratorService>();
builder.Services.AddSingleton<LibraryScanService>();
builder.Services.AddSingleton<LibraryScrapeService>();
builder.Services.AddSingleton<AppBootstrapService>();
builder.Services.AddSingleton<TaskSummarySnapshotService>();
builder.Services.AddHostedService<WorkerReadySignalHostedService>();

var app = builder.Build();

app.Services.GetRequiredService<WorkerStorageBootstrapper>().EnsureInitialized();

app.UseMiddleware<ApiExceptionMiddleware>();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new
{
    stage = "D",
    service = "Jvedio.Worker",
    status = "scan-scrape-minimal-loop-ready",
}));

app.Run();
