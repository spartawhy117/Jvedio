namespace Jvedio.Contracts.Videos;

public sealed class PlayVideoResponse
{
    public DateTimeOffset LaunchedAtUtc { get; set; }

    public string? LastPlayedAt { get; set; }

    public string? UsedPlayerPath { get; set; }

    public bool UsedSystemDefault { get; set; }

    public string VideoId { get; set; } = string.Empty;
}
