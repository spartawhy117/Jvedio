namespace Jvedio.Contracts.Settings;

public sealed class RunMetaTubeDiagnosticsResponse
{
    public int ActorProviderCount { get; set; }

    public DateTimeOffset CompletedAtUtc { get; set; }

    public string DetailTitle { get; set; } = string.Empty;

    public string MatchedMovieId { get; set; } = string.Empty;

    public string MatchedProvider { get; set; } = string.Empty;

    public int MovieProviderCount { get; set; }

    public int SearchResultCount { get; set; }

    public string ServerUrl { get; set; } = string.Empty;

    public List<string> Steps { get; set; } = new();

    public string Summary { get; set; } = string.Empty;

    public bool Success { get; set; }

    public string TestVideoId { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; }
}
