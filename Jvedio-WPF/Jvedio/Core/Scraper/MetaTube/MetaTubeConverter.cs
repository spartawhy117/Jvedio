using Jvedio.Core.Scraper.Models;
using System.Collections.Generic;
using System.Linq;

namespace Jvedio.Core.Scraper.MetaTube
{
    public static class MetaTubeConverter
    {
        public static ScrapeResult ToScrapeResult(MetaTubeMovieInfo movieInfo, List<MetaTubeActorSearchResult> actorInfos = null)
        {
            if (movieInfo == null)
                return null;

            ScrapeResult result = new ScrapeResult();
            result.ProviderId = "metatube";
            result.VID = movieInfo.Number;
            result.Title = movieInfo.Title;
            result.Plot = movieInfo.Summary;
            result.ReleaseDate = movieInfo.ReleaseDate == default ? string.Empty : movieInfo.ReleaseDate.ToString("yyyy-MM-dd");
            result.Studio = movieInfo.Maker;
            result.Director = movieInfo.Director;
            result.Duration = movieInfo.Runtime;
            result.Rating = movieInfo.Score;
            result.Genres = movieInfo.Genres?.Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct().ToList() ?? new List<string>();

            List<string> tags = new List<string>();
            if (!string.IsNullOrWhiteSpace(movieInfo.Label))
                tags.Add(movieInfo.Label);
            if (!string.IsNullOrWhiteSpace(movieInfo.Series))
                tags.Add(movieInfo.Series);
            result.Tags = tags.Distinct().ToList();

            result.Images.PosterUrl = string.IsNullOrWhiteSpace(movieInfo.BigCoverUrl) ? movieInfo.CoverUrl : movieInfo.BigCoverUrl;
            result.Images.ThumbUrl = string.IsNullOrWhiteSpace(movieInfo.BigThumbUrl) ? movieInfo.ThumbUrl : movieInfo.BigThumbUrl;
            result.Images.FanartUrl = string.IsNullOrWhiteSpace(movieInfo.CoverUrl) ? movieInfo.BigCoverUrl : movieInfo.CoverUrl;
            result.Images.PreviewImages = movieInfo.PreviewImages?.Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct().ToList() ?? new List<string>();

            if (actorInfos != null && actorInfos.Count > 0) {
                foreach (MetaTubeActorSearchResult actor in actorInfos) {
                    if (actor == null || string.IsNullOrWhiteSpace(actor.Name))
                        continue;
                    result.Actors.Add(new ScrapedActor() {
                        ActorId = actor.Id,
                        Name = actor.Name,
                        AvatarUrl = actor.Images?.FirstOrDefault(arg => !string.IsNullOrWhiteSpace(arg)),
                    });
                }
            } else if (movieInfo.Actors != null) {
                foreach (string actorName in movieInfo.Actors.Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct()) {
                    result.Actors.Add(new ScrapedActor() {
                        Name = actorName,
                    });
                }
            }

            result.ExtraFields["Provider"] = movieInfo.Provider;
            result.ExtraFields["ProviderId"] = movieInfo.Id;
            result.ExtraFields["Homepage"] = movieInfo.Homepage;
            result.ExtraFields["Series"] = movieInfo.Series;
            result.ExtraFields["Label"] = movieInfo.Label;

            return result;
        }
    }
}
