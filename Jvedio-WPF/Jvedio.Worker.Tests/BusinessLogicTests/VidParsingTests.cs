using System.Reflection;
using Jvedio.Worker.Services;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

/// <summary>
/// Tests for VID (Video ID) parsing logic in LibraryScanService.
/// Validates ExtractVideoId correctly extracts standard VIDs, FC2 numbers,
/// suffix variants, and edge cases from file names.
/// </summary>
[TestClass]
public class VidParsingTests
{
    private static readonly MethodInfo ExtractVideoIdMethod =
        typeof(LibraryScanService).GetMethod("ExtractVideoId", BindingFlags.NonPublic | BindingFlags.Static)
        ?? throw new InvalidOperationException("ExtractVideoId method not found via reflection.");

    private static string ExtractVideoId(string filePath)
    {
        return (string)ExtractVideoIdMethod.Invoke(null, [filePath])!;
    }

    [TestMethod]
    [DataRow("ABP-001.mp4", "ABP-001", "标准 VID（字母-数字）")]
    [DataRow("STARS-123.mkv", "STARS-123", "4+ 字母前缀")]
    [DataRow("SSIS-456.avi", "SSIS-456", "4 字母前缀")]
    [DataRow("IPX-789.mp4", "IPX-789", "3 字母前缀")]
    public void ExtractVideoId_StandardVids(string fileName, string expectedVid, string description)
    {
        Assert.AreEqual(expectedVid, ExtractVideoId(fileName), description);
    }

    [TestMethod]
    [DataRow("FC2-PPV-1234567.mp4", "FC2-PPV-1234567", "FC2 标准格式")]
    [DataRow("fc2ppv1234567.mp4", "FC2-PPV-1234567", "FC2 无分隔符")]
    [DataRow("FC2_PPV_1234567.mp4", "FC2-PPV-1234567", "FC2 下划线分隔")]
    [DataRow("FC2 PPV 1234567.mp4", "FC2-PPV-1234567", "FC2 空格分隔")]
    public void ExtractVideoId_Fc2Variants(string fileName, string expectedVid, string description)
    {
        Assert.AreEqual(expectedVid, ExtractVideoId(fileName), description);
    }

    [TestMethod]
    [DataRow("ABP-001-A.mp4", "ABP-001-A", "带后缀 A")]
    [DataRow("STARS-123-B.mkv", "STARS-123-B", "带后缀 B")]
    [DataRow("SSIS-456_C.avi", "SSIS-456-C", "下划线后缀")]
    public void ExtractVideoId_WithSuffix(string fileName, string expectedVid, string description)
    {
        Assert.AreEqual(expectedVid, ExtractVideoId(fileName), description);
    }

    [TestMethod]
    [DataRow("abp-001.mp4", "ABP-001", "小写输入应转为大写")]
    [DataRow("AbP-001.mp4", "ABP-001", "混合大小写")]
    public void ExtractVideoId_CaseInsensitive(string fileName, string expectedVid, string description)
    {
        Assert.AreEqual(expectedVid, ExtractVideoId(fileName), description);
    }

    [TestMethod]
    [DataRow("ABP001.mp4", "ABP-001", "无分隔符")]
    [DataRow("ABP_001.mp4", "ABP-001", "下划线分隔")]
    [DataRow("ABP 001.mp4", "ABP-001", "空格分隔")]
    public void ExtractVideoId_NoHyphenSeparator(string fileName, string expectedVid, string description)
    {
        Assert.AreEqual(expectedVid, ExtractVideoId(fileName), description);
    }

    [TestMethod]
    public void ExtractVideoId_NoMatch_ReturnsEmpty()
    {
        // Pure number, no alphabetic prefix
        Assert.AreEqual(string.Empty, ExtractVideoId("12345.mp4"));
    }

    [TestMethod]
    public void ExtractVideoId_SingleCharPrefix_ReturnsEmpty()
    {
        // Prefix must be 2-10 chars
        Assert.AreEqual(string.Empty, ExtractVideoId("A-001.mp4"));
    }
}
