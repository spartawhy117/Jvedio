using System.Net;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for the Libraries API endpoints.
/// Verifies CRUD operations and response envelope format.
/// </summary>
[TestClass]
public class LibrariesApiTests
{
    [TestMethod]
    public async Task GetLibraries_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/libraries");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsTrue(root.GetProperty("success").GetBoolean());
        Assert.IsTrue(root.TryGetProperty("data", out var data));
        Assert.AreEqual(JsonValueKind.Array, data.GetProperty("libraries").ValueKind);
    }

    [TestMethod]
    public async Task CreateAndDeleteLibrary_RoundTrip()
    {
        // Create a library
        var createBody = new StringContent(
            JsonSerializer.Serialize(new { name = "Test Library", scanPaths = new[] { "C:\\TestPath" } }),
            System.Text.Encoding.UTF8,
            "application/json");

        var createResponse = await TestBootstrap.Client.PostAsync("/api/libraries", createBody);
        Assert.AreEqual(HttpStatusCode.OK, createResponse.StatusCode);

        // Response shape: { success, data: { library: { libraryId, name, ... }, createdAtUtc } }
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var data = createDoc.RootElement.GetProperty("data");
        var library = data.GetProperty("library");
        var libraryId = library.GetProperty("libraryId").GetString();
        Assert.IsFalse(string.IsNullOrEmpty(libraryId), "Created library should have an ID");

        // Verify library exists in list
        var listResponse = await TestBootstrap.Client.GetAsync("/api/libraries");
        var listJson = await listResponse.Content.ReadAsStringAsync();
        using var listDoc = JsonDocument.Parse(listJson);
        var libraries = listDoc.RootElement.GetProperty("data").GetProperty("libraries");
        Assert.IsTrue(libraries.GetArrayLength() > 0, "Libraries list should contain at least one item after creation");

        // Delete the library
        var deleteResponse = await TestBootstrap.Client.DeleteAsync($"/api/libraries/{libraryId}");
        Assert.AreEqual(HttpStatusCode.OK, deleteResponse.StatusCode);
    }
}
