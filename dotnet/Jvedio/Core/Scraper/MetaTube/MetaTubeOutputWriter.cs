using Jvedio.Core.Global;
using Jvedio.Core.Media;
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

            string outputDir = Path.Combine(PathManager.MetaTubeTestRootPath, vid.Trim().ToUpperInvariant());
            if (!Directory.Exists(outputDir))
                Directory.CreateDirectory(outputDir);

            string jsonPath = Path.Combine(outputDir, "meta.json");
            File.WriteAllText(jsonPath, JsonConvert.SerializeObject(result, Formatting.Indented));
            log?.Invoke($"写入 JSON: {jsonPath}");

            await VideoNfoWriter.SaveFromScrapeResultAsync(result, Path.Combine(outputDir, "movie.nfo"));
            log?.Invoke($"写入 NFO: {Path.Combine(outputDir, "movie.nfo")}");

            string homepage = result.ExtraFields != null && result.ExtraFields.ContainsKey("Homepage")
                ? result.ExtraFields["Homepage"]?.ToString()
                : string.Empty;

            await DownloadImageAsync(result.Images?.PosterUrl, Path.Combine(outputDir, "poster.jpg"), log, cancellationToken, homepage);
            await DownloadImageAsync(result.Images?.ThumbUrl, Path.Combine(outputDir, "thumb.jpg"), log, cancellationToken, homepage);
            await DownloadImageAsync(result.Images?.FanartUrl, Path.Combine(outputDir, "fanart.jpg"), log, cancellationToken, homepage);

            if (result.Actors != null) {
                foreach (ScrapedActor actor in result.Actors.Where(arg => arg != null && !string.IsNullOrWhiteSpace(arg.AvatarUrl))) {
                    string ext = GetFileExtension(actor.AvatarUrl);
                    if (string.IsNullOrWhiteSpace(ext))
                        ext = ".jpg";
                    string path = ActorAvatarPathResolver.GetAvatarPath(actor.ActorId, actor.Name, ext);
                    await DownloadImageAsync(actor.AvatarUrl, path, log, cancellationToken, null);
                }
            }
        }

        private static string GetFileExtension(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return string.Empty;

            if (Uri.TryCreate(url, UriKind.Absolute, out Uri uri))
                return Path.GetExtension(uri.AbsolutePath);

            int queryIndex = url.IndexOf('?');
            string cleanUrl = queryIndex >= 0 ? url.Substring(0, queryIndex) : url;
            return Path.GetExtension(cleanUrl);
        }

        private static async Task DownloadImageAsync(string url, string path, Action<string> log, CancellationToken cancellationToken, string refererUrl)
        {
            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(path))
                return;

            string dir = Path.GetDirectoryName(path);
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            try {
                cancellationToken.ThrowIfCancellationRequested();
                using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, url)) {
                    request.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");
                    request.Headers.TryAddWithoutValidation("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
                    request.Headers.TryAddWithoutValidation("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");

                    Uri referrer = BuildReferrer(url, refererUrl);
                    if (referrer != null)
                        request.Headers.Referrer = referrer;

                    using (HttpResponseMessage response = await HttpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken)) {
                        response.EnsureSuccessStatusCode();
                        byte[] bytes = await response.Content.ReadAsByteArrayAsync();
                        File.WriteAllBytes(path, bytes);
                    }
                }
                log?.Invoke($"写入文件: {path}");
            } catch (Exception ex) {
                log?.Invoke($"写入文件失败: {path} <= {url} => {ex.Message}");
            }
        }

        private static Uri BuildReferrer(string url, string refererUrl)
        {
            if (!string.IsNullOrWhiteSpace(refererUrl) && Uri.TryCreate(refererUrl, UriKind.Absolute, out Uri explicitReferrer))
                return explicitReferrer;

            if (!Uri.TryCreate(url, UriKind.Absolute, out Uri imageUri))
                return null;

            return new Uri(imageUri.GetLeftPart(UriPartial.Authority) + "/");
        }
    }
}
