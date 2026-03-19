using Jvedio.Contracts.Libraries;
using Jvedio.Contracts.Tasks;

namespace Jvedio.Contracts.App;

public sealed class GetBootstrapResponse
{
    public AppInfoDto App { get; set; } = new();

    public ShellBootstrapDto Shell { get; set; } = new();

    public IReadOnlyList<LibraryListItemDto> Libraries { get; set; } = Array.Empty<LibraryListItemDto>();

    public TaskSummaryDto TaskSummary { get; set; } = new();

    public WorkerStatusDto Worker { get; set; } = new();
}
