namespace Jvedio.Contracts.Tasks;

public sealed class GetTasksResponse
{
    public TaskSummaryDto Summary { get; set; } = new();

    public IReadOnlyList<WorkerTaskDto> Tasks { get; set; } = Array.Empty<WorkerTaskDto>();
}
