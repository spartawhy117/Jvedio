namespace Jvedio.Contracts.Settings;

public sealed class RunMetaTubeDiagnosticsResponse
{
    public int ActorProviderCount { get; set; }

    public DateTimeOffset CompletedAtUtc { get; set; }

    public int MovieProviderCount { get; set; }

    public string ServerUrl { get; set; } = string.Empty;

    public List<string> Steps { get; set; } = new();

    public string Summary { get; set; } = string.Empty;

    public bool Success { get; set; }

    public int TimeoutSeconds { get; set; }
}
