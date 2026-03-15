namespace Jvedio.Contracts.Tasks;

public sealed class GetTasksResponse
{
    public TaskSummaryDto Summary { get; set; } = new();
}
