namespace Jvedio.Contracts.Tasks;

public sealed class TaskCompletedEvent
{
    public DateTimeOffset CompletedAtUtc { get; set; }

    public WorkerTaskDto Task { get; set; } = new();
}
