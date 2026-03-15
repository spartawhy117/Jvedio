namespace Jvedio.Contracts.App;

public sealed class ShellBootstrapDto
{
    public string StartRoute { get; set; } = "/home";

    public bool SupportsDynamicWorkerPort { get; set; }

    public string Theme { get; set; } = "system";

    public bool TaskDrawerEnabled { get; set; }
}
