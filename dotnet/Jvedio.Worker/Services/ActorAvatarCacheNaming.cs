using System.Security.Cryptography;
using System.Text;

namespace Jvedio.Worker.Services;

internal static class ActorAvatarCacheNaming
{
    private static readonly string[] AvatarExtensions = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"];

    public static string BuildCacheFilePath(string cacheDirectory, string actorName, string avatarUrl)
    {
        return Path.Combine(cacheDirectory, BuildPrimaryKey(actorName) + GetExtensionFromUrl(avatarUrl));
    }

    public static IEnumerable<string> BuildLookupKeys(string actorName, string? actorId, string? imageUrl, string? webUrl)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var candidate in new[]
        {
            BuildPrimaryKey(actorName),
            SanitizeFileName(actorId),
            TryExtractLegacyCacheKey(imageUrl),
            TryExtractLegacyCacheKey(webUrl),
            ComputeLegacyActorNameHash(actorName),
        })
        {
            if (!string.IsNullOrWhiteSpace(candidate) && seen.Add(candidate))
            {
                yield return candidate;
            }
        }
    }

    public static string BuildPrimaryKey(string actorName)
    {
        var normalized = NormalizeDisplayName(actorName);
        return string.IsNullOrWhiteSpace(normalized) ? "unknown_actor" : normalized;
    }

    public static string GetExtensionFromUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return ".jpg";
        }

        var extension = Path.GetExtension(uri.AbsolutePath);
        return string.IsNullOrWhiteSpace(extension) ? ".jpg" : extension;
    }

    public static string? TryPromoteToPrimaryPath(string cacheDirectory, string actorName, string? existingPath)
    {
        if (string.IsNullOrWhiteSpace(existingPath) || !File.Exists(existingPath))
        {
            return existingPath;
        }

        var extension = Path.GetExtension(existingPath);
        var primaryPath = Path.Combine(cacheDirectory, BuildPrimaryKey(actorName) + extension);
        if (string.Equals(existingPath, primaryPath, StringComparison.OrdinalIgnoreCase))
        {
            return existingPath;
        }

        if (File.Exists(primaryPath))
        {
            return primaryPath;
        }

        try
        {
            Directory.CreateDirectory(cacheDirectory);
            File.Move(existingPath, primaryPath);
            return primaryPath;
        }
        catch
        {
            return existingPath;
        }
    }

    public static string? TryResolveExistingPath(string cacheDirectory, string actorName, string? actorId, string? imageUrl, string? webUrl)
    {
        foreach (var cacheKey in BuildLookupKeys(actorName, actorId, imageUrl, webUrl))
        {
            foreach (var extension in AvatarExtensions)
            {
                var cachedPath = Path.Combine(cacheDirectory, $"{cacheKey}{extension}");
                if (File.Exists(cachedPath))
                {
                    return cachedPath;
                }
            }
        }

        return null;
    }

    private static string ComputeLegacyActorNameHash(string actorName)
    {
        var normalized = NormalizeDisplayName(actorName);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "unknown_actor";
        }

        var bytes = SHA1.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string NormalizeDisplayName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var trimmed = value.Trim();
        var builder = new StringBuilder(trimmed.Length);
        var previousWasWhitespace = false;
        foreach (var character in trimmed)
        {
            if (char.IsWhiteSpace(character))
            {
                if (!previousWasWhitespace)
                {
                    builder.Append(' ');
                    previousWasWhitespace = true;
                }

                continue;
            }

            previousWasWhitespace = false;
            builder.Append(Array.IndexOf(Path.GetInvalidFileNameChars(), character) >= 0 ? '_' : character);
        }

        return builder
            .ToString()
            .Trim()
            .TrimEnd('.', ' ');
    }

    private static string? SanitizeFileName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var result = value.Trim();
        foreach (var invalid in Path.GetInvalidFileNameChars())
        {
            result = result.Replace(invalid, '_');
        }

        return string.IsNullOrWhiteSpace(result) ? null : result;
    }

    private static string? TryExtractLegacyCacheKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            var fromUrl = Path.GetFileNameWithoutExtension(uri.AbsolutePath);
            if (!string.IsNullOrWhiteSpace(fromUrl))
            {
                return fromUrl;
            }
        }

        var fileName = Path.GetFileNameWithoutExtension(value.Trim());
        return string.IsNullOrWhiteSpace(fileName) ? null : fileName;
    }
}
