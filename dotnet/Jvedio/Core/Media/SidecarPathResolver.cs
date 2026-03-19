using System;
using System.IO;
using Jvedio.Entity;
using SuperUtils.IO;

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
            return Path.Combine(dir, GetBaseName(video) + ".nfo");
        }

        public static string GetPosterPath(Video video, string ext = ".jpg")
        {
            return GetImagePath(video, GetBaseName(video) + "-poster", ext);
        }

        public static string GetThumbPath(Video video, string ext = ".jpg")
        {
            return GetImagePath(video, GetBaseName(video) + "-thumb", ext);
        }

        public static string GetFanartPath(Video video, string ext = ".jpg")
        {
            return GetImagePath(video, GetBaseName(video) + "-fanart", ext);
        }

        public static string GetPreviewDirectory(Video video)
        {
            string dir = GetMovieDirectory(video);
            if (string.IsNullOrWhiteSpace(dir))
                return string.Empty;
            return Path.Combine(dir, GetBaseName(video) + "-preview");
        }

        public static string GetScreenShotDirectory(Video video)
        {
            string dir = GetMovieDirectory(video);
            if (string.IsNullOrWhiteSpace(dir))
                return string.Empty;
            return Path.Combine(dir, GetBaseName(video) + "-screenshot");
        }

        public static string GetGifPath(Video video, string ext = ".gif")
        {
            return GetImagePath(video, GetBaseName(video) + "-preview", ext);
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

        private static string GetBaseName(Video video)
        {
            if (video == null)
                return string.Empty;
            if (!string.IsNullOrWhiteSpace(video.VID))
                return video.VID.ToProperFileName();
            if (!string.IsNullOrWhiteSpace(video.Hash))
                return video.Hash.ToProperFileName();
            if (!string.IsNullOrWhiteSpace(video.Path))
                return Path.GetFileNameWithoutExtension(video.Path).ToProperFileName();
            return "movie";
        }
    }
}
