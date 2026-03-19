namespace Jvedio.Contracts.Libraries;

public sealed class DeleteLibraryResponse
{
    public string LibraryId { get; set; } = string.Empty;

    public DateTimeOffset DeletedAtUtc { get; set; }
}
