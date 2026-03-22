namespace Jvedio.Contracts.Videos;

public sealed class VideoDetailDto
{
    public IReadOnlyList<VideoActorDto> Actors { get; set; } = Array.Empty<VideoActorDto>();

    public string Director { get; set; } = string.Empty;

    public string DisplayTitle { get; set; } = string.Empty;

    public int DurationSeconds { get; set; }

    public string? FirstAddedAt { get; set; }

    public bool IsFavorite { get; set; }

    public string LibraryId { get; set; } = string.Empty;

    public string LibraryName { get; set; } = string.Empty;

    public string? LastPlayedAt { get; set; }

    public string? LastScanAt { get; set; }

    public string Outline { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    public PlaybackAvailabilityDto Playback { get; set; } = new();

    public string Plot { get; set; } = string.Empty;

    public string? ReleaseDate { get; set; }

    public double Rating { get; set; }

    public string ScrapeStatus { get; set; } = "none";

    public string Series { get; set; } = string.Empty;

    public SidecarStateDto Sidecars { get; set; } = new();

    public string Studio { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Vid { get; set; } = string.Empty;

    public string VideoId { get; set; } = string.Empty;

    public int ViewCount { get; set; }

    public string WebUrl { get; set; } = string.Empty;
}
