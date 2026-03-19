using Jvedio.Contracts.Tasks;

namespace Jvedio.Worker.Services;

public sealed class TaskSummarySnapshotService
{
    private readonly object gate = new();
    private TaskSummaryDto current = CreateDefault();

    public TaskSummaryChangedEvent CreateChangedEvent()
    {
        var summary = GetCurrent();
        return new TaskSummaryChangedEvent
        {
            OccurredAtUtc = summary.LastUpdatedUtc,
            Summary = summary,
        };
    }

    public TaskSummaryDto GetCurrent()
    {
        lock (gate)
        {
            return Clone(current);
        }
    }

    public TaskSummaryChangedEvent Touch()
    {
        lock (gate)
        {
            current.LastUpdatedUtc = DateTimeOffset.UtcNow;
            return new TaskSummaryChangedEvent
            {
                OccurredAtUtc = current.LastUpdatedUtc,
                Summary = Clone(current),
            };
        }
    }

    public void SetCurrent(TaskSummaryDto summary)
    {
        lock (gate)
        {
            current = Clone(summary ?? CreateDefault());
            if (current.LastUpdatedUtc == default)
            {
                current.LastUpdatedUtc = DateTimeOffset.UtcNow;
            }
        }
    }

    private static TaskSummaryDto Clone(TaskSummaryDto source)
    {
        return new TaskSummaryDto
        {
            CompletedTodayCount = source.CompletedTodayCount,
            FailedCount = source.FailedCount,
            LastUpdatedUtc = source.LastUpdatedUtc,
            QueuedCount = source.QueuedCount,
            RunningCount = source.RunningCount,
        };
    }

    private static TaskSummaryDto CreateDefault()
    {
        return new TaskSummaryDto
        {
            CompletedTodayCount = 0,
            FailedCount = 0,
            LastUpdatedUtc = DateTimeOffset.UtcNow,
            QueuedCount = 0,
            RunningCount = 0,
        };
    }
}
