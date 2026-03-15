namespace Jvedio.Contracts.Settings;

public sealed class PlaybackSettingsDto
{
    public string PlayerPath { get; set; } = string.Empty;

    public bool UseSystemDefaultFallback { get; set; } = true;
}
