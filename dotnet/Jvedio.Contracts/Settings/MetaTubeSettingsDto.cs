namespace Jvedio.Contracts.Settings;

public sealed class MetaTubeSettingsDto
{
    public int RequestTimeoutSeconds { get; set; } = 60;

    public string ServerUrl { get; set; } = string.Empty;
}
