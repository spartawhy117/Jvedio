using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for the MetaTube scrape and diagnostics API endpoints.
/// Tests marked [RequiresNetwork] depend on a live MetaTube server
/// configured in test-data/config/test-env.json.
/// </summary>
[TestClass]
public class ScrapeApiTests
{
    /// <summary>
    /// Triggering scrape on a non-existent library should return 404.
    /// </summary>
    [TestMethod]
    public async Task ScrapeLibrary_InvalidId_ReturnsNotFound()
    {
        var body = new StringContent(
            JsonSerializer.Serialize(new
            {
                mode = "missing-only",
                writeSidecars = false,
                downloadActorAvatars = false,
            }),
            Encoding.UTF8,
            "application/json");

        var response = await TestBootstrap.Client.PostAsync(
            "/api/libraries/nonexistent-lib-id-999/scrape", body);

        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// Triggering scrape on a valid (empty) library should return 202 Accepted.
    /// Creates a temporary library, triggers scrape, then cleans up.
    /// </summary>
    [TestMethod]
    public async Task ScrapeLibrary_ValidLibrary_ReturnsAccepted()
    {
        // Create a temporary library with a non-existent path (scrape won't find files, but trigger should succeed)
        var tempDir = Path.Combine(TestBootstrap.TestDataDir, "scrape-test-temp");
        Directory.CreateDirectory(tempDir);

        try
        {
            var createBody = new StringContent(
                JsonSerializer.Serialize(new
                {
                    name = "ScrapeTest-Temp",
                    scanPaths = new[] { tempDir.Replace("\\", "/") },
                }),
                Encoding.UTF8,
                "application/json");

            var createResp = await TestBootstrap.Client.PostAsync("/api/libraries", createBody);
            Assert.AreEqual(HttpStatusCode.OK, createResp.StatusCode);

            var createJson = await createResp.Content.ReadAsStringAsync();
            using var createDoc = JsonDocument.Parse(createJson);
            var libId = createDoc.RootElement
                .GetProperty("data")
                .GetProperty("library")
                .GetProperty("libraryId")
                .GetString();
            Assert.IsNotNull(libId);

            // Trigger scrape
            var scrapeBody = new StringContent(
                JsonSerializer.Serialize(new
                {
                    mode = "missing-only",
                    writeSidecars = false,
                    downloadActorAvatars = false,
                }),
                Encoding.UTF8,
                "application/json");

            var scrapeResp = await TestBootstrap.Client.PostAsync(
                $"/api/libraries/{libId}/scrape", scrapeBody);

            Assert.AreEqual(HttpStatusCode.Accepted, scrapeResp.StatusCode);

            var scrapeJson = await scrapeResp.Content.ReadAsStringAsync();
            using var scrapeDoc = JsonDocument.Parse(scrapeJson);
            var scrapeRoot = scrapeDoc.RootElement;

            Assert.IsTrue(scrapeRoot.GetProperty("success").GetBoolean());
            Assert.IsTrue(scrapeRoot.GetProperty("data").TryGetProperty("acceptedAtUtc", out _));

            // Clean up: delete library
            await TestBootstrap.Client.DeleteAsync($"/api/libraries/{libId}");
        }
        finally
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    /// <summary>
    /// MetaTube diagnostics endpoint should return a valid response envelope
    /// with diagnostic steps. This test does NOT require a live MetaTube server —
    /// it only verifies the API contract (the diagnostics may report failure steps).
    /// </summary>
    [TestMethod]
    public async Task MetaTubeDiagnostics_ReturnsResponseEnvelope()
    {
        var body = new StringContent(
            JsonSerializer.Serialize(new
            {
                serverUrl = "http://localhost:1",    // intentionally unreachable
                requestTimeoutSeconds = 3,
                testVideoId = "IPX-001",
            }),
            Encoding.UTF8,
            "application/json");

        var response = await TestBootstrap.Client.PostAsync(
            "/api/settings/meta-tube/diagnostics", body);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsTrue(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.IsTrue(data.TryGetProperty("steps", out var steps));
        Assert.AreEqual(JsonValueKind.Array, steps.ValueKind);
        Assert.IsTrue(data.TryGetProperty("summary", out _));
        Assert.IsTrue(data.TryGetProperty("serverUrl", out _));
        // diagnostics.success may be false (unreachable server), that's expected
    }

    /// <summary>
    /// Reads test-env.json to locate the config file path.
    /// Returns null if the config file doesn't exist.
    /// </summary>
    private static JsonDocument? LoadTestEnvConfig()
    {
        var repoRoot = Path.GetDirectoryName(typeof(TestBootstrap).Assembly.Location);
        while (repoRoot != null)
        {
            if (Directory.Exists(Path.Combine(repoRoot, "dotnet")) &&
                Directory.Exists(Path.Combine(repoRoot, "tauri")))
                break;
            repoRoot = Path.GetDirectoryName(repoRoot);
        }

        if (repoRoot == null) return null;

        var configPath = Path.Combine(repoRoot, "test-data", "config", "test-env.json");
        if (!File.Exists(configPath)) return null;

        var json = File.ReadAllText(configPath);
        return JsonDocument.Parse(json);
    }
}
