using System.Reflection;

using Jvedio.Worker.Services;

using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

[TestClass]
public class VideoPlayLaunchTests
{
    private static readonly MethodInfo CanTreatNullProcessAsShellHandoffSuccessMethod =
        typeof(VideoService).GetMethod("CanTreatNullProcessAsShellHandoffSuccess", BindingFlags.NonPublic | BindingFlags.Static)!;

    private string testRoot = string.Empty;

    [TestInitialize]
    public void Setup()
    {
        testRoot = Path.Combine(Path.GetTempPath(), $"jvedio-video-play-launch-{Guid.NewGuid():N}");
        Directory.CreateDirectory(testRoot);
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (Directory.Exists(testRoot))
        {
            try
            {
                Directory.Delete(testRoot, recursive: true);
            }
            catch
            {
                // Best effort cleanup only.
            }
        }
    }

    [TestMethod]
    public void CanTreatNullProcessAsShellHandoffSuccess_AllowsMediaFileWithShellExecute()
    {
        var mediaFilePath = Path.Combine(testRoot, "IPZZ-753.mp4");
        File.WriteAllBytes(mediaFilePath, [1, 2, 3]);

        var result = InvokeCanTreatNullProcessAsShellHandoffSuccess(mediaFilePath, null, true);

        Assert.IsTrue(result, "Media files opened through shell execute should accept a null process handle as a successful handoff.");
    }

    [TestMethod]
    public void CanTreatNullProcessAsShellHandoffSuccess_RejectsExecutableFile()
    {
        var executablePath = Path.Combine(testRoot, "player.exe");
        File.WriteAllBytes(executablePath, [1, 2, 3]);

        var result = InvokeCanTreatNullProcessAsShellHandoffSuccess(executablePath, null, true);

        Assert.IsFalse(result, "Direct executable launches should not silently treat a null process handle as success.");
    }

    [TestMethod]
    public void CanTreatNullProcessAsShellHandoffSuccess_RejectsWhenArgumentsArePresent()
    {
        var mediaFilePath = Path.Combine(testRoot, "IPZZ-753.mp4");
        File.WriteAllBytes(mediaFilePath, [1, 2, 3]);

        var result = InvokeCanTreatNullProcessAsShellHandoffSuccess(mediaFilePath, "\"D:\\video.mp4\"", true);

        Assert.IsFalse(result, "Configured player launches with explicit arguments should still require a real process handle.");
    }

    private static bool InvokeCanTreatNullProcessAsShellHandoffSuccess(string fileName, string? arguments, bool useShellExecute)
    {
        return (bool)CanTreatNullProcessAsShellHandoffSuccessMethod.Invoke(null, [fileName, arguments, useShellExecute])!;
    }
}
