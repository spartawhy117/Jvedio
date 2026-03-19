using Jvedio.Core.Media;
using Jvedio.Core.Scraper.Models;
using System.IO;
using Jvedio.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace Jvedio.Core.Nfo
{
    public static class VideoNfoWriter
    {
        public static void Save(Video video, bool overwrite)
        {
            string path = SidecarPathResolver.GetMovieNfoPath(video);
            if (string.IsNullOrWhiteSpace(path))
                return;
            if (!overwrite && File.Exists(path))
                return;
            Video.SaveToNFO(video, path);
        }

        public static Task SaveFromScrapeResultAsync(ScrapeResult result, string path)
        {
            if (result == null || string.IsNullOrWhiteSpace(path))
                return Task.CompletedTask;

            NFO nfo = new NFO(path, "movie");
            nfo.SetNodeText("source", result.ExtraFields.ContainsKey("Homepage") ? result.ExtraFields["Homepage"]?.ToString() : string.Empty);
            nfo.SetNodeText("plot", result.Plot ?? string.Empty);
            nfo.SetNodeText("title", result.Title ?? string.Empty);
            nfo.SetNodeText("director", result.Director ?? string.Empty);
            nfo.SetNodeText("rating", result.Rating.ToString());
            nfo.SetNodeText("release", result.ReleaseDate ?? string.Empty);
            nfo.SetNodeText("premiered", result.ReleaseDate ?? string.Empty);
            nfo.SetNodeText("runtime", result.Duration.ToString());
            nfo.SetNodeText("studio", result.Studio ?? string.Empty);
            nfo.SetNodeText("id", result.VID ?? string.Empty);
            nfo.SetNodeText("num", result.VID ?? string.Empty);

            foreach (string genre in result.Genres.Where(arg => !string.IsNullOrWhiteSpace(arg))) {
                nfo.AppendNewNode("genre", genre);
            }

            foreach (string tag in result.Tags.Where(arg => !string.IsNullOrWhiteSpace(arg))) {
                nfo.AppendNewNode("tag", tag);
            }

            foreach (ScrapedActor actor in result.Actors.Where(arg => arg != null && !string.IsNullOrWhiteSpace(arg.Name))) {
                nfo.AppendNewNode("actor");
                nfo.AppendNodeToNode("actor", "name", actor.Name);
                nfo.AppendNodeToNode("actor", "type", "Actor");
            }

            if (result.Images?.PreviewImages != null && result.Images.PreviewImages.Count > 0) {
                nfo.AppendNewNode("fanart");
                foreach (string item in result.Images.PreviewImages.Where(arg => !string.IsNullOrWhiteSpace(arg))) {
                    nfo.AppendNodeToNode("fanart", "thumb", item, "preview", item);
                }
            }

            return Task.CompletedTask;
        }
    }
}
