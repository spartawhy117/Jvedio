using Jvedio.Core.Crawler;
using Jvedio.Core.Enums;
using Jvedio.Core.Exceptions;
using Jvedio.Core.Plugins.Crawler;
using Jvedio.Core.Scraper;
using Jvedio.Core.Scraper.Models;
using Jvedio.Entity;
using SuperControls.Style;
using SuperControls.Style.Plugin;
using SuperUtils.Common;
using SuperUtils.Framework.ORM.Wrapper;
using SuperUtils.Framework.Tasks;
using SuperUtils.NetWork;
using SuperUtils.NetWork.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Core.Net
{
    public class VideoDownLoader
    {

        #region "属性"
        public DownLoadState State { get; set; } = DownLoadState.DownLoading;

        private bool Canceled { get; set; }

        private CancellationToken cancellationToken { get; set; }

        public Video CurrentVideo { get; set; }

        public RequestHeader Header { get; set; }

        public List<CrawlerServer> CrawlerServers { get; set; } // 该资源支持的爬虫刮削器

        private TaskLogger TaskLogger { get; set; }

        #endregion

        public VideoDownLoader(Video video, CancellationToken token, TaskLogger Logger)
        {
            CurrentVideo = video;
            cancellationToken = token;
            Header = CrawlerHeader.Default;
            TaskLogger = Logger;
        }

        /// <summary>
        /// 取消下载
        /// </summary>
        public void Cancel()
        {
            Canceled = true;
            State = DownLoadState.Fail;
        }


        public async Task<Dictionary<string, object>> GetInfo(Action<RequestHeader> headerCallBack)
        {
            // 下载信息
            State = DownLoadState.DownLoading;
            ScrapeRequest request = new ScrapeRequest() {
                DataID = CurrentVideo.DataID,
                VID = CurrentVideo.VID,
                Path = CurrentVideo.Path,
                Hash = CurrentVideo.Hash,
                ForceRefresh = false,
            };

            IScraperProvider provider = ScraperProviderManager.GetActiveProvider();
            if (provider == null)
                throw new CrawlerNotFoundException();

            TaskLogger.Info($"使用内置搜刮器：{provider.DisplayName}");
            ScrapeResult scrapeResult = await provider.GetInfoAsync(request, cancellationToken);
            if (scrapeResult == null) {
                TaskLogger.Warning($"搜刮器[{provider.ProviderId}] 未返回有效数据");
                return null;
            }

            headerCallBack?.Invoke(Header);
            return ToDictionary(scrapeResult);
        }

        private Dictionary<string, object> ToDictionary(ScrapeResult result)
        {
            Dictionary<string, object> dict = new Dictionary<string, object>();
            if (result == null)
                return dict;

            dict["PluginID"] = result.ProviderId;
            dict["ProviderId"] = result.ProviderId;
            dict["VID"] = result.VID;
            dict["Title"] = result.Title;
            dict["Plot"] = result.Plot;
            dict["ReleaseDate"] = result.ReleaseDate;
            dict["Studio"] = result.Studio;
            dict["Director"] = result.Director;
            dict["Duration"] = result.Duration.ToString();
            dict["Rating"] = result.Rating.ToString();
            dict["Genre"] = result.Genres;
            dict["ActorNames"] = result.Actors?.Select(arg => arg.Name).Where(arg => !string.IsNullOrWhiteSpace(arg)).Distinct().ToList() ?? new List<string>();
            dict["ActressImageUrl"] = result.Actors?.Select(arg => arg.AvatarUrl).Where(arg => !string.IsNullOrWhiteSpace(arg)).ToList() ?? new List<string>();
            dict["BigImageUrl"] = result.Images?.PosterUrl ?? string.Empty;
            dict["SmallImageUrl"] = result.Images?.ThumbUrl ?? string.Empty;
            dict["ExtraImageUrl"] = result.Images?.PreviewImages ?? new List<string>();
            dict["WebType"] = result.ExtraFields.ContainsKey("Provider") ? result.ExtraFields["Provider"] : result.ProviderId;
            dict["DataCode"] = result.ExtraFields.ContainsKey("ProviderId") ? result.ExtraFields["ProviderId"] : string.Empty;
            dict["WebUrl"] = result.ExtraFields.ContainsKey("Homepage") ? result.ExtraFields["Homepage"] : string.Empty;

            if (result.ExtraFields.ContainsKey("Series") && result.ExtraFields["Series"] != null)
                dict["Series"] = result.ExtraFields["Series"].ToString();
            if (result.ExtraFields.ContainsKey("Label") && result.ExtraFields["Label"] != null)
                dict["Label"] = result.ExtraFields["Label"].ToString();

            return dict;
        }

        public Dictionary<PluginMetaData, List<CrawlerServer>> GetCrawlerServer(Dictionary<string, object> dataInfo)
        {
            // 获取信息类型，并设置爬虫类型
            if (ConfigManager.ServerConfig.CrawlerServers == null ||
                CrawlerManager.PluginMetaDatas == null ||
                ConfigManager.ServerConfig.CrawlerServers.Count == 0 ||
                CrawlerManager.PluginMetaDatas?.Count == 0)
                throw new CrawlerNotFoundException();

            List<PluginMetaData> pluginMetaDatas =
                CrawlerManager.PluginMetaDatas.Where(arg => arg.Enabled).ToList();

            if (pluginMetaDatas.Count == 0)
                throw new CrawlerNotFoundException();

            Dictionary<PluginMetaData, List<CrawlerServer>> result =
                new Dictionary<PluginMetaData, List<CrawlerServer>>();
            for (int i = 0; i < pluginMetaDatas.Count; i++) {
                // 一组支持刮削的网址列表
                PluginMetaData metaData = pluginMetaDatas[i];
                List<CrawlerServer> crawlerServers = ConfigManager.ServerConfig.CrawlerServers
                    .Where(arg => arg.Enabled && !string.IsNullOrEmpty(arg.PluginID) &&
                    arg.PluginID.ToLower().Equals(metaData.PluginID.ToLower())
                    && arg.Available == 1 && !string.IsNullOrEmpty(arg.Url)).ToList();

                if (crawlerServers == null || crawlerServers.Count == 0)
                    continue;

                // 过滤器仅可使用的刮削器
                try {
                    PluginInvoker invoker = new PluginInvoker(metaData.GetDllPath());
                    //Logger.Info($"threadID: {Thread.CurrentThread.ManagedThreadId}, vid: {dataInfo["VID"]}");
                    object reasonObject = invoker.SetMethod("IsPluginAvailable").Invoke(new object[] { dataInfo });
                    string reason = reasonObject as string;
                    if (string.IsNullOrEmpty(reason)) {
                        object webTypeObject = invoker.SetMethod("GetWebType").Invoke(null);
                        string webType = "";
                        if (webTypeObject != null)
                            webType = webTypeObject.ToString();
                        string urlCodeString = string.Empty;

                        // 索引是 ValueType, WebType, LocalValue
                        IWrapper<UrlCode> wrapper = new SelectWrapper<UrlCode>().Eq("ValueType", "video");
                        if (!string.IsNullOrEmpty(webType))
                            wrapper.Eq("WebType", webType);
                        wrapper.Eq("LocalValue", CurrentVideo.VID);
                        UrlCode urlCode = MapperManager.urlCodeMapper.SelectOne(wrapper);
                        foreach (var item in crawlerServers) {
                            item.UrlCode = urlCode;
                        }
                        foreach (var item in crawlerServers) {
                            item.Invoker = invoker;
                        }
                        result[metaData] = crawlerServers;
                    } else {
                        TaskLogger.Error($"刮削失败，原因：{reason}");
                    }
                } catch (Exception ex) {
                    MessageCard.Error($"插件 {metaData.PluginName} 发生了异常：" + ex.Message);
                    continue;
                }
            }

            if (result.Keys.Count == 0)
                throw new CrawlerNotFoundException();

            // todo 爬虫调度器
            return result;
        }

        public async Task<byte[]> DownloadImage(string url, RequestHeader header, Action<string> onError = null)
        {
            try {
                HttpResult httpResult = await HttpHelper.AsyncDownLoadFile(url, header);
                return httpResult.FileByte;
            } catch (WebException ex) {
                onError?.Invoke(ex.Message);
            }

            return null;
        }

        public void Stop()
        {
            throw new NotImplementedException();
        }

        public void Pause()
        {
            throw new NotImplementedException();
        }
    }
}
