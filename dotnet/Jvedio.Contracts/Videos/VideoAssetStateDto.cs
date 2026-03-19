namespace Jvedio.Contracts.Videos;

public sealed class VideoAssetStateDto
{
    public bool Exists { get; set; }

    public string Path { get; set; } = string.Empty;
}
