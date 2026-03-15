using Jvedio.Contracts.Tasks;

namespace Jvedio.Worker.Services;

public sealed class TaskSummarySnapshotService
{
    public TaskSummaryDto GetCurrent()
    {
        return new TaskSummaryDto
        {
            LastUpdatedUtc = DateTimeOffset.UtcNow,
        };
    }
}
