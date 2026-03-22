namespace Jvedio.Contracts.Settings;

public sealed class RunMetaTubeDiagnosticsRequest
{
    public int? RequestTimeoutSeconds { get; set; }

    public string? ServerUrl { get; set; }
}
