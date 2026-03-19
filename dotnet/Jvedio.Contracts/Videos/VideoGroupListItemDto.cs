namespace Jvedio.Contracts.Videos;

public sealed class VideoGroupListItemDto
{
    public string LastPlayedAt { get; set; } = string.Empty;

    public string LastScanAt { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int VideoCount { get; set; }
}
