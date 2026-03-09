using Jvedio.Core.Global;
using Jvedio.Core.Scraper.Models;
using Newtonsoft.Json;
using System;
using System.IO;

namespace Jvedio.Core.Scraper.MetaTube
{
    public static class MetaTubeCache
    {
        public static bool TryGetVideo(string vid, out ScrapeResult result)
        {
            result = null;
            if (string.IsNullOrWhiteSpace(vid) || !ConfigManager.MetaTubeConfig.JsonCacheEnabled)
                return false;

            string path = GetVideoCachePath(vid);
            if (!File.Exists(path))
                return false;

            string json = File.ReadAllText(path);
            result = JsonConvert.DeserializeObject<ScrapeResult>(json);
            return result != null;
        }

        public static void SaveVideo(string vid, ScrapeResult result)
        {
            if (string.IsNullOrWhiteSpace(vid) || result == null || !ConfigManager.MetaTubeConfig.JsonCacheEnabled)
                return;

            string path = GetVideoCachePath(vid);
            string dir = Path.GetDirectoryName(path);
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);
            File.WriteAllText(path, JsonConvert.SerializeObject(result, Formatting.Indented));
        }

        public static string GetVideoCachePath(string vid)
        {
            return Path.Combine(PathManager.VideoCachePath, NormalizeKey(vid) + ".json");
        }

        private static string NormalizeKey(string value)
        {
            string key = value.Trim().ToUpperInvariant();
            foreach (char c in Path.GetInvalidFileNameChars()) {
                key = key.Replace(c, '_');
            }

            return key;
        }
    }
}
