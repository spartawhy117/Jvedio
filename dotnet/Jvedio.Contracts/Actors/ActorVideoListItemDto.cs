namespace Jvedio.Contracts.Actors;

public sealed class ActorVideoListItemDto
{
    public string DisplayTitle { get; set; } = string.Empty;

    public int DurationSeconds { get; set; }

    public bool HasFanart { get; set; }

    public bool HasMissingAssets { get; set; }

    public bool HasNfo { get; set; }

    public bool HasPoster { get; set; }

    public bool HasThumb { get; set; }

    public string? FirstAddedAt { get; set; }

    public string LibraryId { get; set; } = string.Empty;

    public string LibraryName { get; set; } = string.Empty;

    public string? LastPlayedAt { get; set; }

    public string? LastScanAt { get; set; }

    public string Path { get; set; } = string.Empty;

    public double Rating { get; set; }

    public string? ReleaseDate { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Vid { get; set; } = string.Empty;

    public string VideoId { get; set; } = string.Empty;

    public int ViewCount { get; set; }
}
