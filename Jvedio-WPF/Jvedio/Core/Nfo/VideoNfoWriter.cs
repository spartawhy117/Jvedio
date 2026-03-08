using Jvedio.Core.Media;
using System.IO;
using Jvedio.Entity;

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
    }
}
