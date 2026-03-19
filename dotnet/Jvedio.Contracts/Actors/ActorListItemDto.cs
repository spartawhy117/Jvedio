namespace Jvedio.Contracts.Actors;

public sealed class ActorListItemDto
{
    public string ActorId { get; set; } = string.Empty;

    public string? AvatarPath { get; set; }

    public int LibraryCount { get; set; }

    public string? LastPlayedAt { get; set; }

    public string? LastScanAt { get; set; }

    public string Name { get; set; } = string.Empty;

    public int VideoCount { get; set; }

    public string WebType { get; set; } = string.Empty;

    public string WebUrl { get; set; } = string.Empty;
}
