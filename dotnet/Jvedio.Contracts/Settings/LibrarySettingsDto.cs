namespace Jvedio.Contracts.Settings;

public sealed class LibrarySettingsDto
{
    /// <summary>新建库时是否默认启用自动扫描</summary>
    public bool DefaultAutoScan { get; set; } = true;

    /// <summary>默认排序方式：releaseDate / title / lastPlayedAt / lastScanAt</summary>
    public string DefaultSortBy { get; set; } = "releaseDate";

    /// <summary>默认排序方向：asc / desc</summary>
    public string DefaultSortOrder { get; set; } = "desc";
}
