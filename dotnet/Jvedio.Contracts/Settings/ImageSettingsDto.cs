namespace Jvedio.Contracts.Settings;

public sealed class ImageSettingsDto
{
    /// <summary>海报优先来源：remote / local</summary>
    public string PosterPriority { get; set; } = "remote";

    /// <summary>图片缓存大小上限 (MB)，0 = 不限</summary>
    public int CacheSizeLimitMb { get; set; }

    /// <summary>是否自动清理过期缓存</summary>
    public bool AutoCleanExpiredCache { get; set; } = true;
}
