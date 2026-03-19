namespace Jvedio.Contracts.Settings;

public sealed class SettingsChangedEvent
{
    public string Action { get; set; } = string.Empty;

    public GetSettingsResponse Settings { get; set; } = new();

    public DateTimeOffset OccurredAtUtc { get; set; }
}
