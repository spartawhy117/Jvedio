namespace Jvedio.Contracts.Libraries;

public sealed class StartLibraryScrapeRequest
{
    public bool DownloadActorAvatars { get; set; } = true;

    public bool ForceRefreshMetadata { get; set; }

    public string Mode { get; set; } = "missing-only";

    public IReadOnlyList<string> VideoIds { get; set; } = Array.Empty<string>();

    public bool WriteSidecars { get; set; } = true;
}
