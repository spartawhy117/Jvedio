namespace Jvedio.Contracts.Libraries;

public sealed class LibraryListItemDto
{
    public string LibraryId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    public int VideoCount { get; set; }
}
