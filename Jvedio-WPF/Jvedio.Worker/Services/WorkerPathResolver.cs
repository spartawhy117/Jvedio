namespace Jvedio.Worker.Services;

public sealed class WorkerPathResolver
{
    private readonly ILogger<WorkerPathResolver> logger;

    public WorkerPathResolver(ILogger<WorkerPathResolver> logger)
    {
        this.logger = logger;
        SharedAppBaseDirectory = ResolveSharedAppBaseDirectory();
        CurrentUserFolder = ResolveCurrentUserFolder();
        AppDataSqlitePath = Path.Combine(CurrentUserFolder, "app_datas.sqlite");
        AppConfigSqlitePath = Path.Combine(CurrentUserFolder, "app_configs.sqlite");
    }

    public string AppConfigSqlitePath { get; }

    public string AppDataSqlitePath { get; }

    public string CurrentUserFolder { get; }

    public string SharedAppBaseDirectory { get; }

    private string ResolveCurrentUserFolder()
    {
        var userDirectory = Path.Combine(SharedAppBaseDirectory, "data", Environment.UserName);
        try
        {
            Directory.CreateDirectory(userDirectory);
            return userDirectory;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Worker-HomeMvp] Failed to create user-scoped data directory, falling back to shared data folder.");
            var fallbackDirectory = Path.Combine(SharedAppBaseDirectory, "data");
            Directory.CreateDirectory(fallbackDirectory);
            return fallbackDirectory;
        }
    }

    private string ResolveSharedAppBaseDirectory()
    {
        var overridePath = Environment.GetEnvironmentVariable("JVEDIO_APP_BASE_DIR");
        if (!string.IsNullOrWhiteSpace(overridePath) && Directory.Exists(overridePath))
        {
            return overridePath;
        }

        var candidates = new[]
        {
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Jvedio", "bin", "Release")),
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Jvedio", "bin", "Debug")),
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Jvedio", "bin", "Release")),
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Jvedio", "bin", "Debug")),
        };

        foreach (var candidate in candidates)
        {
            if (Directory.Exists(candidate))
            {
                return candidate;
            }
        }

        throw new InvalidOperationException("Unable to locate the shared Jvedio app base directory for worker storage.");
    }
}
