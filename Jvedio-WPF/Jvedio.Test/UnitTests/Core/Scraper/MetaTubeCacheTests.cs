using Jvedio.Core.Global;
using Jvedio.Core.Config;
using Jvedio.Core.Scraper.MetaTube;
using Jvedio.Core.Scraper.Models;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.IO;

namespace Jvedio.Test.UnitTests.Core.Scraper
{
    [TestClass]
    public class MetaTubeCacheTests
    {
        [TestMethod]
        public void MetaTubeCacheCanSaveAndReadVideo()
        {
            TestBootstrap.EnsureWpfContext();
            if (ConfigManager.MetaTubeConfig == null)
                ConfigManager.MetaTubeConfig = MetaTubeConfig.CreateInstance();
            PathManager.VideoCachePath = Path.Combine(Path.GetTempPath(), "metatube-cache-test", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(PathManager.VideoCachePath);
            ConfigManager.MetaTubeConfig.JsonCacheEnabled = true;

            ScrapeResult result = new ScrapeResult() { VID = "ABP-001", Title = "Title" };
            MetaTubeCache.SaveVideo("ABP-001", result);

            bool ok = MetaTubeCache.TryGetVideo("ABP-001", out ScrapeResult loaded);
            Assert.IsTrue(ok);
            Assert.AreEqual("Title", loaded.Title);
        }
    }
}
