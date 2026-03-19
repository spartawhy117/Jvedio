using System.Net;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for the Actor API endpoints.
/// Verifies actor listing, detail, linked videos, and search.
/// </summary>
[TestClass]
public class ActorApiTests
{
    [TestMethod]
    public async Task GetActors_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/actors");
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
    public async Task GetActors_SupportsPagination()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/actors?page=1&pageSize=10");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsTrue(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.IsTrue(data.TryGetProperty("items", out var items));
        Assert.AreEqual(JsonValueKind.Array, items.ValueKind);
        Assert.IsTrue(data.TryGetProperty("totalCount", out var totalCount));
        Assert.IsTrue(totalCount.GetInt32() >= 0);
    }

    [TestMethod]
    public async Task GetActors_SearchByKeyword_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/actors?keyword=nonexistent-actor-xyz");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsTrue(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.AreEqual(0, data.GetProperty("totalCount").GetInt32());
    }

    [TestMethod]
    public async Task GetActorDetail_InvalidId_ReturnsNotFound()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/actors/nonexistent-actor-id-999");
        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsFalse(root.GetProperty("success").GetBoolean());
    }

    [TestMethod]
    public async Task GetActorVideos_InvalidId_ReturnsNotFound()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/actors/nonexistent-actor-id-999/videos");
        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsFalse(root.GetProperty("success").GetBoolean());
    }
}
