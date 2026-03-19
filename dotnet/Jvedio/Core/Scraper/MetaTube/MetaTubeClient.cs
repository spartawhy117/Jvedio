using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Core.Scraper.MetaTube
{
    public class MetaTubeClient
    {
        private const string MovieInfoApi = "/v1/movies";
        private const string MovieSearchApi = "/v1/movies/search";
        private const string ActorInfoApi = "/v1/actors";
        private const string ActorSearchApi = "/v1/actors/search";

        private readonly HttpClient HttpClient;

        private string ServerUrl { get; set; }

        private Action<string> Log { get; set; }

        public MetaTubeClient(string serverUrl, Action<string> log = null)
        {
            ServerUrl = serverUrl?.Trim();
            Log = log;
            HttpClientHandler handler = new HttpClientHandler() {
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
                UseCookies = false,
            };
            HttpClient = new HttpClient(handler) {
                Timeout = TimeSpan.FromSeconds(Math.Max(30, ConfigManager.MetaTubeConfig?.RequestTimeoutSeconds ?? 60)),
            };
        }

        static MetaTubeClient()
        {
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        }

        public async Task<MetaTubeApiResponse<Dictionary<string, object>>> PingRootAsync(CancellationToken cancellationToken)
        {
            string url = new UriBuilder(ServerUrl) { Path = "/" }.ToString();
            return await GetRawAsync<Dictionary<string, object>>(url, cancellationToken);
        }

        public async Task<MetaTubeProvidersResponse> GetProvidersAsync(CancellationToken cancellationToken)
        {
            string url = ComposeUrl("/v1/providers", new NameValueCollection());
            return await GetDataAsync<MetaTubeProvidersResponse>(url, cancellationToken);
        }

        public async Task WarmupAsync(CancellationToken cancellationToken)
        {
            Log?.Invoke("预热步骤 1/2：访问根地址");
            MetaTubeApiResponse<Dictionary<string, object>> root = await PingRootAsync(cancellationToken);
            Log?.Invoke($"根地址预热成功: app={TryGetValue(root?.Data, "app")}, version={TryGetValue(root?.Data, "version")}");
            Log?.Invoke("预热步骤 2/2：访问 providers 接口");
            MetaTubeProvidersResponse providers = await GetProvidersAsync(cancellationToken);
            Log?.Invoke($"providers 预热成功: movie={providers?.MovieProviders?.Count ?? 0}, actor={providers?.ActorProviders?.Count ?? 0}");
            Log?.Invoke("预热完成，可继续执行搜刮");
        }

        public async Task<List<MetaTubeMovieSearchResult>> SearchMovieAsync(string number, CancellationToken cancellationToken)
        {
            string url = ComposeUrl(MovieSearchApi, new NameValueCollection() {
                { "q", number },
                { "provider", string.Empty },
                { "fallback", true.ToString() },
            });
            return await GetDataAsync<List<MetaTubeMovieSearchResult>>(url, cancellationToken);
        }

        public async Task<MetaTubeMovieInfo> GetMovieInfoAsync(string provider, string id, CancellationToken cancellationToken)
        {
            string url = ComposeUrl($"{MovieInfoApi}/{provider}/{id}", new NameValueCollection() {
                { "lazy", true.ToString() },
            });
            return await GetDataAsync<MetaTubeMovieInfo>(url, cancellationToken);
        }

        public async Task<List<MetaTubeActorSearchResult>> SearchActorAsync(string actorName, CancellationToken cancellationToken)
        {
            string url = ComposeUrl(ActorSearchApi, new NameValueCollection() {
                { "q", actorName },
                { "provider", string.Empty },
                { "fallback", true.ToString() },
            });
            return await GetDataAsync<List<MetaTubeActorSearchResult>>(url, cancellationToken);
        }

        public async Task<MetaTubeActorInfo> GetActorInfoAsync(string provider, string id, CancellationToken cancellationToken)
        {
            string url = ComposeUrl($"{ActorInfoApi}/{provider}/{id}", new NameValueCollection() {
                { "lazy", true.ToString() },
            });
            return await GetDataAsync<MetaTubeActorInfo>(url, cancellationToken);
        }

        private string ComposeUrl(string path, NameValueCollection nv)
        {
            StringBuilder query = new StringBuilder();
            if (nv != null) {
                foreach (string key in nv.AllKeys.Where(arg => arg != null)) {
                    if (query.Length > 0)
                        query.Append('&');
                    string value = nv.Get(key) ?? string.Empty;
                    query.Append(Uri.EscapeDataString(key));
                    query.Append('=');
                    query.Append(Uri.EscapeDataString(value));
                }
            }

            var builder = new UriBuilder(ServerUrl) {
                Path = path,
                Query = query.ToString(),
            };
            return builder.ToString();
        }

        private async Task<T> GetDataAsync<T>(string url, CancellationToken cancellationToken)
        {
            MetaTubeApiResponse<T> response = await GetRawAsync<T>(url, cancellationToken);
            if (response == null || response.Data == null)
                throw new Exception("MetaTube 响应数据为空");
            return response.Data;
        }

        private async Task<MetaTubeApiResponse<T>> GetRawAsync<T>(string url, CancellationToken cancellationToken)
        {
            Stopwatch stopwatch = Stopwatch.StartNew();
            Log?.Invoke($"请求: {url}");
            Log?.Invoke($"超时设置: {HttpClient.Timeout.TotalSeconds:0} 秒");
            using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, url)) {
                request.Headers.Add("Accept", "application/json");
                request.Headers.Add("User-Agent", $"Jvedio/{App.GetLocalVersion()}");
                try {
                    Log?.Invoke("开始发送请求");
                    using (HttpResponseMessage response = await HttpClient.SendAsync(request, cancellationToken).ConfigureAwait(false)) {
                        Log?.Invoke($"收到响应头，耗时: {stopwatch.ElapsedMilliseconds} ms");
                        string content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        Log?.Invoke($"读取响应体完成，耗时: {stopwatch.ElapsedMilliseconds} ms，长度: {content?.Length ?? 0}");
                        Log?.Invoke($"响应码: {(int)response.StatusCode} {response.ReasonPhrase}");
                        MetaTubeApiResponse<T> apiResponse = JsonConvert.DeserializeObject<MetaTubeApiResponse<T>>(content);
                        if (!response.IsSuccessStatusCode) {
                            string message = apiResponse?.Error?.Message ?? response.ReasonPhrase;
                            throw new Exception($"MetaTube 请求失败: {message}");
                        }
                        Log?.Invoke($"请求成功，总耗时: {stopwatch.ElapsedMilliseconds} ms");
                        return apiResponse;
                    }
                } catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested) {
                    Log?.Invoke($"请求超时，总耗时: {stopwatch.ElapsedMilliseconds} ms");
                    throw new TimeoutException($"MetaTube 请求超时（{HttpClient.Timeout.TotalSeconds:0} 秒）: {url}", ex);
                } catch (HttpRequestException ex) {
                    Log?.Invoke($"HTTP 请求异常，总耗时: {stopwatch.ElapsedMilliseconds} ms，类型: {ex.GetType().Name}");
                    throw;
                }
            }
        }

        private string TryGetValue(Dictionary<string, object> dict, string key)
        {
            if (dict == null || string.IsNullOrWhiteSpace(key) || !dict.ContainsKey(key) || dict[key] == null)
                return string.Empty;
            return Convert.ToString(dict[key], CultureInfo.InvariantCulture);
        }
    }
}
