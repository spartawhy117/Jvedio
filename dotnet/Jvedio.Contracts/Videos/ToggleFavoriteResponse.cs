namespace Jvedio.Contracts.Videos;

public sealed class ToggleFavoriteResponse
{
    public string VideoId { get; set; } = string.Empty;

    public bool IsFavorite { get; set; }

    public int FavoriteCount { get; set; }
}
