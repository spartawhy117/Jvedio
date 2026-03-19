namespace Jvedio.Contracts.Videos;

public sealed class PlayVideoRequest
{
    public string PlayerProfile { get; set; } = "default";

    public bool Resume { get; set; } = true;
}
