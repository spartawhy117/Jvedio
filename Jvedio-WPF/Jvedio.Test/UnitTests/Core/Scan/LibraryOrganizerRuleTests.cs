using Jvedio.Core.Scan;
using Jvedio.Entity;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.IO;

namespace Jvedio.Test.UnitTests.Core.Scan
{
    [TestClass]
    public class LibraryOrganizerRuleTests
    {
        [TestMethod]
        public void OrganizerShouldFallbackToFileNameWhenVidMissing()
        {
            string root = Path.Combine(Path.GetTempPath(), "organizer-rule-test", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            string path = Path.Combine(root, "movie-file.mp4");
            File.WriteAllText(path, "dummy");

            Video video = new Video() { Path = path };
            LibraryOrganizeResult result = LibraryOrganizer.TryOrganize(video, new List<string>() { ".mp4" });
            Assert.AreEqual(Path.Combine(root, "movie-file"), result.TargetDirectory);
        }
    }
}
