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
}
