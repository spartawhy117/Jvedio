using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests;

/// <summary>
/// Test bootstrap: creates a shared WebApplicationFactory for integration tests.
/// Sets JVEDIO_APP_BASE_DIR to {repo}/test-data/worker/ for stable, debuggable test data.
/// </summary>
[TestClass]
public class TestBootstrap
{
    private static WebApplicationFactory<Program>? _factory;
    private static HttpClient? _client;
    private static string? _testDataDir;

    public static HttpClient Client => _client ?? throw new InvalidOperationException("TestBootstrap not initialized");

    /// <summary>
    /// The test data root directory ({repo}/test-data/worker/).
    /// Available for tests that need to create temporary files (e.g. ScanImportApiTests).
    /// </summary>
    public static string TestDataDir => _testDataDir ?? throw new InvalidOperationException("TestBootstrap not initialized");

    [AssemblyInitialize]
    public static void Initialize(TestContext _)
    {
        var repoRoot = FindRepoRoot();

        // Use {repo}/test-data/worker/ as stable test data directory
        _testDataDir = Path.Combine(repoRoot, "test-data", "worker");

        // Clean and recreate to ensure fresh state
        if (Directory.Exists(_testDataDir))
            Directory.Delete(_testDataDir, recursive: true);
        Directory.CreateDirectory(_testDataDir);

        var userDir = Path.Combine(_testDataDir, "data", "test-user");
        Directory.CreateDirectory(userDir);

        // Create empty SQLite databases (Worker will initialize tables via StorageBootstrapper)
        File.WriteAllBytes(Path.Combine(userDir, "app_configs.sqlite"), []);
        File.WriteAllBytes(Path.Combine(userDir, "app_datas.sqlite"), []);

        Environment.SetEnvironmentVariable("JVEDIO_APP_BASE_DIR", _testDataDir);

        // Log to {repo}/log/test/worker-tests/ (persistent, not cleaned)
        var logDir = Path.Combine(repoRoot, "log", "test", "worker-tests");
        Directory.CreateDirectory(logDir);
        Environment.SetEnvironmentVariable("JVEDIO_LOG_DIR", logDir);

        _factory = new WebApplicationFactory<Program>();
        _client = _factory.CreateClient();
    }

    [AssemblyCleanup]
    public static void Cleanup()
    {
        _client?.Dispose();
        _factory?.Dispose();

        // Do NOT delete test-data/worker/ — keep for debugging and git tracking
    }

    /// <summary>
    /// Serialize/Deserialize JSON with options matching ASP.NET Core default (camelCase).
    /// </summary>
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>
    /// Find the repo root by walking up from the current assembly location,
    /// looking for a directory that contains both "dotnet/" and "tauri/" subdirectories.
    /// </summary>
    private static string FindRepoRoot()
    {
        var dir = Path.GetDirectoryName(typeof(TestBootstrap).Assembly.Location);
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir, "dotnet")) &&
                Directory.Exists(Path.Combine(dir, "tauri")))
            {
                return dir;
            }
            dir = Path.GetDirectoryName(dir);
        }
        throw new InvalidOperationException(
            "Cannot find repo root (directory containing both 'dotnet/' and 'tauri/'). " +
            "Ensure tests are run from within the repository.");
    }
}
