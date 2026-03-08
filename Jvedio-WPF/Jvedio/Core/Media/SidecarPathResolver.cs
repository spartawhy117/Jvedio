using System;
using System.IO;
using Jvedio.Entity;

namespace Jvedio.Core.Media
{
    public static class SidecarPathResolver
    {
        public static string GetMovieDirectory(Video video)
        {
            if (video == null || string.IsNullOrWhiteSpace(video.Path) || !File.Exists(video.Path))
                return string.Empty;
            return Path.GetDirectoryName(video.Path);
        }

        public static string GetMovieNfoPath(Video video)
        {
            string dir = GetMovieDirectory(video);
            if (string.IsNullOrWhiteSpace(dir))
                return string.Empty;
            return Path.Combine(dir, "movie.nfo");
        }

        public static string GetPosterPath(Video video, string ext = ".jpg")
        {
            return GetImagePath(video, "poster", ext);
        }

        public static string GetThumbPath(Video video, string ext = ".jpg")
        {
            return GetImagePath(video, "thumb", ext);
        }

        public static string GetFanartPath(Video video, string ext = ".jpg")
        {
            return GetImagePath(video, "fanart", ext);
        }

        private static string GetImagePath(Video video, string fileName, string ext)
        {
            string dir = GetMovieDirectory(video);
            if (string.IsNullOrWhiteSpace(dir))
                return string.Empty;

            string normalizedExt = string.IsNullOrWhiteSpace(ext) ? ".jpg" : ext;
            if (!normalizedExt.StartsWith(".", StringComparison.Ordinal))
                normalizedExt = "." + normalizedExt;
            return Path.Combine(dir, fileName + normalizedExt);
        }
    }
}
