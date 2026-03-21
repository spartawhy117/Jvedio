using System.Reflection;
using Jvedio.Worker.Services;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

/// <summary>
/// Tests for library scan organize logic in LibraryScanService.
/// Validates TryOrganize correctly:
/// - Creates VID-named subdirectories and moves video files
/// - Falls back to filename when VID is empty
/// - Handles file conflicts gracefully
/// - Moves matching subtitle files alongside the video
/// </summary>
[TestClass]
public class ScanOrganizeTests
{
    private static readonly MethodInfo TryOrganizeMethod =
        typeof(LibraryScanService).GetMethod("TryOrganize", BindingFlags.NonPublic | BindingFlags.Static)!;

    private string testRoot = string.Empty;

    [TestInitialize]
    public void Setup()
    {
        testRoot = Path.Combine(Path.GetTempPath(), $"jvedio-organize-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(testRoot);
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (Directory.Exists(testRoot))
        {
            try { Directory.Delete(testRoot, recursive: true); }
            catch { /* best effort */ }
        }
    }

    /// <summary>
    /// When a flat directory contains multiple video files and we organize one with a VID,
    /// it should be moved to a VID-named subdirectory.
    /// </summary>
    [TestMethod]
    public void TryOrganize_MovesVideoToVidSubdirectory()
    {
        // Create two video files in root (triggers organize since videoCount > 1)
        var videoPath = Path.Combine(testRoot, "ABP-001.mp4");
        File.WriteAllText(videoPath, "dummy");
        File.WriteAllText(Path.Combine(testRoot, "STARS-123.mp4"), "dummy2");

        var result = InvokeTryOrganize(videoPath, "ABP-001");

        Assert.IsTrue(GetResultSuccess(result), "Organize should succeed");
        Assert.IsTrue(GetResultOrganized(result), "File should be organized");

        var expectedTarget = Path.Combine(testRoot, "ABP-001", "ABP-001.mp4");
        Assert.AreEqual(expectedTarget, GetResultTargetVideoPath(result));
        Assert.IsTrue(File.Exists(expectedTarget), "Video file should exist at target path");
        Assert.IsFalse(File.Exists(videoPath), "Original file should no longer exist");
    }

    /// <summary>
    /// When VID is empty, the organize should use the filename (without extension) as folder name.
    /// </summary>
    [TestMethod]
    public void TryOrganize_FallsBackToFileName_WhenVidEmpty()
    {
        var videoPath = Path.Combine(testRoot, "unknown-movie.mp4");
        File.WriteAllText(videoPath, "dummy");
        File.WriteAllText(Path.Combine(testRoot, "other-video.mp4"), "dummy2");

        var result = InvokeTryOrganize(videoPath, "");

        Assert.IsTrue(GetResultSuccess(result));
        Assert.IsTrue(GetResultOrganized(result));

        var expectedDir = Path.Combine(testRoot, "unknown-movie");
        Assert.AreEqual(expectedDir, GetResultTargetDirectory(result));
        Assert.IsTrue(Directory.Exists(expectedDir), "Target directory should be created with filename");
    }

    /// <summary>
    /// When target directory already has a file with the same name, organize should fail gracefully.
    /// </summary>
    [TestMethod]
    public void TryOrganize_FailsGracefully_WhenTargetFileExists()
    {
        var videoPath = Path.Combine(testRoot, "ABP-001.mp4");
        File.WriteAllText(videoPath, "source");
        File.WriteAllText(Path.Combine(testRoot, "other.mp4"), "dummy2");

        // Pre-create the target directory with a conflicting file
        var targetDir = Path.Combine(testRoot, "ABP-001");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, "ABP-001.mp4"), "existing");

        var result = InvokeTryOrganize(videoPath, "ABP-001");

        Assert.IsFalse(GetResultSuccess(result), "Organize should fail when target exists");
        Assert.IsTrue(File.Exists(videoPath), "Source file should remain untouched");
    }

    /// <summary>
    /// When a single video is the only file in its parent directory
    /// and the parent directory is already named after the VID,
    /// TryOrganize still sees parentDir != targetDir (since targetDir = parentDir/VID).
    /// The key skip condition is: videoCount ≤ 1 AND parentDir path == targetDir path.
    /// This only matches when the video is literally in a directory with VID name
    /// AND there's no deeper subfolder creation needed.
    /// In practice, the skip fires only when the *parent directory name* already equals the VID folder name.
    /// </summary>
    [TestMethod]
    public void TryOrganize_SingleFileNonVidDir_StillOrganizes()
    {
        // A single video in a generic dir still gets organized into VID subfolder
        var videoPath = Path.Combine(testRoot, "ABP-001.mp4");
        File.WriteAllText(videoPath, "dummy");
        // Only one video → videoCount = 1, but parentDir (testRoot) ≠ targetDir (testRoot/ABP-001)
        // So it will still organize

        var result = InvokeTryOrganize(videoPath, "ABP-001");

        Assert.IsTrue(GetResultSuccess(result));
        Assert.IsTrue(GetResultOrganized(result), "Single file in non-VID dir should be organized");
        Assert.IsTrue(File.Exists(Path.Combine(testRoot, "ABP-001", "ABP-001.mp4")));
    }

    /// <summary>
    /// Subtitle files matching the video filename should be moved along with the video.
    /// </summary>
    [TestMethod]
    public void TryOrganize_MovesMatchingSubtitles()
    {
        var videoPath = Path.Combine(testRoot, "ABP-001.mp4");
        File.WriteAllText(videoPath, "dummy");
        File.WriteAllText(Path.Combine(testRoot, "other.mp4"), "dummy2");

        // Create matching subtitle files
        var srtPath = Path.Combine(testRoot, "ABP-001.srt");
        var assPath = Path.Combine(testRoot, "ABP-001.ass");
        File.WriteAllText(srtPath, "subtitle srt");
        File.WriteAllText(assPath, "subtitle ass");

        var result = InvokeTryOrganize(videoPath, "ABP-001");

        Assert.IsTrue(GetResultSuccess(result));
        Assert.IsTrue(GetResultOrganized(result));

        var targetDir = Path.Combine(testRoot, "ABP-001");
        Assert.IsTrue(File.Exists(Path.Combine(targetDir, "ABP-001.srt")), "SRT subtitle should be moved");
        Assert.IsTrue(File.Exists(Path.Combine(targetDir, "ABP-001.ass")), "ASS subtitle should be moved");
    }

    /// <summary>
    /// When the video already lives inside a directory whose name matches the VID,
    /// organize should treat it as already organized and must not create a nested VID\VID folder.
    /// </summary>
    [TestMethod]
    public void TryOrganize_AlreadyInVidDirectory_DoesNotCreateNestedDirectory()
    {
        var organizedDir = Path.Combine(testRoot, "ABP-001");
        Directory.CreateDirectory(organizedDir);
        var videoPath = Path.Combine(organizedDir, "ABP-001.mp4");
        File.WriteAllText(videoPath, "dummy");

        var result = InvokeTryOrganize(videoPath, "ABP-001");

        Assert.IsTrue(GetResultSuccess(result), "Organize should succeed");
        Assert.IsFalse(GetResultOrganized(result), "Already organized video should not be moved again");
        Assert.AreEqual(organizedDir, GetResultTargetDirectory(result));
        Assert.AreEqual(videoPath, GetResultTargetVideoPath(result));
        Assert.IsFalse(Directory.Exists(Path.Combine(organizedDir, "ABP-001")),
            "Organize should not create a nested VID directory");
    }

    #region Reflection Helpers

    private static object InvokeTryOrganize(string sourcePath, string vid)
    {
        return TryOrganizeMethod.Invoke(null, [sourcePath, vid])!;
    }

    private static bool GetResultSuccess(object result)
    {
        return (bool)result.GetType().GetProperty("Success")!.GetValue(result)!;
    }

    private static bool GetResultOrganized(object result)
    {
        return (bool)result.GetType().GetProperty("Organized")!.GetValue(result)!;
    }

    private static string GetResultTargetVideoPath(object result)
    {
        return (string)result.GetType().GetProperty("TargetVideoPath")!.GetValue(result)!;
    }

    private static string GetResultTargetDirectory(object result)
    {
        return (string)result.GetType().GetProperty("TargetDirectory")!.GetValue(result)!;
    }

    #endregion
}
