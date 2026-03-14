using Jvedio.Core.Scan;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Jvedio.Test.UnitTests.Core.Scan
{
    [TestClass]
    public class ScanTaskImportTests
    {
        [TestMethod]
        public void BasicImport()
        {
            TestBootstrap.EnsureWpfContext();
            List<string> filePaths = new List<string>() { "abcd-123.mp4" };
            ScanTask scanTask = new ScanTask(new List<string>(), filePaths.ToList());
            ScanResult scanResult = scanTask.ScanResult;

            Assert.IsNotNull(scanResult.Import);
            Assert.IsNotNull(scanResult.FailNFO);
            Assert.IsNotNull(scanResult.NotImport);
            Assert.AreEqual(0, scanResult.TotalCount);
        }

        [TestMethod]
        public void SubSectionImport()
        {
            TestBootstrap.EnsureWpfContext();
            string root = TestBootstrap.CreateTempDirectory("JvedioSubSectionImportTests");
            try {
                List<string> list = Enumerable.Range(1, 12)
                    .Select(index => Path.Combine(root, $"abcd-123-{index}.mp4"))
                    .ToList();
                list.ForEach(path => File.WriteAllText(path, "dummy"));
                Assert.AreEqual(12, list.Count);

                (bool isSubSection, List<string> subSectionList, List<string> notSubSection) = VideoParser.HandleSubSection(list);

                Assert.IsTrue(isSubSection);
                Assert.AreEqual(12, subSectionList.Count);
                Assert.AreEqual(0, notSubSection.Count);
            } finally {
                if (Directory.Exists(root))
                    Directory.Delete(root, true);
            }
        }
    }
}
