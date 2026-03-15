using Jvedio.Contracts.Videos;

namespace Jvedio.Contracts.Libraries;

public sealed class GetLibraryVideosResponse
{
    public IReadOnlyList<string> AvailableViewModes { get; set; } = new[] { "grid", "list" };

    public IReadOnlyList<VideoListItemDto> Items { get; set; } = Array.Empty<VideoListItemDto>();

    public int PageIndex { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }
}
