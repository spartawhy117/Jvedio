using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class SqliteConnectionFactory
{
    private readonly WorkerPathResolver workerPathResolver;

    public SqliteConnectionFactory(WorkerPathResolver workerPathResolver)
    {
        this.workerPathResolver = workerPathResolver;
    }

    public SqliteConnection OpenAppConfigConnection()
    {
        var connection = new SqliteConnection($"Data Source={workerPathResolver.AppConfigSqlitePath};Mode=ReadWriteCreate;Cache=Shared");
        connection.Open();
        return connection;
    }

    public SqliteConnection OpenAppDataConnection()
    {
        var connection = new SqliteConnection($"Data Source={workerPathResolver.AppDataSqlitePath};Mode=ReadWriteCreate;Cache=Shared");
        connection.Open();
        return connection;
    }
}
