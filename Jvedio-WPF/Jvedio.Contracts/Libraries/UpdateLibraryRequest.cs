namespace Jvedio.Contracts.Libraries;

public sealed class UpdateLibraryRequest
{
    public string? Name { get; set; }

    public IReadOnlyList<string> ScanPaths { get; set; } = Array.Empty<string>();
}
