namespace Jvedio.Contracts.Settings;

public sealed class UpdateSettingsRequest
{
    public GeneralSettingsDto? General { get; set; }

    public MetaTubeSettingsDto? MetaTube { get; set; }

    public PlaybackSettingsDto? Playback { get; set; }

    public bool ResetToDefaults { get; set; }
}
