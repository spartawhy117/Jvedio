using System.Reflection;
using Jvedio.Worker.Services;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

/// <summary>
/// Tests for sidecar file path resolution logic.
/// Validates that NFO, poster, thumb, and fanart paths use VID as prefix
/// and fall back to filename when VID is missing.
/// Covers both LibraryScrapeService (write paths) and VideoService (read paths).
/// </summary>
[TestClass]
public class SidecarPathTests
{
    // LibraryScrapeService sidecar path methods (used when writing sidecar files during scraping)
    private static readonly MethodInfo GetMovieNfoPathMethod =
        typeof(LibraryScrapeService).GetMethod("GetMovieNfoPath", BindingFlags.NonPublic | BindingFlags.Static)!;

    private static readonly MethodInfo GetPosterPathMethod =
        typeof(LibraryScrapeService).GetMethod("GetPosterPath", BindingFlags.NonPublic | BindingFlags.Static)!;

    private static readonly MethodInfo GetThumbPathMethod =
        typeof(LibraryScrapeService).GetMethod("GetThumbPath", BindingFlags.NonPublic | BindingFlags.Static)!;

    private static readonly MethodInfo GetFanartPathMethod =
        typeof(LibraryScrapeService).GetMethod("GetFanartPath", BindingFlags.NonPublic | BindingFlags.Static)!;

    // VideoService sidecar path methods (used when reading/checking sidecar files)
    private static readonly MethodInfo NormalizeSidecarPrefixMethod =
        typeof(VideoService).GetMethod("NormalizeSidecarPrefix", BindingFlags.NonPublic | BindingFlags.Static)!;

    [TestMethod]
    public void ScrapeService_SidecarPaths_UseVidPrefix()
    {
        var videoPath = Path.Combine("C:", "videos", "ABP-001", "ABP-001.mp4");
        var vid = "ABP-001";
        var directory = Path.GetDirectoryName(videoPath)!;

        Assert.AreEqual(
            Path.Combine(directory, "ABP-001.nfo"),
            (string)GetMovieNfoPathMethod.Invoke(null, [videoPath, vid])!);

        Assert.AreEqual(
            Path.Combine(directory, "ABP-001-poster.jpg"),
            (string)GetPosterPathMethod.Invoke(null, [videoPath, vid])!);

        Assert.AreEqual(
            Path.Combine(directory, "ABP-001-thumb.jpg"),
            (string)GetThumbPathMethod.Invoke(null, [videoPath, vid])!);

        Assert.AreEqual(
            Path.Combine(directory, "ABP-001-fanart.jpg"),
            (string)GetFanartPathMethod.Invoke(null, [videoPath, vid])!);
    }

    [TestMethod]
    public void VideoService_NormalizeSidecarPrefix_UsesVidWhenPresent()
    {
        var videoPath = Path.Combine("C:", "videos", "ABP-001.mp4");
        var result = (string)NormalizeSidecarPrefixMethod.Invoke(null, [videoPath, "ABP-001"])!;
        Assert.AreEqual("ABP-001", result);
    }

    [TestMethod]
    public void VideoService_NormalizeSidecarPrefix_FallsBackToFileName()
    {
        var videoPath = Path.Combine("C:", "videos", "some-movie.mp4");
        var result = (string)NormalizeSidecarPrefixMethod.Invoke(null, [videoPath, ""])!;
        Assert.AreEqual("some-movie", result);
    }

    [TestMethod]
    public void VideoService_NormalizeSidecarPrefix_NullVid_FallsBackToFileName()
    {
        var videoPath = Path.Combine("C:", "videos", "another-movie.mp4");
        var result = (string)NormalizeSidecarPrefixMethod.Invoke(null, [videoPath, "  "])!;
        Assert.AreEqual("another-movie", result);
    }

    [TestMethod]
    public void VideoService_NormalizeSidecarPrefix_EmptyBoth_ReturnsFallback()
    {
        // Edge case: both vid and filename are empty-ish
        var videoPath = Path.Combine("C:", "videos", ".mp4");
        var result = (string)NormalizeSidecarPrefixMethod.Invoke(null, [videoPath, ""])!;
        // Should return "video" as the ultimate fallback
        Assert.AreEqual("video", result);
    }

    [TestMethod]
    public void ScrapeService_SidecarPaths_ConsistentWithVideoService()
    {
        // Verify that the sidecar paths from LibraryScrapeService (write)
        // match the pattern used by VideoService (read)
        var videoPath = Path.Combine("C:", "videos", "STARS-123", "STARS-123.mp4");
        var vid = "STARS-123";
        var directory = Path.GetDirectoryName(videoPath)!;

        // The prefix from VideoService should match what ScrapeService uses
        var prefix = (string)NormalizeSidecarPrefixMethod.Invoke(null, [videoPath, vid])!;
        Assert.AreEqual(vid, prefix);

        // Build the expected paths the same way VideoService.BuildAssetPath does
        var expectedNfo = Path.Combine(directory, $"{prefix}.nfo");
        var expectedPoster = Path.Combine(directory, $"{prefix}-poster.jpg");
        var expectedThumb = Path.Combine(directory, $"{prefix}-thumb.jpg");
        var expectedFanart = Path.Combine(directory, $"{prefix}-fanart.jpg");

        // These should match what ScrapeService generates
        Assert.AreEqual(expectedNfo, (string)GetMovieNfoPathMethod.Invoke(null, [videoPath, vid])!);
        Assert.AreEqual(expectedPoster, (string)GetPosterPathMethod.Invoke(null, [videoPath, vid])!);
        Assert.AreEqual(expectedThumb, (string)GetThumbPathMethod.Invoke(null, [videoPath, vid])!);
        Assert.AreEqual(expectedFanart, (string)GetFanartPathMethod.Invoke(null, [videoPath, vid])!);
    }
}
