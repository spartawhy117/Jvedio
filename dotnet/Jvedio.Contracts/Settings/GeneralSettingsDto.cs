namespace Jvedio.Contracts.Settings;

public sealed class GeneralSettingsDto
{
    public string CurrentLanguage { get; set; } = "zh-CN";

    public bool Debug { get; set; }
}
