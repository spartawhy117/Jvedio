namespace Jvedio.Contracts.Libraries;

public sealed class UpdateLibraryResponse
{
    public LibraryListItemDto Library { get; set; } = new();

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
