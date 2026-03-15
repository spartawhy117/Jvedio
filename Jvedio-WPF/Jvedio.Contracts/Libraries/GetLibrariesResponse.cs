namespace Jvedio.Contracts.Libraries;

public sealed class GetLibrariesResponse
{
    public IReadOnlyList<LibraryListItemDto> Libraries { get; set; } = Array.Empty<LibraryListItemDto>();

    public int TotalCount { get; set; }
}
