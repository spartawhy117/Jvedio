using Jvedio.Core.Global;
using Jvedio.Core.Nfo;
using Jvedio.Core.Scraper.Models;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Core.Scraper.MetaTube
{
    public static class MetaTubeOutputWriter
    {
        private static readonly HttpClient HttpClient = new HttpClient() {
            Timeout = TimeSpan.FromSeconds(30),
        };

        public static async Task WriteTestOutputAsync(string vid, ScrapeResult result, Action<string> log, CancellationToken cancellationToken)
        {
            if (result == null || string.IsNullOrWhiteSpace(vid))
                return;

            string outputDir = Path.Combine(PathManager.MetaTubeTestPath, vid.Trim().ToUpperInvariant());
            if (!Directory.Exists(outputDir))
                Directory.CreateDirectory(outputDir);

            string jsonPath = Path.Combine(outputDir, "meta.json");
            File.WriteAllText(jsonPath, JsonConvert.SerializeObject(result, Formatting.Indented));
            log?.Invoke($"写入 JSON: {jsonPath}");

            await VideoNfoWriter.SaveFromScrapeResultAsync(result, Path.Combine(outputDir, "movie.nfo"));
            log?.Invoke($"写入 NFO: {Path.Combine(outputDir, "movie.nfo")}");

            await DownloadImageAsync(result.Images?.PosterUrl, Path.Combine(outputDir, "poster.jpg"), log, cancellationToken);
            await DownloadImageAsync(result.Images?.ThumbUrl, Path.Combine(outputDir, "thumb.jpg"), log, cancellationToken);
            await DownloadImageAsync(result.Images?.FanartUrl, Path.Combine(outputDir, "fanart.jpg"), log, cancellationToken);

            if (result.Actors != null) {
                foreach (ScrapedActor actor in result.Actors.Where(arg => arg != null && !string.IsNullOrWhiteSpace(arg.AvatarUrl))) {
                    string path = Core.Media.ActorAvatarPathResolver.GetAvatarPath(actor.ActorId, actor.Name, Path.GetExtension(actor.AvatarUrl));
                    await DownloadImageAsync(actor.AvatarUrl, path, log, cancellationToken);
                }
            }
        }

        private static async Task DownloadImageAsync(string url, string path, Action<string> log, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(path))
                return;

            string dir = Path.GetDirectoryName(path);
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            cancellationToken.ThrowIfCancellationRequested();
            byte[] bytes = await HttpClient.GetByteArrayAsync(url);
            File.WriteAllBytes(path, bytes);
            log?.Invoke($"写入文件: {path}");
        }
    }
}
