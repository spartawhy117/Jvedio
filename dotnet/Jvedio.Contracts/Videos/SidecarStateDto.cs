namespace Jvedio.Contracts.Videos;

public sealed class SidecarStateDto
{
    public bool HasMissingAssets { get; set; }

    public VideoAssetStateDto Fanart { get; set; } = new();

    public VideoAssetStateDto Nfo { get; set; } = new();

    public VideoAssetStateDto Poster { get; set; } = new();

    public VideoAssetStateDto Thumb { get; set; } = new();
}
