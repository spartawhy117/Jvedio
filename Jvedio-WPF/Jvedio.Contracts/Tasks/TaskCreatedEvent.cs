namespace Jvedio.Contracts.Tasks;

public sealed class TaskCreatedEvent
{
    public DateTimeOffset CreatedAtUtc { get; set; }

    public WorkerTaskDto Task { get; set; } = new();
}
