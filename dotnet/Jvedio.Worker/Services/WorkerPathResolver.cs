namespace Jvedio.Worker.Services;

public sealed class WorkerPathResolver
{
    private readonly ILogger<WorkerPathResolver> logger;

    public WorkerPathResolver(ILogger<WorkerPathResolver> logger)
    {
        this.logger = logger;
        SharedAppBaseDirectory = ResolveSharedAppBaseDirectory();
        CurrentUserFolder = ResolveCurrentUserFolder();
        ActorAvatarCacheFolder = Path.Combine(CurrentUserFolder, "cache", "actor-avatar");
        VideoCacheFolder = Path.Combine(CurrentUserFolder, "cache", "video");
        AppDataSqlitePath = Path.Combine(CurrentUserFolder, "app_datas.sqlite");
        AppConfigSqlitePath = Path.Combine(CurrentUserFolder, "app_configs.sqlite");
        Directory.CreateDirectory(ActorAvatarCacheFolder);
        IsTestEnvironment = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("JVEDIO_APP_BASE_DIR"));
    }

    public string ActorAvatarCacheFolder { get; }

    public string AppConfigSqlitePath { get; }

    public string AppDataSqlitePath { get; }

    public string CurrentUserFolder { get; }

    /// <summary>
    /// Whether the worker is running in a test environment (JVEDIO_APP_BASE_DIR is set).
    /// When true, sidecar files are written to <see cref="VideoCacheFolder"/>/{LibName}/{VID}/ instead of the video directory.
    /// </summary>
    public bool IsTestEnvironment { get; }

    public string SharedAppBaseDirectory { get; }

    /// <summary>
    /// Base directory for video sidecar cache: {CurrentUserFolder}/cache/video.
    /// Used in test environments (E2E) to separate sidecar from video source directories.
    /// </summary>
    public string VideoCacheFolder { get; }

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
