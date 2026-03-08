using Jvedio.Core.Scraper.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Core.Scraper.MetaTube
{
    public class MetaTubeScraperProvider : IScraperProvider
    {
        public Action<string> LogAction { get; set; }

        public string ProviderId => "metatube";

        public string DisplayName => "MetaTube";

        public bool Enabled => ConfigManager.MetaTubeConfig != null && ConfigManager.MetaTubeConfig.Enabled;

        public async Task<ScrapeResult> GetInfoAsync(ScrapeRequest request, CancellationToken cancellationToken)
        {
            if (!Enabled || request == null || string.IsNullOrWhiteSpace(request.VID))
                return null;

            string serverUrl = ConfigManager.MetaTubeConfig.ServerUrl;
            if (string.IsNullOrWhiteSpace(serverUrl))
                throw new Exception("MetaTube server url is empty");

            if (!request.ForceRefresh && MetaTubeCache.TryGetVideo(request.VID, out ScrapeResult cached)) {
                App.Logger.Info($"MetaTube cache hit: {request.VID}");
                LogAction?.Invoke($"缓存命中: {request.VID}");
                return cached;
            }

            App.Logger.Info($"MetaTube cache miss: {request.VID}");
            LogAction?.Invoke($"缓存未命中: {request.VID}");
            MetaTubeClient client = new MetaTubeClient(serverUrl, LogAction);
            LogAction?.Invoke($"搜索番号: {request.VID}");
            List<MetaTubeMovieSearchResult> searchResults = await client.SearchMovieAsync(request.VID, cancellationToken).ConfigureAwait(false);
            LogAction?.Invoke($"搜索结果数: {searchResults?.Count ?? 0}");
            MetaTubeMovieSearchResult selected = searchResults?
                .FirstOrDefault(arg => !string.IsNullOrWhiteSpace(arg.Number) && arg.Number.Equals(request.VID, StringComparison.OrdinalIgnoreCase))
                ?? searchResults?.FirstOrDefault();

            if (selected == null)
                return null;

            LogAction?.Invoke($"命中影片: {selected.Number} / {selected.Title}");
            MetaTubeMovieInfo movieInfo = await client.GetMovieInfoAsync(selected.Provider, selected.Id, cancellationToken).ConfigureAwait(false);
            LogAction?.Invoke($"拉取详情成功: provider={selected.Provider}, id={selected.Id}");
            List<MetaTubeActorSearchResult> actorInfos = new List<MetaTubeActorSearchResult>();
            if (movieInfo?.Actors != null) {
                foreach (string actorName in movieInfo.Actors.Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct()) {
                    try {
                        LogAction?.Invoke($"搜索演员: {actorName}");
                        List<MetaTubeActorSearchResult> results = await client.SearchActorAsync(actorName, cancellationToken).ConfigureAwait(false);
                        MetaTubeActorSearchResult actor = results?.FirstOrDefault(arg => !string.IsNullOrWhiteSpace(arg.Name) && arg.Name.Equals(actorName, StringComparison.OrdinalIgnoreCase))
                            ?? results?.FirstOrDefault();
                        if (actor != null)
                            actorInfos.Add(actor);
                    } catch (Exception ex) {
                        App.Logger.Warn($"MetaTube actor search failed[{actorName}]: {ex.Message}");
                    }
                }
            }

            ScrapeResult result = MetaTubeConverter.ToScrapeResult(movieInfo, actorInfos);
            MetaTubeCache.SaveVideo(request.VID, result);
            LogAction?.Invoke($"写入缓存: {MetaTubeCache.GetVideoCachePath(request.VID)}");
            return result;
        }
    }
}
