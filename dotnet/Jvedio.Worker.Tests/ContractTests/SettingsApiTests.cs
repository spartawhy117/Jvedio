using System.Net;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for the Settings API endpoints.
/// Verifies settings read, update, and reset operations.
/// </summary>
[TestClass]
public class SettingsApiTests
{
    [TestMethod]
    public async Task GetSettings_ReturnsAllGroups()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/settings");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");

        // Verify all 6 settings groups exist
        Assert.IsTrue(data.TryGetProperty("general", out _), "Should have general settings");
        Assert.IsTrue(data.TryGetProperty("playback", out _), "Should have playback settings");
        Assert.IsTrue(data.TryGetProperty("metaTube", out _), "Should have metaTube settings");
        Assert.IsTrue(data.TryGetProperty("image", out _), "Should have image settings");
        Assert.IsTrue(data.TryGetProperty("scanImport", out _), "Should have scanImport settings");
        Assert.IsTrue(data.TryGetProperty("library", out _), "Should have library settings");
    }

    [TestMethod]
    public async Task UpdateSettings_PersistsAndReturns()
    {
        // NormalizeRequest requires general, playback, and metaTube to be non-null.
        // Supply a complete settings payload to avoid 422 validation errors.
        var updatePayload = new
        {
            general = new { currentLanguage = "zh-CN", debug = true },
            playback = new { playerPath = "", useSystemDefaultFallback = true },
            metaTube = new { serverUrl = "", requestTimeoutSeconds = 60 },
        };

        var updateBody = new StringContent(
            JsonSerializer.Serialize(updatePayload),
            System.Text.Encoding.UTF8,
            "application/json");

        var updateResponse = await TestBootstrap.Client.PutAsync("/api/settings", updateBody);
        var updateResponseBody = await updateResponse.Content.ReadAsStringAsync();
        Assert.AreEqual(HttpStatusCode.OK, updateResponse.StatusCode,
            $"Update failed with: {updateResponseBody}");

        // Read back and verify
        var getResponse = await TestBootstrap.Client.GetAsync("/api/settings");
        var json = await getResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var debug = doc.RootElement.GetProperty("data").GetProperty("general").GetProperty("debug").GetBoolean();
        Assert.IsTrue(debug, "Debug setting should be true after update");
    }

    [TestMethod]
    public async Task ResetSettings_RestoresDefaults()
    {
        // First update a setting (supply full required payload)
        var updatePayload = new
        {
            general = new { currentLanguage = "zh-CN", debug = true },
            playback = new { playerPath = "", useSystemDefaultFallback = true },
            metaTube = new { serverUrl = "", requestTimeoutSeconds = 60 },
        };

        var updateBody = new StringContent(
            JsonSerializer.Serialize(updatePayload),
            System.Text.Encoding.UTF8,
            "application/json");
        await TestBootstrap.Client.PutAsync("/api/settings", updateBody);

        // Reset to defaults
        var resetBody = new StringContent(
            JsonSerializer.Serialize(new { resetToDefaults = true }),
            System.Text.Encoding.UTF8,
            "application/json");
        var resetResponse = await TestBootstrap.Client.PutAsync("/api/settings", resetBody);
        Assert.AreEqual(HttpStatusCode.OK, resetResponse.StatusCode);

        // Read back and verify debug is false (default)
        var getResponse = await TestBootstrap.Client.GetAsync("/api/settings");
        var json = await getResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var debug = doc.RootElement.GetProperty("data").GetProperty("general").GetProperty("debug").GetBoolean();
        Assert.IsFalse(debug, "Debug setting should be false after reset to defaults");
    }
}
