using Jvedio.Core.Scan;
using Jvedio.Entity;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Jvedio.Test.IntegrationTests.Scan
{
    [TestClass]
    public class LibraryOrganizeTests
    {
        private static readonly string ConfigPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "IntegrationTests", "Scan", "scan-test-config.json");

        private ScanTestConfig Config { get; set; }

        [TestInitialize]
        public void Initialize()
        {
            TestBootstrap.EnsureWpfContext();
            Config = ScanTestConfig.Load(ConfigPath);
            if (!Config.Enabled)
                Assert.Inconclusive("扫描链测试未启用，请修改 scan-test-config.json 中的 enabled。");

            if (Config.CleanOutputBeforeRun && Directory.Exists(Config.FlatLibraryRoot))
                Directory.Delete(Config.FlatLibraryRoot, true);

            Directory.CreateDirectory(Config.FlatLibraryRoot);
        }

        [TestMethod]
        public void CanOrganizeFlatVideoIntoDedicatedDirectory()
        {
            ScanTestCase testCase = Config.Cases.First(arg => arg.Name == "flat-single-video");
            string root = PrepareCaseDirectory(testCase);
            string videoPath = Path.Combine(root, testCase.Files[0]);
            File.WriteAllText(videoPath, "dummy");

            Video video = new Video() { VID = "SDDE-759", Path = videoPath };
            LibraryOrganizeResult result = LibraryOrganizer.TryOrganize(video, new List<string>() { ".mp4" });

            Assert.IsTrue(result.Success);
            Assert.IsTrue(result.Organized);
            Assert.AreEqual(testCase.ExpectedDirectoryName, Path.GetFileName(result.TargetDirectory));
            Assert.IsTrue(File.Exists(result.TargetVideoPath));
        }

        [TestMethod]
        public void CanMoveSiblingSubtitleTogether()
        {
            ScanTestCase testCase = Config.Cases.First(arg => arg.Name == "flat-video-with-subtitle");
            string root = PrepareCaseDirectory(testCase);
            foreach (string file in testCase.Files) {
                File.WriteAllText(Path.Combine(root, file), "dummy");
            }

            Video video = new Video() { VID = "MRPA-015", Path = Path.Combine(root, "MRPA-015.mp4") };
            LibraryOrganizeResult result = LibraryOrganizer.TryOrganize(video, new List<string>() { ".mp4" });

            Assert.IsTrue(result.Success);
            Assert.IsTrue(result.MovedFiles.Any(arg => arg.EndsWith("MRPA-015.srt", StringComparison.OrdinalIgnoreCase)));
        }

        [TestMethod]
        public void SkipsMovieWhenOrganizationFails()
        {
            ScanTestCase testCase = Config.Cases.First(arg => arg.Name == "organize-failed-should-skip");
            string root = PrepareCaseDirectory(testCase);
            string filePath = Path.Combine(root, testCase.Files[0]);
            File.WriteAllText(filePath, "dummy");

            string targetDir = Path.Combine(root, "LOCK-001");
            Directory.CreateDirectory(targetDir);
            File.WriteAllText(Path.Combine(targetDir, "LOCK-001.mp4"), "existing");

            Video video = new Video() { VID = "LOCK-001", Path = filePath };
            LibraryOrganizeResult result = LibraryOrganizer.TryOrganize(video, new List<string>() { ".mp4" });

            Assert.IsFalse(result.Success);
            Assert.IsTrue(testCase.ExpectSkipped);
        }

        private string PrepareCaseDirectory(ScanTestCase testCase)
        {
            string root = Path.Combine(Config.FlatLibraryRoot, testCase.Name);
            if (Directory.Exists(root))
                Directory.Delete(root, true);
            Directory.CreateDirectory(root);
            return root;
        }
    }
}
