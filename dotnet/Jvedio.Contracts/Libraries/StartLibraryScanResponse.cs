using Jvedio.Contracts.Tasks;

namespace Jvedio.Contracts.Libraries;

public sealed class StartLibraryScanResponse
{
    public DateTimeOffset AcceptedAtUtc { get; set; }

    public WorkerTaskDto Task { get; set; } = new();
}
