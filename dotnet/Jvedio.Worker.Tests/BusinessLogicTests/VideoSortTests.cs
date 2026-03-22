using System.Reflection;

using Jvedio.Contracts.Videos;
using Jvedio.Worker.Services;

using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

[TestClass]
public class VideoSortTests
{
    [TestMethod]
    public void SortVideos_ImportTimeDesc_UsesFirstAddedAt()
    {
        var videos = new List<VideoListItemDto>
        {
            new()
            {
                VideoId = "1",
                Vid = "AAA-001",
                DisplayTitle = "First",
                FirstAddedAt = "2026-03-20 10:00:00",
                LastScanAt = "2026-03-10 10:00:00",
            },
            new()
            {
                VideoId = "2",
                Vid = "AAA-002",
                DisplayTitle = "Second",
                FirstAddedAt = "2026-03-21 10:00:00",
                LastScanAt = "2026-03-09 10:00:00",
            },
        };

        var sorted = InvokeSortVideos(videos, "importTime", "desc");

        Assert.AreEqual("2", sorted[0].VideoId);
        Assert.AreEqual("1", sorted[1].VideoId);
    }

    private static IReadOnlyList<VideoListItemDto> InvokeSortVideos(
        IReadOnlyList<VideoListItemDto> videos,
        string sortBy,
        string sortOrder)
    {
        var method = typeof(VideoService).GetMethod(
            "SortVideos",
            BindingFlags.NonPublic | BindingFlags.Static);

        Assert.IsNotNull(method, "VideoService.SortVideos should exist");

        var result = method.Invoke(null, new object?[] { videos, sortBy, sortOrder });
        Assert.IsNotNull(result);
        return (IReadOnlyList<VideoListItemDto>)result;
    }
}
