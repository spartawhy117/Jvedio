namespace Jvedio.Contracts.Videos;

public sealed class PlayVideoResponse
{
    public bool Played { get; set; }

    public string PlayerUsed { get; set; } = string.Empty;
}
