namespace Jvedio.Contracts.Tasks;

public sealed class TaskFailedEvent
{
    public string TaskId { get; set; } = string.Empty;

    public string TaskType { get; set; } = string.Empty;

    public string ErrorMessage { get; set; } = string.Empty;

    public DateTimeOffset FailedAtUtc { get; set; }
}
