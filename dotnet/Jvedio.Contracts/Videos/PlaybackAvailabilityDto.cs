namespace Jvedio.Contracts.Videos;

public sealed class PlaybackAvailabilityDto
{
    public bool CanPlay { get; set; }

    public string? PlayerPath { get; set; }

    public bool UsesSystemDefault { get; set; }
}
