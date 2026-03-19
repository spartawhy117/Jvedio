using System.Text.Json.Nodes;

using Microsoft.Data.Sqlite;

namespace Jvedio.Worker.Services;

public sealed class ConfigStoreService
{
    private readonly SqliteConnectionFactory sqliteConnectionFactory;

    public ConfigStoreService(SqliteConnectionFactory sqliteConnectionFactory)
    {
        this.sqliteConnectionFactory = sqliteConnectionFactory;
    }

    public JsonObject LoadConfigObject(string configName)
    {
        using var connection = sqliteConnectionFactory.OpenAppConfigConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT ConfigValue FROM app_configs WHERE ConfigName = $configName LIMIT 1;";
        command.Parameters.AddWithValue("$configName", configName);

        var result = command.ExecuteScalar() as string;
        if (string.IsNullOrWhiteSpace(result))
        {
            return new JsonObject();
        }

        return ParseObject(result);
    }

    public void UpsertConfigObject(string configName, Action<JsonObject> update)
    {
        using var connection = sqliteConnectionFactory.OpenAppConfigConnection();
        var document = LoadConfigObject(configName);
        update(document);

        using var command = connection.CreateCommand();
        command.CommandText =
            """
            INSERT INTO app_configs (ConfigName, ConfigValue, UpdateDate)
            VALUES ($configName, $configValue, STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime'))
            ON CONFLICT(ConfigName) DO UPDATE SET
                ConfigValue = excluded.ConfigValue,
                UpdateDate = excluded.UpdateDate;
            """;
        command.Parameters.AddWithValue("$configName", configName);
        command.Parameters.AddWithValue("$configValue", document.ToJsonString());
        command.ExecuteNonQuery();
    }

    public bool ReadBoolean(JsonObject document, string propertyName, bool defaultValue = false)
    {
        if (!document.TryGetPropertyValue(propertyName, out var node) || node is null)
        {
            return defaultValue;
        }

        if (node is JsonValue value)
        {
            if (value.TryGetValue<bool>(out var boolValue))
            {
                return boolValue;
            }

            if (value.TryGetValue<long>(out var longValue))
            {
                return longValue != 0;
            }

            if (value.TryGetValue<string>(out var stringValue) && bool.TryParse(stringValue, out var parsed))
            {
                return parsed;
            }
        }

        return defaultValue;
    }

    public long ReadInt64(JsonObject document, string propertyName, long defaultValue = 0)
    {
        if (!document.TryGetPropertyValue(propertyName, out var node) || node is null)
        {
            return defaultValue;
        }

        if (node is JsonValue value)
        {
            if (value.TryGetValue<long>(out var longValue))
            {
                return longValue;
            }

            if (value.TryGetValue<int>(out var intValue))
            {
                return intValue;
            }

            if (value.TryGetValue<string>(out var stringValue) && long.TryParse(stringValue, out var parsed))
            {
                return parsed;
            }
        }

        return defaultValue;
    }

    public string ReadString(JsonObject document, string propertyName, string defaultValue = "")
    {
        if (!document.TryGetPropertyValue(propertyName, out var node) || node is null)
        {
            return defaultValue;
        }

        if (node is JsonValue value && value.TryGetValue<string>(out var stringValue) && !string.IsNullOrWhiteSpace(stringValue))
        {
            return stringValue;
        }

        return defaultValue;
    }

    private JsonObject ParseObject(string json)
    {
        return JsonNode.Parse(json) as JsonObject ?? new JsonObject();
    }
}
