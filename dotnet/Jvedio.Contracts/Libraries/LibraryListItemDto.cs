namespace Jvedio.Contracts.Libraries;

public sealed class LibraryListItemDto
{
    public string LibraryId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    public IReadOnlyList<string> ScanPaths { get; set; } = Array.Empty<string>();

    public int VideoCount { get; set; }

    public string? LastScanAt { get; set; }

    public string? LastScrapeAt { get; set; }

    public bool HasRunningTask { get; set; }
}
