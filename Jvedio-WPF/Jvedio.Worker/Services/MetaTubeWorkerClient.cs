using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Jvedio.Worker.Services;

public sealed class MetaTubeWorkerClient
{
    private readonly HttpClient httpClient;
    private readonly ILogger<MetaTubeWorkerClient> logger;
    private readonly string serverUrl;

    public MetaTubeWorkerClient(string serverUrl, int timeoutSeconds, ILogger<MetaTubeWorkerClient> logger)
    {
        this.serverUrl = serverUrl.TrimEnd('/');
        this.logger = logger;
        httpClient = new HttpClient(new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
            UseCookies = false,
        })
        {
            Timeout = TimeSpan.FromSeconds(Math.Max(15, timeoutSeconds)),
        };

        httpClient.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");
        httpClient.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Jvedio.Worker/Stage-D");
    }

    public async Task WarmupAsync(CancellationToken cancellationToken)
    {
        await GetServiceDocumentAsync(cancellationToken);
        await GetProvidersAsync(cancellationToken);
    }

    public Task<Dictionary<string, object>?> GetServiceDocumentAsync(CancellationToken cancellationToken)
    {
        return GetAsync<Dictionary<string, object>>("/", cancellationToken);
    }

    public Task<MetaTubeProvidersResponse?> GetProvidersAsync(CancellationToken cancellationToken)
    {
        return GetAsync<MetaTubeProvidersResponse>("/v1/providers", cancellationToken);
    }

    public async Task<IReadOnlyList<MetaTubeMovieSearchResult>> SearchMovieAsync(string vid, CancellationToken cancellationToken)
    {
        var path = $"/v1/movies/search?q={Uri.EscapeDataString(vid)}&provider=&fallback=true";
        return await GetAsync<List<MetaTubeMovieSearchResult>>(path, cancellationToken) ?? new List<MetaTubeMovieSearchResult>();
    }

    public async Task<MetaTubeMovieInfo?> GetMovieInfoAsync(string provider, string id, CancellationToken cancellationToken)
    {
        return await GetAsync<MetaTubeMovieInfo>($"/v1/movies/{Uri.EscapeDataString(provider)}/{Uri.EscapeDataString(id)}?lazy=true", cancellationToken);
    }

    public async Task<IReadOnlyList<MetaTubeActorSearchResult>> SearchActorAsync(string actorName, CancellationToken cancellationToken)
    {
        var path = $"/v1/actors/search?q={Uri.EscapeDataString(actorName)}&provider=&fallback=true";
        return await GetAsync<List<MetaTubeActorSearchResult>>(path, cancellationToken) ?? new List<MetaTubeActorSearchResult>();
    }

    public async Task<MetaTubeActorInfo?> GetActorInfoAsync(string provider, string id, CancellationToken cancellationToken)
    {
        return await GetAsync<MetaTubeActorInfo>($"/v1/actors/{Uri.EscapeDataString(provider)}/{Uri.EscapeDataString(id)}?lazy=true", cancellationToken);
    }

    private async Task<T?> GetAsync<T>(string relativePath, CancellationToken cancellationToken)
    {
        var requestUrl = $"{serverUrl}{relativePath}";
        logger.LogInformation("[Worker-HomeMvp] MetaTube request: {RequestUrl}", requestUrl);
        using var response = await httpClient.GetAsync(requestUrl, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<MetaTubeApiResponse<T>>(cancellationToken: cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var message = payload?.Error?.Message ?? response.ReasonPhrase ?? "MetaTube request failed.";
            throw new InvalidOperationException($"MetaTube request failed: {message}");
        }

        if (payload is null)
        {
            throw new InvalidOperationException("MetaTube response payload is empty.");
        }

        return payload.Data;
    }
}

public sealed class MetaTubeApiResponse<T>
{
    [JsonPropertyName("data")]
    public T? Data { get; set; }

    [JsonPropertyName("error")]
    public MetaTubeApiError? Error { get; set; }
}

public sealed class MetaTubeApiError
{
    [JsonPropertyName("code")]
    public int Code { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

public sealed class MetaTubeProvidersResponse
{
    [JsonPropertyName("actor_providers")]
    public Dictionary<string, string> ActorProviders { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    [JsonPropertyName("movie_providers")]
    public Dictionary<string, string> MovieProviders { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class MetaTubeMovieSearchResult
{
    [JsonPropertyName("actors")]
    public string[] Actors { get; set; } = Array.Empty<string>();

    [JsonPropertyName("cover_url")]
    public string CoverUrl { get; set; } = string.Empty;

    [JsonPropertyName("homepage")]
    public string Homepage { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("number")]
    public string Number { get; set; } = string.Empty;

    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public float Score { get; set; }

    [JsonPropertyName("thumb_url")]
    public string ThumbUrl { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
}

public sealed class MetaTubeMovieInfo : MetaTubeMovieSearchResult
{
    [JsonPropertyName("big_cover_url")]
    public string BigCoverUrl { get; set; } = string.Empty;

    [JsonPropertyName("big_thumb_url")]
    public string BigThumbUrl { get; set; } = string.Empty;

    [JsonPropertyName("director")]
    public string Director { get; set; } = string.Empty;

    [JsonPropertyName("genres")]
    public string[] Genres { get; set; } = Array.Empty<string>();

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("maker")]
    public string Maker { get; set; } = string.Empty;

    [JsonPropertyName("preview_images")]
    public string[] PreviewImages { get; set; } = Array.Empty<string>();

    [JsonPropertyName("release_date")]
    public DateTimeOffset? ReleaseDate { get; set; }

    [JsonPropertyName("runtime")]
    public int Runtime { get; set; }

    [JsonPropertyName("series")]
    public string Series { get; set; } = string.Empty;

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;
}

public class MetaTubeActorSearchResult
{
    [JsonPropertyName("homepage")]
    public string Homepage { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("images")]
    public string[] Images { get; set; } = Array.Empty<string>();

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;
}

public sealed class MetaTubeActorInfo : MetaTubeActorSearchResult
{
}
