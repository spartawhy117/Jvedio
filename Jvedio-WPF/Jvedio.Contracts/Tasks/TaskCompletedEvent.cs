namespace Jvedio.Contracts.Tasks;

public sealed class TaskCompletedEvent
{
    public string TaskId { get; set; } = string.Empty;

    public string TaskType { get; set; } = string.Empty;

    public DateTimeOffset CompletedAtUtc { get; set; }
}
