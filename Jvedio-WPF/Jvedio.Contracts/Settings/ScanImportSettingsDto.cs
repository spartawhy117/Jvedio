namespace Jvedio.Contracts.Settings;

public sealed class ScanImportSettingsDto
{
    /// <summary>扫描递归深度，0 = 无限递归</summary>
    public int ScanDepth { get; set; }

    /// <summary>排除规则（逗号分隔的通配符，如 *.tmp,Thumbs.db）</summary>
    public string ExcludePatterns { get; set; } = string.Empty;

    /// <summary>整理模式：none / byVid / byActor</summary>
    public string OrganizeMode { get; set; } = "none";
}
