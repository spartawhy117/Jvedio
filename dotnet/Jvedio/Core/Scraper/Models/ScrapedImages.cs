using System.Collections.Generic;

namespace Jvedio.Core.Scraper.Models
{
    public class ScrapedImages
    {
        public string PosterUrl { get; set; }

        public string ThumbUrl { get; set; }

        public string FanartUrl { get; set; }

        public List<string> PreviewImages { get; set; } = new List<string>();
    }
}
