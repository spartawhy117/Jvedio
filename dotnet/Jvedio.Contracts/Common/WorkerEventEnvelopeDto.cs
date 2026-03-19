namespace Jvedio.Contracts.Common;

public sealed class WorkerEventEnvelopeDto
{
    public object? Data { get; set; }

    public string EventId { get; set; } = string.Empty;

    public string EventName { get; set; } = string.Empty;

    public DateTimeOffset OccurredAtUtc { get; set; }

    public string Topic { get; set; } = string.Empty;
}
