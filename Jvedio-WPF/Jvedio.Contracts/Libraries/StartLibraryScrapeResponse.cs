using Jvedio.Contracts.Tasks;

namespace Jvedio.Contracts.Libraries;

public sealed class StartLibraryScrapeResponse
{
    public DateTimeOffset AcceptedAtUtc { get; set; }

    public WorkerTaskDto Task { get; set; } = new();
}
