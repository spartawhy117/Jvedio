namespace Jvedio.Contracts.Videos;

public sealed class GetFavoriteVideosResponse
{
    public IReadOnlyList<VideoListItemDto> Items { get; set; } = Array.Empty<VideoListItemDto>();

    public int PageIndex { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }
}
