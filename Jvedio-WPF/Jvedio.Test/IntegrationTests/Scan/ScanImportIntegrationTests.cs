using Jvedio.Core.Scan;
using Jvedio.Entity;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Jvedio.Test.IntegrationTests.Scan
{
    [TestClass]
    public class ScanImportIntegrationTests
    {
        [TestMethod]
        public void ScanTaskUsesOrganizedPathAfterMove()
        {
            TestBootstrap.EnsureWpfContext();
            string root = Path.Combine(Path.GetTempPath(), "JvedioScanTests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            string videoPath = Path.Combine(root, "ABP-001.mp4");
            File.WriteAllText(videoPath, "dummy");

            Video video = new Video() { VID = "ABP-001", Path = videoPath };
            ScanTask task = new ScanTask(new List<string>() { root }, new List<string>() { videoPath });
            List<Video> import = new List<Video>() { video };

            MethodInfo method = typeof(ScanTask).GetMethod("AutoOrganizeImportedVideos", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(task, new object[] { import });

            Assert.IsTrue(video.Path.IndexOf("ABP-001", StringComparison.OrdinalIgnoreCase) >= 0);
            Assert.IsTrue(File.Exists(video.Path));
        }

        [TestMethod]
        public void FailedOrganizationMovieIsMarkedAsNotImport()
        {
            TestBootstrap.EnsureWpfContext();
            string root = Path.Combine(Path.GetTempPath(), "JvedioScanTests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            string videoPath = Path.Combine(root, "LOCK-002.mp4");
            File.WriteAllText(videoPath, "dummy");
            Directory.CreateDirectory(Path.Combine(root, "LOCK-002"));
            File.WriteAllText(Path.Combine(root, "LOCK-002", "LOCK-002.mp4"), "existing");

            Video video = new Video() { VID = "LOCK-002", Path = videoPath };
            ScanTask task = new ScanTask(new List<string>() { root }, new List<string>() { videoPath });
            List<Video> import = new List<Video>() { video };

            MethodInfo method = typeof(ScanTask).GetMethod("AutoOrganizeImportedVideos", BindingFlags.NonPublic | BindingFlags.Instance);
            method.Invoke(task, new object[] { import });

            Assert.AreEqual(0, import.Count);
            Assert.IsTrue(task.ScanResult.NotImport.ContainsKey(videoPath));
        }
    }
}
