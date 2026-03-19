namespace Jvedio.Contracts.Videos;

public sealed class GetVideoGroupsResponse
{
    public IReadOnlyList<VideoGroupListItemDto> Items { get; set; } = Array.Empty<VideoGroupListItemDto>();

    public int TotalCount { get; set; }
}
