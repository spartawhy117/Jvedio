namespace Jvedio.Contracts.Libraries;

public sealed class StartLibraryScanRequest
{
    public bool ForceRescan { get; set; }

    public bool OrganizeBeforeScan { get; set; } = true;

    public IReadOnlyList<string> Paths { get; set; } = Array.Empty<string>();
}
