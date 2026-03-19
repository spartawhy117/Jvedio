namespace Jvedio.Contracts.Tasks;

public sealed class RetryTaskResponse
{
    public DateTimeOffset AcceptedAtUtc { get; set; }

    public string RetriedFromTaskId { get; set; } = string.Empty;

    public WorkerTaskDto Task { get; set; } = new();
}
