namespace Jvedio.Contracts.Tasks;

public sealed class TaskSummaryChangedEvent
{
    public DateTimeOffset OccurredAtUtc { get; set; }

    public TaskSummaryDto Summary { get; set; } = new();
}
