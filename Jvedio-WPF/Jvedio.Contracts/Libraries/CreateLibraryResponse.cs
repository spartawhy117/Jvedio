namespace Jvedio.Contracts.Libraries;

public sealed class CreateLibraryResponse
{
    public LibraryListItemDto Library { get; set; } = new();

    public DateTimeOffset CreatedAtUtc { get; set; }
}
