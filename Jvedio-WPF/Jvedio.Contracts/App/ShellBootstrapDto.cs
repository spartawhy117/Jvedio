namespace Jvedio.Contracts.App;

public sealed class ShellBootstrapDto
{
    public string StartRoute { get; set; } = "/home";

    public bool SupportsDynamicWorkerPort { get; set; }
}
