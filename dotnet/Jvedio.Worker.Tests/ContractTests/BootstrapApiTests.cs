using System.Net;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.ContractTests;

/// <summary>
/// Tests for the Bootstrap API endpoint.
/// Verifies the Worker returns valid bootstrap data.
/// </summary>
[TestClass]
public class BootstrapApiTests
{
    [TestMethod]
    public async Task GetBootstrap_ReturnsSuccessEnvelope()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/app/bootstrap");
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.IsTrue(root.GetProperty("success").GetBoolean(), "Bootstrap response should be success=true");
        Assert.IsTrue(root.TryGetProperty("data", out var data), "Bootstrap response should have data property");
        Assert.IsTrue(data.TryGetProperty("worker", out _), "Bootstrap data should contain worker info");
        Assert.IsTrue(data.TryGetProperty("libraries", out _), "Bootstrap data should contain libraries array");
    }

    [TestMethod]
    public async Task GetBootstrap_WorkerInfoHasBaseUrl()
    {
        var response = await TestBootstrap.Client.GetAsync("/api/app/bootstrap");
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var worker = doc.RootElement.GetProperty("data").GetProperty("worker");
        Assert.IsTrue(worker.TryGetProperty("baseUrl", out var baseUrl), "Worker info should have baseUrl");
        Assert.IsFalse(string.IsNullOrEmpty(baseUrl.GetString()), "baseUrl should not be empty");
    }
}
