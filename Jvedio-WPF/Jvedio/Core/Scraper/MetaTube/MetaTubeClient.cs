using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace Jvedio.Core.Scraper.MetaTube
{
    public class MetaTubeClient
    {
        private const string MovieInfoApi = "/v1/movies";
        private const string MovieSearchApi = "/v1/movies/search";
        private const string ActorSearchApi = "/v1/actors/search";

        private static readonly HttpClient HttpClient = new HttpClient() {
            Timeout = TimeSpan.FromSeconds(30),
        };

        private string ServerUrl { get; set; }

        private Action<string> Log { get; set; }

        public MetaTubeClient(string serverUrl, Action<string> log = null)
        {
            ServerUrl = serverUrl?.Trim();
            Log = log;
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

        private string ComposeUrl(string path, NameValueCollection nv)
        {
            var query = HttpUtility.ParseQueryString(string.Empty);
            foreach (string key in nv)
                query.Add(key, nv.Get(key));

            var builder = new UriBuilder(ServerUrl) {
                Path = path,
                Query = query.ToString() ?? string.Empty,
            };
            return builder.ToString();
        }

        private async Task<T> GetDataAsync<T>(string url, CancellationToken cancellationToken)
        {
            Log?.Invoke($"请求: {url}");
            using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, url)) {
                request.Headers.Add("Accept", "application/json");
                request.Headers.Add("User-Agent", $"Jvedio/{App.GetLocalVersion()}");
                try {
                    using (HttpResponseMessage response = await HttpClient.SendAsync(request, cancellationToken).ConfigureAwait(false)) {
                        string content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        Log?.Invoke($"响应码: {(int)response.StatusCode} {response.ReasonPhrase}");
                        MetaTubeApiResponse<T> apiResponse = JsonConvert.DeserializeObject<MetaTubeApiResponse<T>>(content);
                        if (!response.IsSuccessStatusCode) {
                            string message = apiResponse?.Error?.Message ?? response.ReasonPhrase;
                            throw new Exception($"MetaTube 请求失败: {message}");
                        }

                        if (apiResponse == null || apiResponse.Data == null)
                            throw new Exception("MetaTube 响应数据为空");

                        return apiResponse.Data;
                    }
                } catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested) {
                    throw new TimeoutException($"MetaTube 请求超时（{HttpClient.Timeout.TotalSeconds:0} 秒）: {url}", ex);
                }
            }
        }
    }
}
