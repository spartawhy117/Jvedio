using System.Text.Json;
using Jvedio.Contracts.Settings;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for DTO serialization/deserialization.
/// Verifies that Contracts DTOs correctly round-trip through System.Text.Json.
/// </summary>
[TestClass]
public class DtoSerializationTests
{
    [TestMethod]
    public void GetSettingsResponse_CanDeserializeFromJson()
    {
        var json = """
        {
            "general": { "currentLanguage": "zh", "debug": false },
            "playback": { "playerPath": "", "useSystemDefaultFallback": true },
            "metaTube": { "serverUrl": "https://example.com", "requestTimeoutSeconds": 60 },
            "image": { "posterPriority": "remote", "cacheSizeLimitMb": 500, "autoCleanExpiredCache": true },
            "scanImport": { "scanDepth": 3, "excludePatterns": "", "organizeMode": "byVid" },
            "library": { "defaultAutoScan": false, "defaultSortBy": "vid", "defaultSortOrder": "asc" }
        }
        """;

        var result = JsonSerializer.Deserialize<GetSettingsResponse>(json, TestBootstrap.JsonOptions);
        Assert.IsNotNull(result);
        Assert.IsNotNull(result.General);
        Assert.AreEqual("zh", result.General.CurrentLanguage);
        Assert.IsNotNull(result.Image);
        Assert.AreEqual("remote", result.Image.PosterPriority);
        Assert.IsNotNull(result.ScanImport);
        Assert.AreEqual(3, result.ScanImport.ScanDepth);
        Assert.IsNotNull(result.Library);
        Assert.AreEqual("vid", result.Library.DefaultSortBy);
    }

    [TestMethod]
    public void UpdateSettingsRequest_CanSerializePartialUpdate()
    {
        var request = new UpdateSettingsRequest
        {
            General = new GeneralSettingsDto { Debug = true },
        };

        // Use camelCase policy consistent with ASP.NET Core default JSON output
        var camelCaseOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        var json = JsonSerializer.Serialize(request, camelCaseOptions);
        Assert.IsFalse(string.IsNullOrEmpty(json));

        using var doc = JsonDocument.Parse(json);
        Assert.IsTrue(doc.RootElement.TryGetProperty("general", out var general),
            $"Expected 'general' property in JSON: {json}");
        Assert.IsTrue(general.GetProperty("debug").GetBoolean());
    }
}
