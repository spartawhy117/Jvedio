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

            CREATE TABLE IF NOT EXISTS metadata (
                DataID INTEGER PRIMARY KEY AUTOINCREMENT,
                DBId INTEGER,
                Title TEXT,
                Size INTEGER DEFAULT 0,
                Path TEXT,
                Hash VARCHAR(32),
                Country VARCHAR(50),
                ReleaseDate VARCHAR(30),
                ReleaseYear INT DEFAULT 1900,
                ViewCount INT DEFAULT 0,
                DataType INT DEFAULT 0,
                Rating FLOAT DEFAULT 0.0,
                RatingCount INT DEFAULT 0,
                FavoriteCount INT DEFAULT 0,
                Genre TEXT,
                Grade FLOAT DEFAULT 0.0,
                ViewDate VARCHAR(30),
                FirstScanDate VARCHAR(30),
                LastScanDate VARCHAR(30),
                CreateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')),
                UpdateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS metadata_idx_DBId ON metadata (DBId);
            CREATE INDEX IF NOT EXISTS metadata_idx_Title ON metadata (Title);
            CREATE INDEX IF NOT EXISTS metadata_idx_DataType ON metadata (DataType);

            CREATE TABLE IF NOT EXISTS metadata_video (
                MVID INTEGER PRIMARY KEY AUTOINCREMENT,
                DataID INTEGER,
                VID VARCHAR(500),
                VideoType INT DEFAULT 0,
                Series TEXT,
                Director VARCHAR(100),
                Studio TEXT,
                Publisher TEXT,
                Plot TEXT,
                Outline TEXT,
                Duration INT DEFAULT 0,
                SubSection TEXT,
                ImageUrls TEXT DEFAULT '',
                WebType VARCHAR(100),
                WebUrl VARCHAR(2000),
                ExtraInfo TEXT,
                UNIQUE(DataID, VID)
            );
            CREATE INDEX IF NOT EXISTS metadata_video_idx_DataID ON metadata_video (DataID);
            CREATE INDEX IF NOT EXISTS metadata_video_idx_VID ON metadata_video (VID);

            CREATE TABLE IF NOT EXISTS actor_info (
                ActorID INTEGER PRIMARY KEY AUTOINCREMENT,
                ActorName VARCHAR(500),
                Country VARCHAR(500),
                Nation VARCHAR(500),
                BirthPlace VARCHAR(500),
                Birthday VARCHAR(100),
                Age INT,
                BloodType VARCHAR(100),
                Height INT,
                Weight INT,
                Gender INT DEFAULT 0,
                Hobby VARCHAR(500),
                Cup VARCHAR(1) DEFAULT 'Z',
                Chest INT,
                Waist INT,
                Hipline INT,
                WebType VARCHAR(100),
                WebUrl VARCHAR(2000),
                ImageUrl TEXT DEFAULT '',
                Grade FLOAT DEFAULT 0.0,
                ExtraInfo TEXT,
                CreateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')),
                UpdateDate VARCHAR(30) DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS actor_info_idx_ActorName ON actor_info (ActorName);

            CREATE TABLE IF NOT EXISTS metadata_to_actor (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                ActorID INTEGER,
                DataID INT,
                UNIQUE(ActorID, DataID)
            );
            CREATE INDEX IF NOT EXISTS metadata_to_actor_idx_ActorID ON metadata_to_actor (ActorID);
            CREATE INDEX IF NOT EXISTS metadata_to_actor_idx_DataID ON metadata_to_actor (DataID);
            """;
        command.ExecuteNonQuery();

        // Ensure ImageUrl column exists on actor_info (may be missing in databases
        // created by the original WPF app or earlier Worker versions).
        EnsureColumnExists(connection, "actor_info", "ImageUrl", "TEXT DEFAULT ''");
    }

    private static void EnsureColumnExists(
        SqliteConnection connection, string table, string column, string definition)
    {
        using var pragma = connection.CreateCommand();
        pragma.CommandText = $"PRAGMA table_info({table});";
        using var reader = pragma.ExecuteReader();
        while (reader.Read())
        {
            if (string.Equals(reader.GetString(1), column, StringComparison.OrdinalIgnoreCase))
            {
                return; // Column already exists
            }
        }

        reader.Close();

        using var alter = connection.CreateCommand();
        alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {definition};";
        alter.ExecuteNonQuery();
    }
}
