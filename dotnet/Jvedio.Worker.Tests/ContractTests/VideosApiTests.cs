using System.Net;
using System.Text;
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

    [TestMethod]
    public async Task PlayVideo_WithConfiguredPlayer_ReturnsSuccessEnvelope()
    {
        var testRoot = Path.Combine(Path.GetTempPath(), $"jvedio-play-api-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(testRoot);
        var videoPath = Path.Combine(testRoot, "ABP-001.mp4");
        File.WriteAllBytes(videoPath, new byte[1024]);

        var createBody = new StringContent(
            JsonSerializer.Serialize(new { name = "Play Test Library", scanPaths = new[] { testRoot } }),
            Encoding.UTF8,
            "application/json");

        var createResponse = await TestBootstrap.Client.PostAsync("/api/libraries", createBody);
        Assert.AreEqual(HttpStatusCode.OK, createResponse.StatusCode, "Library creation should succeed");

        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var libraryId = createDoc.RootElement
            .GetProperty("data")
            .GetProperty("library")
            .GetProperty("libraryId")
            .GetString();
        Assert.IsFalse(string.IsNullOrWhiteSpace(libraryId), "Library should have an ID");

        var previousPlayerPath = Environment.GetEnvironmentVariable("JVEDIO_VIDEO_PLAYER_PATH");
        try
        {
            var scanBody = new StringContent(
                JsonSerializer.Serialize(new { libraryId }),
                Encoding.UTF8,
                "application/json");

            var scanResponse = await TestBootstrap.Client.PostAsync($"/api/libraries/{libraryId}/scan", scanBody);
            Assert.AreEqual(HttpStatusCode.Accepted, scanResponse.StatusCode, "Scan trigger should be accepted");

            string? videoId = null;
            for (var attempt = 0; attempt < 10 && string.IsNullOrWhiteSpace(videoId); attempt++)
            {
                await Task.Delay(500);
                var videosResponse = await TestBootstrap.Client.GetAsync($"/api/libraries/{libraryId}/videos?pageIndex=0&pageSize=20");
                Assert.AreEqual(HttpStatusCode.OK, videosResponse.StatusCode);

                var videosJson = await videosResponse.Content.ReadAsStringAsync();
                using var videosDoc = JsonDocument.Parse(videosJson);
                var items = videosDoc.RootElement.GetProperty("data").GetProperty("items");
                if (items.GetArrayLength() > 0)
                {
                    videoId = items[0].GetProperty("videoId").GetString();
                }
            }

            Assert.IsFalse(string.IsNullOrWhiteSpace(videoId), "Scan should import at least one video for play testing");

            var playerPath = Path.Combine(Environment.SystemDirectory, "cmd.exe");
            Environment.SetEnvironmentVariable("JVEDIO_VIDEO_PLAYER_PATH", playerPath);

            var playBody = new StringContent(
                JsonSerializer.Serialize(new { playerPath }),
                Encoding.UTF8,
                "application/json");
            var playResponse = await TestBootstrap.Client.PostAsync($"/api/videos/{videoId}/play", playBody);
            Assert.AreEqual(HttpStatusCode.OK, playResponse.StatusCode, await playResponse.Content.ReadAsStringAsync());

            var playJson = await playResponse.Content.ReadAsStringAsync();
            using var playDoc = JsonDocument.Parse(playJson);
            var data = playDoc.RootElement.GetProperty("data");
            Assert.IsTrue(playDoc.RootElement.GetProperty("success").GetBoolean());
            Assert.IsTrue(data.GetProperty("played").GetBoolean(), "Play endpoint should return played=true after successful launch");
            Assert.IsTrue(
                string.Equals(playerPath, data.GetProperty("playerUsed").GetString(), StringComparison.OrdinalIgnoreCase),
                "Play endpoint should report the actual player path used");
        }
        finally
        {
            Environment.SetEnvironmentVariable("JVEDIO_VIDEO_PLAYER_PATH", previousPlayerPath);
            if (!string.IsNullOrWhiteSpace(libraryId))
            {
                await TestBootstrap.Client.DeleteAsync($"/api/libraries/{libraryId}");
            }

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
