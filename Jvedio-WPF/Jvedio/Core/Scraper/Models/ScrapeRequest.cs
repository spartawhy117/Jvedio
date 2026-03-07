namespace Jvedio.Core.Scraper.Models
{
    public class ScrapeRequest
    {
        public long DataID { get; set; }

        public string VID { get; set; }

        public string Path { get; set; }

        public string Hash { get; set; }

        public bool ForceRefresh { get; set; }
    }
}
