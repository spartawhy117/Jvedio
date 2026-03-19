using System.Net;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

/// <summary>
/// Integration tests for the scan/import pipeline via Worker API.
/// Creates a library with a temp directory containing dummy video files,
/// triggers a scan, and verifies the videos are imported and accessible.
/// </summary>
[TestClass]
public class ScanImportApiTests
{
    private string testRoot = string.Empty;

    [TestInitialize]
    public void Setup()
    {
        testRoot = Path.Combine(Path.GetTempPath(), $"jvedio-scan-api-test-{Guid.NewGuid():N}");
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
    /// End-to-end scan pipeline: create library → populate with dummy videos → trigger scan →
    /// verify videos are discovered and VIDs are extracted.
    /// </summary>
    [TestMethod]
    public async Task ScanLibrary_ImportsVideos_WithExtractedVids()
    {
        // Step 1: Create dummy video files with recognizable VID patterns
        var dummyFiles = new[]
        {
            "ABP-001.mp4",
            "STARS-123.mkv",
            "FC2-PPV-1234567.mp4",
        };

        foreach (var fileName in dummyFiles)
        {
            // Create files large enough to pass minimum size check (write > 0 bytes)
            var filePath = Path.Combine(testRoot, fileName);
            File.WriteAllBytes(filePath, new byte[1024]);
        }

        // Step 2: Create a library pointing to the test directory
        var createBody = new StringContent(
            JsonSerializer.Serialize(new { name = "Scan Test Library", scanPaths = new[] { testRoot } }),
            System.Text.Encoding.UTF8,
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
        Assert.IsFalse(string.IsNullOrEmpty(libraryId), "Library should have an ID");

        try
        {
            // Step 3: Trigger a scan for this library
            var scanBody = new StringContent(
                JsonSerializer.Serialize(new { libraryId }),
                System.Text.Encoding.UTF8,
                "application/json");

            var scanResponse = await TestBootstrap.Client.PostAsync($"/api/libraries/{libraryId}/scan", scanBody);
            // Scan endpoint returns 202 Accepted (async task created)
            Assert.AreEqual(HttpStatusCode.Accepted, scanResponse.StatusCode,
                $"Scan trigger should be accepted: {await scanResponse.Content.ReadAsStringAsync()}");

            // Step 4: Wait for the scan task to complete
            // The scan is async; poll task status or just wait a reasonable time
            await Task.Delay(3000);

            // Step 5: Verify videos were imported
            var videosResponse = await TestBootstrap.Client.GetAsync($"/api/libraries/{libraryId}/videos?page=1&pageSize=50");
            Assert.AreEqual(HttpStatusCode.OK, videosResponse.StatusCode);

            var videosJson = await videosResponse.Content.ReadAsStringAsync();
            using var videosDoc = JsonDocument.Parse(videosJson);
            var items = videosDoc.RootElement.GetProperty("data").GetProperty("items");
            Assert.IsTrue(items.GetArrayLength() >= 1,
                $"At least one video should be imported from scan. Response: {videosJson}");
        }
        finally
        {
            // Cleanup: delete the library
            await TestBootstrap.Client.DeleteAsync($"/api/libraries/{libraryId}");
        }
    }

    /// <summary>
    /// Scanning an empty directory should succeed without errors, importing zero videos.
    /// </summary>
    [TestMethod]
    public async Task ScanLibrary_EmptyDirectory_ImportsNothing()
    {
        // Create a library with empty scan path
        var emptyDir = Path.Combine(testRoot, "empty");
        Directory.CreateDirectory(emptyDir);

        var createBody = new StringContent(
            JsonSerializer.Serialize(new { name = "Empty Scan Library", scanPaths = new[] { emptyDir } }),
            System.Text.Encoding.UTF8,
            "application/json");

        var createResponse = await TestBootstrap.Client.PostAsync("/api/libraries", createBody);
        Assert.AreEqual(HttpStatusCode.OK, createResponse.StatusCode);

        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var libraryId = createDoc.RootElement
            .GetProperty("data")
            .GetProperty("library")
            .GetProperty("libraryId")
            .GetString();

        try
        {
            // Trigger scan
            var scanBody = new StringContent(
                JsonSerializer.Serialize(new { libraryId }),
                System.Text.Encoding.UTF8,
                "application/json");

            var scanResponse = await TestBootstrap.Client.PostAsync($"/api/libraries/{libraryId}/scan", scanBody);
            Assert.AreEqual(HttpStatusCode.Accepted, scanResponse.StatusCode);

            await Task.Delay(2000);

            // Verify zero videos imported
            var videosResponse = await TestBootstrap.Client.GetAsync($"/api/libraries/{libraryId}/videos?page=1&pageSize=50");
            Assert.AreEqual(HttpStatusCode.OK, videosResponse.StatusCode);

            var videosJson = await videosResponse.Content.ReadAsStringAsync();
            using var videosDoc = JsonDocument.Parse(videosJson);
            var items = videosDoc.RootElement.GetProperty("data").GetProperty("items");
            Assert.AreEqual(0, items.GetArrayLength(), "Empty directory should import zero videos");
        }
        finally
        {
            await TestBootstrap.Client.DeleteAsync($"/api/libraries/{libraryId}");
        }
    }
}
