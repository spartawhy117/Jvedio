namespace Jvedio.Contracts.Settings;

public sealed class LibrarySettingsDto
{
    /// <summary>新建库时是否默认启用自动扫描</summary>
    public bool DefaultAutoScan { get; set; } = true;
}
