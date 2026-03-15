namespace Jvedio.Contracts.Tasks;

public sealed class TaskCreatedEvent
{
    public string TaskId { get; set; } = string.Empty;

    public string TaskType { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }
}
