using System.Net;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for the Videos API endpoints.
/// Verifies video listing, favorites, and batch operations.
/// </summary>
[TestClass]
public class VideosApiTests
{
    [TestMethod]
    public async Task GetFavorites_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/videos/favorites");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsTrue(root.GetProperty("success").GetBoolean());
        Assert.IsTrue(root.TryGetProperty("data", out var data));
        Assert.IsTrue(data.TryGetProperty("items", out _));
        Assert.IsTrue(data.TryGetProperty("totalCount", out _));
    }

    [TestMethod]
    public async Task GetCategories_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/videos/categories");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.IsTrue(doc.RootElement.GetProperty("success").GetBoolean());
    }

    [TestMethod]
    public async Task GetSeries_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/videos/series");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.IsTrue(doc.RootElement.GetProperty("success").GetBoolean());
    }

    [TestMethod]
    public async Task BatchFavorite_WithEmptyList_ReturnsSuccess()
    {
        var body = new StringContent(
            JsonSerializer.Serialize(new { videoIds = Array.Empty<string>() }),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await TestBootstrap.Client.PostAsync("/api/videos/batch/favorite?favorite=true", body);
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.IsTrue(doc.RootElement.GetProperty("success").GetBoolean());
    }

    // ── Phase 6.3: ScrapeStatus filtering tests ─────────────────

    /// <summary>
    /// GetLibraryVideosRequest should accept scrapeStatus filter parameter.
    /// </summary>
    [TestMethod]
    public void GetLibraryVideosRequest_HasScrapeStatusFilter()
    {
        var requestType = typeof(Jvedio.Contracts.Libraries.GetLibraryVideosRequest);
        var prop = requestType.GetProperty("ScrapeStatus");
        Assert.IsNotNull(prop, "GetLibraryVideosRequest should have a ScrapeStatus property");
        Assert.AreEqual(typeof(string), prop.PropertyType, "ScrapeStatus should be of type string");
    }

    /// <summary>
    /// VideoListItemDto.ScrapeStatus default value should be "none".
    /// </summary>
    [TestMethod]
    public void VideoListItemDto_ScrapeStatus_DefaultsToNone()
    {
        var dto = new Jvedio.Contracts.Videos.VideoListItemDto();
        Assert.AreEqual("none", dto.ScrapeStatus,
            "VideoListItemDto.ScrapeStatus should default to 'none'");
    }

    /// <summary>
    /// VideoDetailDto.ScrapeStatus default value should be "none".
    /// </summary>
    [TestMethod]
    public void VideoDetailDto_ScrapeStatus_DefaultsToNone()
    {
        var dto = new Jvedio.Contracts.Videos.VideoDetailDto();
        Assert.AreEqual("none", dto.ScrapeStatus,
            "VideoDetailDto.ScrapeStatus should default to 'none'");
    }
}
