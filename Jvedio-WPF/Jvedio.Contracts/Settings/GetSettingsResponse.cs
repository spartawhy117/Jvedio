namespace Jvedio.Contracts.Settings;

public sealed class GetSettingsResponse
{
    public GeneralSettingsDto General { get; set; } = new();

    public MetaTubeSettingsDto MetaTube { get; set; } = new();

    public PlaybackSettingsDto Playback { get; set; } = new();
}
