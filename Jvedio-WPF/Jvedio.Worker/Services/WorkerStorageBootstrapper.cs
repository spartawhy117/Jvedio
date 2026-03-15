using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class WorkerStorageBootstrapper
{
    private readonly ILogger<WorkerStorageBootstrapper> logger;
    private readonly SqliteConnectionFactory sqliteConnectionFactory;
    private readonly WorkerPathResolver workerPathResolver;

    public WorkerStorageBootstrapper(
        ILogger<WorkerStorageBootstrapper> logger,
        SqliteConnectionFactory sqliteConnectionFactory,
        WorkerPathResolver workerPathResolver)
    {
        this.logger = logger;
        this.sqliteConnectionFactory = sqliteConnectionFactory;
        this.workerPathResolver = workerPathResolver;
    }

    public void EnsureInitialized()
    {
        Directory.CreateDirectory(workerPathResolver.CurrentUserFolder);

        using (var appDataConnection = sqliteConnectionFactory.OpenAppDataConnection())
        {
            EnsureAppDataSchema(appDataConnection);
        }

        using (var appConfigConnection = sqliteConnectionFactory.OpenAppConfigConnection())
        {
            EnsureAppConfigSchema(appConfigConnection);
        }

        logger.LogInformation(
            "[Worker-HomeMvp] Worker storage ready at {AppDataSqlitePath} and {AppConfigSqlitePath}",
            workerPathResolver.AppDataSqlitePath,
            workerPathResolver.AppConfigSqlitePath);
    }

    private static void EnsureAppConfigSchema(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            CREATE TABLE IF NOT EXISTS app_configs (
                ConfigId INTEGER PRIMARY KEY AUTOINCREMENT,
                ConfigName VARCHAR(100) NOT NULL UNIQUE,
                ConfigValue TEXT DEFAULT '',
                CreateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')),
                UpdateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS app_configs_idx_ConfigName ON app_configs (ConfigName);
            """;
        command.ExecuteNonQuery();
    }

    private static void EnsureAppDataSchema(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText =
            """
            CREATE TABLE IF NOT EXISTS app_databases (
                DBId INTEGER PRIMARY KEY AUTOINCREMENT,
                Name VARCHAR(500),
                Count INTEGER DEFAULT 0,
                DataType INT DEFAULT 0,
                ImagePath TEXT DEFAULT '',
                ViewCount INT DEFAULT 0,
                Hide INT DEFAULT 0,
                ScanPath TEXT,
                ExtraInfo TEXT,
                CreateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')),
                UpdateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS name_idx ON app_databases (Name);
            CREATE INDEX IF NOT EXISTS type_idx ON app_databases (DataType);
            """;
        command.ExecuteNonQuery();
    }
}
