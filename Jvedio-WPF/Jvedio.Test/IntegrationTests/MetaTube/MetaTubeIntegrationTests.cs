using Jvedio;
using Jvedio.Core.Config;
using Jvedio.Core.Global;
using Jvedio.Core.Scraper.MetaTube;
using Jvedio.Core.Scraper.Models;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Test.IntegrationTests.MetaTube
{
    [TestClass]
    public class MetaTubeIntegrationTests
    {
        private static readonly string ConfigPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "IntegrationTests", "MetaTube", "meta-tube-test-config.json");

        private MetaTubeTestConfig Config { get; set; }

        [TestInitialize]
        public void Initialize()
        {
            TestBootstrap.EnsureWpfContext();
            Config = MetaTubeTestConfig.Load(ConfigPath);
            App.Init();
            if (ConfigManager.MetaTubeConfig == null)
                ConfigManager.MetaTubeConfig = MetaTubeConfig.CreateInstance();
            if (!Config.Enabled)
                Assert.Inconclusive("MetaTube 集成测试未启用，请修改 meta-tube-test-config.json 中的 enabled。");

            ConfigManager.MetaTubeConfig.Enabled = true;
            ConfigManager.MetaTubeConfig.ServerUrl = Config.ServerUrl;
            ConfigManager.MetaTubeConfig.RequestTimeoutSeconds = Config.RequestTimeoutSeconds;

            PathManager.MetaTubeTestRootPath = Config.TestOutputRoot;
            PathManager.CachePath = Config.CacheRoot;
            PathManager.VideoCachePath = Path.Combine(Config.CacheRoot, "video");
            PathManager.ActorAvatarCachePath = Path.Combine(Config.CacheRoot, "actor-avatar");

            Directory.CreateDirectory(PathManager.MetaTubeTestRootPath);
            Directory.CreateDirectory(PathManager.VideoCachePath);
            Directory.CreateDirectory(PathManager.ActorAvatarCachePath);

            if (Config.ClearOutputBeforeRun) {
                TryResetDirectory(PathManager.MetaTubeTestRootPath);
                TryResetDirectory(PathManager.VideoCachePath);
                TryResetDirectory(PathManager.ActorAvatarCachePath);
            }
        }

        [TestMethod]
        public async Task CanWarmupMetaTubeServer()
        {
            MetaTubeClient client = CreateClient();
            await client.WarmupAsync(CancellationToken.None);
        }

        [TestMethod]
        public async Task CanSearchMovieByVid()
        {
            MetaTubeClient client = CreateClient();
            foreach (MetaTubeTestCase item in Config.Cases) {
                var results = await client.SearchMovieAsync(item.Vid, CancellationToken.None);
                if (item.ExpectMovieHit) {
                    Assert.IsNotNull(results, item.Name);
                    Assert.IsTrue(results.Count > 0, item.Name);
                    Assert.IsTrue(results.Any(arg => !string.IsNullOrWhiteSpace(arg.Number) && arg.Number.Equals(item.Vid, StringComparison.OrdinalIgnoreCase)), item.Name);
                }
            }
        }

        [TestMethod]
        public async Task CanFetchMovieDetailAndConvert()
        {
            MetaTubeClient client = CreateClient();
            foreach (MetaTubeTestCase item in Config.Cases) {
                var searchResults = await client.SearchMovieAsync(item.Vid, CancellationToken.None);
                var selected = searchResults.First(arg => !string.IsNullOrWhiteSpace(arg.Number) && arg.Number.Equals(item.Vid, StringComparison.OrdinalIgnoreCase));
                var movieInfo = await client.GetMovieInfoAsync(selected.Provider, selected.Id, CancellationToken.None);
                var result = MetaTubeConverter.ToScrapeResult(movieInfo);

                if (item.ExpectMovieTitleNotEmpty)
                    Assert.IsFalse(string.IsNullOrWhiteSpace(result.Title), item.Name);
                Assert.AreEqual(item.Vid, result.VID, item.Name);
                Assert.IsTrue(result.Images != null, item.Name);
            }
        }

        [TestMethod]
        public async Task CanFetchActorAvatarWhenAvailable()
        {
            MetaTubeClient client = CreateClient();
            foreach (MetaTubeTestCase item in Config.Cases) {
                var searchResults = await client.SearchMovieAsync(item.Vid, CancellationToken.None);
                var selected = searchResults.First(arg => !string.IsNullOrWhiteSpace(arg.Number) && arg.Number.Equals(item.Vid, StringComparison.OrdinalIgnoreCase));
                var movieInfo = await client.GetMovieInfoAsync(selected.Provider, selected.Id, CancellationToken.None);

                int actorAvatarCount = 0;
                foreach (string actorName in movieInfo.Actors.Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct()) {
                    try {
                        var actorSearchResults = await client.SearchActorAsync(actorName, CancellationToken.None);
                        var actor = actorSearchResults.FirstOrDefault(arg => !string.IsNullOrWhiteSpace(arg.Name) && arg.Name.Equals(actorName, StringComparison.OrdinalIgnoreCase))
                            ?? actorSearchResults.FirstOrDefault();
                        if (actor == null)
                            continue;

                        string avatarUrl = actor.Images?.FirstOrDefault(arg => !string.IsNullOrWhiteSpace(arg));
                        if (!string.IsNullOrWhiteSpace(actor.Provider) && !string.IsNullOrWhiteSpace(actor.Id)) {
                            var actorInfo = await client.GetActorInfoAsync(actor.Provider, actor.Id, CancellationToken.None);
                            if (actorInfo?.Images != null && actorInfo.Images.Length > 0)
                                avatarUrl = actorInfo.Images.First();
                        }

                        if (!string.IsNullOrWhiteSpace(avatarUrl))
                            actorAvatarCount++;
                    } catch (Exception ex) {
                        if (Config.LogToConsole)
                            Console.WriteLine($"actor search skipped [{actorName}]: {ex.Message}");
                    }
                }

                if (item.ExpectActorAvatarAtLeastOne)
                    Assert.IsTrue(actorAvatarCount > 0, item.Name);
            }
        }

        [TestMethod]
        public async Task CanWriteTestOutputFiles()
        {
            MetaTubeClient client = CreateClient();
            foreach (MetaTubeTestCase item in Config.Cases) {
                var searchResults = await client.SearchMovieAsync(item.Vid, CancellationToken.None);
                var selected = searchResults.First(arg => !string.IsNullOrWhiteSpace(arg.Number) && arg.Number.Equals(item.Vid, StringComparison.OrdinalIgnoreCase));
                var movieInfo = await client.GetMovieInfoAsync(selected.Provider, selected.Id, CancellationToken.None);
                var result = MetaTubeConverter.ToScrapeResult(movieInfo);
                await MetaTubeOutputWriter.WriteTestOutputAsync(item.Vid, result, null, CancellationToken.None);

                if (item.ExpectTestOutputFiles) {
                    string root = Path.Combine(PathManager.MetaTubeTestRootPath, item.Vid);
                    Assert.IsTrue(File.Exists(Path.Combine(root, "meta.json")), item.Name);
                    Assert.IsTrue(Directory.GetFiles(root, "*.nfo").Length > 0 || File.Exists(Path.Combine(root, "movie.nfo")), item.Name);
                }
            }
        }

        private MetaTubeClient CreateClient()
        {
            return new MetaTubeClient(Config.ServerUrl, message => {
                if (Config.LogToConsole)
                    Console.WriteLine(message);
            });
        }

        private void TryResetDirectory(string path)
        {
            if (Directory.Exists(path))
                Directory.Delete(path, true);
            Directory.CreateDirectory(path);
        }
    }
}
