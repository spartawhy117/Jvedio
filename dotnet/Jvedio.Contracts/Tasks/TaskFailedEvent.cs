namespace Jvedio.Contracts.Tasks;

public sealed class TaskFailedEvent
{
    public DateTimeOffset FailedAtUtc { get; set; }

    public WorkerTaskDto Task { get; set; } = new();
}
