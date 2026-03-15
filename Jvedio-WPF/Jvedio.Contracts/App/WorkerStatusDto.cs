namespace Jvedio.Contracts.App;

public sealed class WorkerStatusDto
{
    public string Status { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = string.Empty;

    public DateTimeOffset StartedAtUtc { get; set; }
}
