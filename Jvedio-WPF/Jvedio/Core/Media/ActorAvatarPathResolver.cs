using Jvedio.Core.Global;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Jvedio.Core.Media
{
    public static class ActorAvatarPathResolver
    {
        public static string GetAvatarPath(string actorId, string actorName, string ext = ".jpg")
        {
            string normalizedExt = string.IsNullOrWhiteSpace(ext) ? ".jpg" : ext;
            if (!normalizedExt.StartsWith(".", StringComparison.Ordinal))
                normalizedExt = "." + normalizedExt;

            string key = string.IsNullOrWhiteSpace(actorId) ? GetFallbackKey(actorName) : Normalize(actorId);
            return Path.Combine(PathManager.MetaTubeAvatarPath, key + normalizedExt);
        }

        private static string GetFallbackKey(string actorName)
        {
            string value = Normalize(actorName);
            if (string.IsNullOrWhiteSpace(value))
                value = "unknown_actor";

            using (SHA1 sha1 = SHA1.Create()) {
                byte[] bytes = Encoding.UTF8.GetBytes(value);
                byte[] hash = sha1.ComputeHash(bytes);
                StringBuilder builder = new StringBuilder();
                foreach (byte item in hash) {
                    builder.Append(item.ToString("x2"));
                }
                return builder.ToString();
            }
        }

        private static string Normalize(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            string result = value.Trim();
            foreach (char c in Path.GetInvalidFileNameChars()) {
                result = result.Replace(c, '_');
            }

            return result;
        }
    }
}
