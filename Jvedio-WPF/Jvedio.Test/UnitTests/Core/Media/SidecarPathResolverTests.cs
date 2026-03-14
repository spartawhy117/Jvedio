using Jvedio.Core.Media;
using Jvedio.Entity;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.IO;

namespace Jvedio.Test.UnitTests.Core.Media
{
    [TestClass]
    public class SidecarPathResolverTests
    {
        [TestMethod]
        public void SidecarPathShouldUseVidPrefix()
        {
            string root = TestBootstrap.CreateTempDirectory("JvedioSidecar");
            string moviePath = Path.Combine(root, "ABP-001.mp4");
            File.WriteAllText(moviePath, "dummy");

            Video video = new Video() { VID = "ABP-001", Path = moviePath };
            Assert.AreEqual(Path.Combine(root, "ABP-001.nfo"), SidecarPathResolver.GetMovieNfoPath(video));
            Assert.AreEqual(Path.Combine(root, "ABP-001-poster.jpg"), SidecarPathResolver.GetPosterPath(video));
            Assert.AreEqual(Path.Combine(root, "ABP-001-thumb.jpg"), SidecarPathResolver.GetThumbPath(video));
            Assert.AreEqual(Path.Combine(root, "ABP-001-fanart.jpg"), SidecarPathResolver.GetFanartPath(video));
        }
    }
}
