
using Jvedio.Core.Global;
using SuperControls.Style.Plugin.Crawler;
using SuperUtils.IO;
using SuperUtils.NetWork;
using SuperUtils.NetWork.Entity;
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace Jvedio.Core.Server
{
    public static class ServerManager
    {

        #region "属性"
        public static string ServerFilePath { get; set; } =
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "server", "jvedio-server.jar");
        public static string ServerLibPath { get; set; } =
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "server", "lib");
        public static string ServerConfigPath { get; set; } =
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "server", "config.json");

        #endregion

        private static void WriteFile(byte[] filebyte, string savepath)
        {
            FileInfo fileInfo = new FileInfo(savepath);
            DirHelper.TryCreateDirectory(fileInfo.Directory.FullName, (ex) => {
                throw ex;
            });
            try {
                using (var fs = new FileStream(fileInfo.FullName, FileMode.Create, FileAccess.Write)) {
                    fs.Write(filebyte, 0, filebyte.Length);
                }
            } catch (Exception ex) {
                throw ex;
            }
        }

        public static async Task<ServerStatus> CheckStatus()
        {
            if (!await IsPortOpen("127.0.0.1", (int)ConfigManager.JavaServerConfig.Port, 300))
                return ServerStatus.UnReady;

            string url = $"http://localhost:{ConfigManager.JavaServerConfig.Port}/status/current";
            HttpResult result = await HttpClient.Get(url, null, SuperUtils.NetWork.Enums.HttpMode.Header);
            if (result != null && result.StatusCode == HttpStatusCode.OK)
                return ServerStatus.Ready;

            return ServerStatus.UnReady;
        }

        private static async Task<bool> IsPortOpen(string host, int port, int timeout)
        {
            using (TcpClient client = new TcpClient()) {
                Task connectTask = client.ConnectAsync(host, port);
                Task completed = await Task.WhenAny(connectTask, Task.Delay(timeout));
                return completed == connectTask && client.Connected;
            }
        }

        public static async Task<bool> DownloadJar()
        {
            try {
                HttpResult streamResult = await HttpHelper.AsyncDownLoadFile(UrlManager.ServerUrl, CrawlerHeader.GitHub);
                // 写入本地
                if (streamResult.FileByte != null)
                    WriteFile(streamResult.FileByte, ServerFilePath);
                return true;
            } catch (Exception ex) {
                App.Logger.Info(ex.Message);
            }
            return false;
        }

    }
}
