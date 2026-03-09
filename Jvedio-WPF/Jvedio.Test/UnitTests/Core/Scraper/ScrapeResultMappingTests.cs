using Jvedio.Core.Net;
using Jvedio.Core.Scraper.Models;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Jvedio.Test.UnitTests.Core.Scraper
{
    [TestClass]
    public class ScrapeResultMappingTests
    {
        [TestMethod]
        public void ScrapeResultCanBeMappedToDictionary()
        {
            ScrapeResult result = new ScrapeResult() {
                ProviderId = "metatube",
                VID = "ABP-001",
                Title = "Title",
                Plot = "Plot",
            };
            result.Images.PosterUrl = "poster";
            result.Images.ThumbUrl = "thumb";
            result.Images.FanartUrl = "fanart";

            VideoDownLoader loader = new VideoDownLoader(null, default, null);
            var method = typeof(VideoDownLoader).GetMethod("ToDictionary", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var dict = (System.Collections.Generic.Dictionary<string, object>)method.Invoke(loader, new object[] { result });
            Assert.AreEqual("ABP-001", dict["VID"]);
            Assert.AreEqual("Title", dict["Title"]);
        }
    }
}
