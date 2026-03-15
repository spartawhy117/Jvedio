namespace Jvedio.Contracts.Tasks;

public sealed class TaskSummaryDto
{
    public int RunningCount { get; set; }

    public int QueuedCount { get; set; }

    public int FailedCount { get; set; }

    public int CompletedTodayCount { get; set; }

    public DateTimeOffset LastUpdatedUtc { get; set; }
}
