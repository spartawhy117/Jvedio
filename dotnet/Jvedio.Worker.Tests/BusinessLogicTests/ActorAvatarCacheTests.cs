using System.Reflection;

using Jvedio.Worker.Services;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Worker.Tests.BusinessLogicTests;

[TestClass]
public class ActorAvatarCacheTests
{
    private static readonly MethodInfo ResolveActorAvatarPathMethod =
        typeof(ActorService).GetMethod("ResolveActorAvatarPath", BindingFlags.NonPublic | BindingFlags.Instance)!;

    private string? originalAppBaseDir;
    private string testRoot = string.Empty;

    [TestInitialize]
    public void Setup()
    {
        originalAppBaseDir = Environment.GetEnvironmentVariable("JVEDIO_APP_BASE_DIR");
        testRoot = Path.Combine(Path.GetTempPath(), $"jvedio-actor-avatar-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(testRoot);
        Environment.SetEnvironmentVariable("JVEDIO_APP_BASE_DIR", testRoot);
    }

    [TestCleanup]
    public void Cleanup()
    {
        Environment.SetEnvironmentVariable("JVEDIO_APP_BASE_DIR", originalAppBaseDir);
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

    [TestMethod]
    public void ResolveActorAvatarPath_PrefersNormalizedActorNameFile()
    {
        var resolver = new WorkerPathResolver(NullLogger<WorkerPathResolver>.Instance);
        var actorService = new ActorService(null!, null!, resolver);
        var expectedPath = Path.Combine(resolver.ActorAvatarCacheFolder, "Yua Mikami.jpg");
        Directory.CreateDirectory(resolver.ActorAvatarCacheFolder);
        File.WriteAllBytes(expectedPath, [1, 2, 3]);

        var resolvedPath = (string?)ResolveActorAvatarPathMethod.Invoke(actorService, [123L, "Yua Mikami", string.Empty, string.Empty]);

        Assert.IsTrue(
            string.Equals(expectedPath, resolvedPath, StringComparison.OrdinalIgnoreCase),
            "Actor avatar lookup should hit the readable actor-name cache file first");
    }

    [TestMethod]
    public void ResolveActorAvatarPath_PromotesLegacyCacheFileToNormalizedActorName()
    {
        var resolver = new WorkerPathResolver(NullLogger<WorkerPathResolver>.Instance);
        var actorService = new ActorService(null!, null!, resolver);
        var legacyPath = Path.Combine(resolver.ActorAvatarCacheFolder, "123.jpg");
        var preferredPath = Path.Combine(resolver.ActorAvatarCacheFolder, "Yua Mikami.jpg");
        Directory.CreateDirectory(resolver.ActorAvatarCacheFolder);
        File.WriteAllBytes(legacyPath, [1, 2, 3]);

        var resolvedPath = (string?)ResolveActorAvatarPathMethod.Invoke(actorService, [123L, "Yua Mikami", string.Empty, string.Empty]);

        Assert.IsTrue(
            string.Equals(preferredPath, resolvedPath, StringComparison.OrdinalIgnoreCase),
            "Legacy actor avatar cache should be promoted to the normalized actor-name path");
        Assert.IsTrue(File.Exists(preferredPath), "Normalized actor-name avatar cache should exist after promotion");
        Assert.IsFalse(File.Exists(legacyPath), "Legacy actor-id avatar cache should be removed after promotion");
    }
}
