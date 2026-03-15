using Jvedio.Worker.Hosting;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Hosting;

var builder = WebApplication.CreateBuilder(args);

if (string.IsNullOrWhiteSpace(builder.Configuration[WebHostDefaults.ServerUrlsKey]))
{
    builder.WebHost.UseUrls("http://127.0.0.1:0");
}

builder.Services.AddControllers();
builder.Services.AddSingleton<WorkerRuntimeState>();
builder.Services.AddSingleton<TaskSummarySnapshotService>();
builder.Services.AddHostedService<WorkerReadySignalHostedService>();

var app = builder.Build();

app.MapControllers();
app.MapGet("/", () => Results.Ok(new
{
    stage = "C-1",
    service = "Jvedio.Worker",
    status = "skeleton-ready",
}));

app.Run();
