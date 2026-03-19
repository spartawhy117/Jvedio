namespace Jvedio.Contracts.Settings;

public sealed class UpdateSettingsRequest
{
    public GeneralSettingsDto? General { get; set; }

    public ImageSettingsDto? Image { get; set; }

    public ScanImportSettingsDto? ScanImport { get; set; }

    public PlaybackSettingsDto? Playback { get; set; }

    public LibrarySettingsDto? Library { get; set; }

    public MetaTubeSettingsDto? MetaTube { get; set; }

    public bool ResetToDefaults { get; set; }
}
