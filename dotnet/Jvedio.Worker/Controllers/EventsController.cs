using System.Text.Json;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Tasks;
using Jvedio.Worker.Hosting;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/events")]
public sealed class EventsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task GetEvents(
        [FromQuery] string? topic,
        [FromServices] TaskSummarySnapshotService taskSummarySnapshotService,
        [FromServices] WorkerEventStreamBroker workerEventStreamBroker,
        [FromServices] WorkerRuntimeState workerRuntimeState,
        CancellationToken cancellationToken)
    {
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");
        Response.ContentType = "text/event-stream; charset=utf-8";

        var workerReadyEvent = workerEventStreamBroker.CreateEnvelope(
            "worker.ready",
            "worker",
            new
            {
                baseUrl = workerRuntimeState.BaseUrl,
                occurredAtUtc = workerRuntimeState.StartedAtUtc,
                status = workerRuntimeState.IsReady ? "ready" : "starting",
            });
        await WriteEventAsync(workerReadyEvent, cancellationToken);

        var initialTaskSummaryEvent = workerEventStreamBroker.CreateEnvelope(
            "task.summary.changed",
            "tasks",
            taskSummarySnapshotService.CreateChangedEvent());
        await WriteEventAsync(initialTaskSummaryEvent, cancellationToken);

        using var subscription = workerEventStreamBroker.Subscribe();
        await foreach (var envelope in subscription.Reader.ReadAllAsync(cancellationToken))
        {
            if (!ShouldEmitEvent(topic, envelope))
            {
                continue;
            }

            await WriteEventAsync(envelope, cancellationToken);
        }
    }

    private static bool ShouldEmitEvent(string? requestedTopic, WorkerEventEnvelopeDto envelope)
    {
        if (string.IsNullOrWhiteSpace(requestedTopic))
        {
            return true;
        }

        return string.Equals(requestedTopic, envelope.Topic, StringComparison.OrdinalIgnoreCase)
            || string.Equals(requestedTopic, envelope.EventName, StringComparison.OrdinalIgnoreCase);
    }

    private async Task WriteEventAsync(WorkerEventEnvelopeDto envelope, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(envelope, JsonSerializerOptions);
        await Response.WriteAsync($"id: {envelope.EventId}\n", cancellationToken);
        await Response.WriteAsync($"event: {envelope.EventName}\n", cancellationToken);
        await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
