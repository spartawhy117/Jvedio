namespace Jvedio.Contracts.Libraries;

public sealed class LibraryChangedEvent
{
    public string Action { get; set; } = string.Empty;

    public LibraryListItemDto Library { get; set; } = new();

    public DateTimeOffset OccurredAtUtc { get; set; }
}
