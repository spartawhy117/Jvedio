namespace Jvedio.Contracts.Actors;

public sealed class ActorDetailDto
{
    public string ActorId { get; set; } = string.Empty;

    public string? AvatarPath { get; set; }

    public int LibraryCount { get; set; }

    public IReadOnlyList<string> LibraryIds { get; set; } = Array.Empty<string>();

    public IReadOnlyList<string> LibraryNames { get; set; } = Array.Empty<string>();

    public string? LastPlayedAt { get; set; }

    public string? LastScanAt { get; set; }

    public string Name { get; set; } = string.Empty;

    public int VideoCount { get; set; }

    public string WebType { get; set; } = string.Empty;

    public string WebUrl { get; set; } = string.Empty;
}
