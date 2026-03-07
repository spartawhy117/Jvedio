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

        public MetaTubeClient(string serverUrl)
        {
            ServerUrl = serverUrl?.Trim();
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
            using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, url)) {
                request.Headers.Add("Accept", "application/json");
                request.Headers.Add("User-Agent", $"Jvedio/{App.GetLocalVersion()}");
                using (HttpResponseMessage response = await HttpClient.SendAsync(request, cancellationToken).ConfigureAwait(false)) {
                    string content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    MetaTubeApiResponse<T> apiResponse = JsonConvert.DeserializeObject<MetaTubeApiResponse<T>>(content);
                    if (!response.IsSuccessStatusCode) {
                        string message = apiResponse?.Error?.Message ?? response.ReasonPhrase;
                        throw new Exception($"MetaTube request failed: {message}");
                    }

                    if (apiResponse == null || apiResponse.Data == null)
                        throw new Exception("MetaTube response data is null");

                    return apiResponse.Data;
                }
            }
        }
    }
}
