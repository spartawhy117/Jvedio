namespace Jvedio.Worker.Hosting;

public sealed class WorkerRuntimeState
{
    public string BaseUrl { get; private set; } = string.Empty;

    public DateTimeOffset StartedAtUtc { get; private set; }

    public bool IsReady { get; private set; }

    public void MarkReady(string baseUrl)
    {
        BaseUrl = baseUrl;
        StartedAtUtc = DateTimeOffset.UtcNow;
        IsReady = true;
    }
}
