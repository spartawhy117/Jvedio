namespace Jvedio.Contracts.Tasks;

public sealed class TaskProgressEvent
{
    public DateTimeOffset OccurredAtUtc { get; set; }

    public WorkerTaskDto Task { get; set; } = new();
}
