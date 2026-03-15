namespace Jvedio.Contracts.Settings;

public sealed class UpdateSettingsResponse
{
    public bool ResetToDefaultsApplied { get; set; }

    public GetSettingsResponse Settings { get; set; } = new();

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
