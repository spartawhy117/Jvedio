using Jvedio;
using Jvedio.Core.Config;
using Jvedio.Core.Scraper.MetaTube;
using Jvedio.Entity;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Test.IntegrationTests.Scan
{
    [TestClass]
    public class LibraryOrganizeTests
    {
        private static readonly string ConfigPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config", "scan", "scan-test-config.json");
        private static readonly HashSet<string> VideoExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".mp4", ".mkv", ".avi", ".wmv", ".mov", ".iso",
        };

        private ScanTestConfig Config { get; set; }

        [TestInitialize]
        public void Initialize()
        {
            TestBootstrap.EnsureWpfContext();
            Config = ScanTestConfig.Load(ConfigPath);
            if (!Config.Enabled)
                Assert.Inconclusive("扫描链测试未启用，请修改 scan-test-config.json 中的 enabled。");

            App.Init();
            if (ConfigManager.MetaTubeConfig == null)
                ConfigManager.MetaTubeConfig = MetaTubeConfig.CreateInstance();
            ConfigManager.MetaTubeConfig.Enabled = true;
            ConfigManager.MetaTubeConfig.ServerUrl = Config.ServerUrl?.Trim();
            ConfigManager.MetaTubeConfig.RequestTimeoutSeconds = Config.RequestTimeoutSeconds;

            if (string.IsNullOrWhiteSpace(Config.InputRoot) || string.IsNullOrWhiteSpace(Config.OutputRoot))
                Assert.Inconclusive("scan-test-config.json 必须提供 inputRoot 和 outputRoot。");

            Directory.CreateDirectory(Config.InputRoot);
            if (Config.CleanOutputBeforeRun && Directory.Exists(Config.OutputRoot))
                Directory.Delete(Config.OutputRoot, true);
            Directory.CreateDirectory(Config.OutputRoot);
        }

        [TestMethod]
        public async Task CanLookupAndOrganizeVideosFromInputDirectory()
        {
            List<string> sourceFiles = Directory.GetFiles(Config.InputRoot, "*.*", SearchOption.TopDirectoryOnly)
                .Where(path => VideoExtensions.Contains(Path.GetExtension(path)))
                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
                .ToList();

            ScanOrganizeReport report = new ScanOrganizeReport() {
                InputRoot = Config.InputRoot,
                OutputRoot = Config.OutputRoot,
            };

            if (sourceFiles.Count == 0) {
                WriteReport(report);
                Assert.Inconclusive($"输入目录中没有可测试影片，请先放入影片文件：{Config.InputRoot}");
            }

            MetaTubeClient client = CreateClient();
            if (Config.WarmupBeforeScan)
                await client.WarmupAsync(CancellationToken.None);

            foreach (string sourceFile in sourceFiles) {
                string query = Path.GetFileNameWithoutExtension(sourceFile)?.Trim();
                if (string.IsNullOrWhiteSpace(query)) {
                    report.Errors.Add(new ScanErrorItem() {
                        SourceFile = Path.GetFileName(sourceFile),
                        Reason = "无法从文件名生成查询关键字",
                    });
                    continue;
                }

                try {
                    MetaTubeMovieSearchResult selected = await SearchFirstMatchAsync(client, query);
                    if (selected == null) {
                        report.Unmatched.Add(new ScanUnmatchedItem() {
                            SourceFile = Path.GetFileName(sourceFile),
                            Query = query,
                            Reason = "No MetaTube match",
                        });
                        continue;
                    }

                    string targetDirectoryName = string.IsNullOrWhiteSpace(selected.Number) ? query.ToUpperInvariant() : selected.Number.Trim().ToUpperInvariant();
                    string targetDirectory = Path.Combine(Config.OutputRoot, targetDirectoryName);
                    Directory.CreateDirectory(targetDirectory);

                    string targetVideoPath = Path.Combine(targetDirectory, Path.GetFileName(sourceFile));
                    if (File.Exists(targetVideoPath))
                        File.Delete(targetVideoPath);
                    File.Move(sourceFile, targetVideoPath);

                    report.Organized.Add(new ScanOrganizedItem() {
                        SourceFile = Path.GetFileName(sourceFile),
                        MatchedVid = targetDirectoryName,
                        TargetDirectory = targetDirectory,
                        TargetVideoPath = targetVideoPath,
                    });
                } catch (Exception ex) {
                    report.Errors.Add(new ScanErrorItem() {
                        SourceFile = Path.GetFileName(sourceFile),
                        Reason = ex.Message,
                    });
                }
            }

            WriteReport(report);

            foreach (ScanOrganizedItem item in report.Organized) {
                Assert.IsTrue(Directory.Exists(item.TargetDirectory), item.SourceFile);
                Assert.IsTrue(File.Exists(item.TargetVideoPath), item.SourceFile);
            }

            foreach (ScanUnmatchedItem item in report.Unmatched) {
                Assert.IsTrue(File.Exists(Path.Combine(Config.InputRoot, item.SourceFile)), item.SourceFile);
            }

            Assert.AreEqual(0, report.Errors.Count, string.Join(Environment.NewLine, report.Errors.Select(arg => $"{arg.SourceFile}: {arg.Reason}")));
        }

        private MetaTubeClient CreateClient()
        {
            return new MetaTubeClient(Config.ServerUrl, null);
        }

        private async Task<MetaTubeMovieSearchResult> SearchFirstMatchAsync(MetaTubeClient client, string query)
        {
            List<MetaTubeMovieSearchResult> results;
            try {
                results = await client.SearchMovieAsync(query, CancellationToken.None);
            } catch (Exception ex) when (ex.Message.IndexOf("not found", StringComparison.OrdinalIgnoreCase) >= 0) {
                return null;
            }

            if (results == null || results.Count == 0)
                return null;

            return results.FirstOrDefault(arg => !string.IsNullOrWhiteSpace(arg.Number)
                && arg.Number.Equals(query, StringComparison.OrdinalIgnoreCase));
        }

        private void WriteReport(ScanOrganizeReport report)
        {
            if (Config.Report == null || !Config.Report.Enabled)
                return;

            string format = string.IsNullOrWhiteSpace(Config.Report.Format) ? "json" : Config.Report.Format.Trim().ToLowerInvariant();
            string fileName = string.IsNullOrWhiteSpace(Config.Report.FileName) ? "scan-result.json" : Config.Report.FileName.Trim();
            string reportPath = Path.Combine(Config.OutputRoot, fileName);
            Directory.CreateDirectory(Config.OutputRoot);

            if (format == "json" || format == "both")
                File.WriteAllText(reportPath, JsonConvert.SerializeObject(report, Formatting.Indented));

            if (format == "txt" || format == "both") {
                string txtName = Path.GetExtension(fileName).Equals(".txt", StringComparison.OrdinalIgnoreCase)
                    ? fileName
                    : Path.GetFileNameWithoutExtension(fileName) + ".txt";
                File.WriteAllText(Path.Combine(Config.OutputRoot, txtName), BuildTextReport(report), Encoding.UTF8);
            }
        }

        private string BuildTextReport(ScanOrganizeReport report)
        {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("Organized:");
            if (report.Organized.Count == 0)
                builder.AppendLine("- none");
            else {
                foreach (ScanOrganizedItem item in report.Organized)
                    builder.AppendLine($"- {item.SourceFile} -> {item.MatchedVid}");
            }

            builder.AppendLine();
            builder.AppendLine("Unmatched:");
            if (report.Unmatched.Count == 0)
                builder.AppendLine("- none");
            else {
                foreach (ScanUnmatchedItem item in report.Unmatched)
                    builder.AppendLine($"- {item.SourceFile}");
            }

            builder.AppendLine();
            builder.AppendLine("Errors:");
            if (report.Errors.Count == 0)
                builder.AppendLine("- none");
            else {
                foreach (ScanErrorItem item in report.Errors)
                    builder.AppendLine($"- {item.SourceFile}: {item.Reason}");
            }

            return builder.ToString();
        }
    }
}
