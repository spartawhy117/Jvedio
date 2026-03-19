using Jvedio.Worker.Hosting;
using Jvedio.Worker.Middleware;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Hosting;
using Serilog;
using Serilog.Events;

// ── Resolve unified log directory ───────────────────────
// Dev:  {repo}/log/      (repo root determined by walking up from Worker exe)
// Prod: {exe-dir}/log/
var logDir = ResolveLogDirectory();
Directory.CreateDirectory(logDir);

// ── Configure Serilog ───────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .WriteTo.Console()                                       // keep stdout for Tauri capture
    .WriteTo.File(
        path: Path.Combine(logDir, "worker-.log"),           // worker-2026-03-19.log
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 10,                          // auto-clean after 10 days
        shared: true,
        outputTemplate: "{Timestamp:HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();                                   // replace built-in logging

if (string.IsNullOrWhiteSpace(builder.Configuration[WebHostDefaults.ServerUrlsKey]))
{
    builder.WebHost.UseUrls("http://127.0.0.1:0");
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
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
builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<ActorService>();
builder.Services.AddSingleton<VideoService>();
builder.Services.AddSingleton<AppBootstrapService>();
builder.Services.AddSingleton<TaskSummarySnapshotService>();
builder.Services.AddHostedService<WorkerReadySignalHostedService>();

var app = builder.Build();

app.Services.GetRequiredService<WorkerStorageBootstrapper>().EnsureInitialized();

app.UseCors();
app.UseMiddleware<ApiExceptionMiddleware>();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new
{
    stage = "D",
    service = "Jvedio.Worker",
    status = "scan-scrape-minimal-loop-ready",
}));

try
{
    app.Run();
}
finally
{
    Log.CloseAndFlush();
}

// ── Helpers ─────────────────────────────────────────────

static string ResolveLogDirectory()
{
    // Environment variable override (highest priority)
    // If JVEDIO_LOG_DIR is set, append "runtime" sub-folder automatically
    var envLogDir = Environment.GetEnvironmentVariable("JVEDIO_LOG_DIR");
    if (!string.IsNullOrWhiteSpace(envLogDir))
        return Path.Combine(envLogDir, "runtime");

    // Dev mode: walk up from AppContext.BaseDirectory to locate repo root
    // Worker exe lives at: {repo}/dotnet/Jvedio.Worker/bin/Release/net8.0/
    var baseDir = AppContext.BaseDirectory;
    var candidates = new[]
    {
        Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "..")),     // Worker: 5 levels up
        Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "..", "..")), // deeper
    };

    foreach (var candidate in candidates)
    {
        // Repo root contains dotnet/ and tauri/
        if (Directory.Exists(Path.Combine(candidate, "dotnet")) &&
            Directory.Exists(Path.Combine(candidate, "tauri")))
        {
            return Path.Combine(candidate, "log", "runtime");
        }
    }

    // Fallback: next to exe
    return Path.Combine(baseDir, "log", "runtime");
}

// ── Expose Program class for WebApplicationFactory<Program> in tests ──
public partial class Program { }
