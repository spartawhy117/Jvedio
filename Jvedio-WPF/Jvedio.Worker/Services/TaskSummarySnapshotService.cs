using Jvedio.Contracts.Tasks;

namespace Jvedio.Worker.Services;

public sealed class TaskSummarySnapshotService
{
    public TaskSummaryDto GetCurrent()
    {
        return new TaskSummaryDto
        {
            RunningCount = 0,
            QueuedCount = 0,
            FailedCount = 0,
            CompletedTodayCount = 0,
            LastUpdatedUtc = DateTimeOffset.UtcNow,
        };
    }
}
