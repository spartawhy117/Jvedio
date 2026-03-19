using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests;

/// <summary>
/// Test bootstrap: creates a shared WebApplicationFactory for integration tests.
/// Sets JVEDIO_APP_BASE_DIR to a temp directory with empty SQLite databases.
/// </summary>
[TestClass]
public class TestBootstrap
{
    private static WebApplicationFactory<Program>? _factory;
    private static HttpClient? _client;
    private static string? _tempDir;

    public static HttpClient Client => _client ?? throw new InvalidOperationException("TestBootstrap not initialized");

    [AssemblyInitialize]
    public static void Initialize(TestContext _)
    {
        // Create temp data directory with required SQLite databases
        _tempDir = Path.Combine(Path.GetTempPath(), $"jvedio-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        var userDir = Path.Combine(_tempDir, "data", "test-user");
        Directory.CreateDirectory(userDir);

        // Create empty SQLite databases (Worker will initialize tables via StorageBootstrapper)
        File.WriteAllBytes(Path.Combine(userDir, "app_configs.sqlite"), []);
        File.WriteAllBytes(Path.Combine(userDir, "app_datas.sqlite"), []);

        Environment.SetEnvironmentVariable("JVEDIO_APP_BASE_DIR", _tempDir);
        Environment.SetEnvironmentVariable("JVEDIO_LOG_DIR", Path.Combine(_tempDir, "log", "test", "worker-tests"));

        _factory = new WebApplicationFactory<Program>();
        _client = _factory.CreateClient();
    }

    [AssemblyCleanup]
    public static void Cleanup()
    {
        _client?.Dispose();
        _factory?.Dispose();

        // Clean up temp directory
        if (_tempDir != null && Directory.Exists(_tempDir))
        {
            try { Directory.Delete(_tempDir, recursive: true); }
            catch { /* best effort */ }
        }
    }

    /// <summary>
    /// Serialize/Deserialize JSON with options matching ASP.NET Core default (camelCase).
    /// </summary>
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
}
