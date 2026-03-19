using System.Collections.Generic;

namespace Jvedio.Core.Scraper.Models
{
    public class ScrapeResult
    {
        public string ProviderId { get; set; }

        public string VID { get; set; }

        public string Title { get; set; }

        public string Plot { get; set; }

        public string ReleaseDate { get; set; }

        public string Studio { get; set; }

        public string Director { get; set; }

        public int Duration { get; set; }

        public float Rating { get; set; }

        public List<string> Genres { get; set; } = new List<string>();

        public List<string> Tags { get; set; } = new List<string>();

        public List<ScrapedActor> Actors { get; set; } = new List<ScrapedActor>();

        public ScrapedImages Images { get; set; } = new ScrapedImages();

        public Dictionary<string, object> ExtraFields { get; set; } = new Dictionary<string, object>();
    }
}
