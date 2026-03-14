using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;

namespace Jvedio.Test.IntegrationTests.Scan
{
    public class ScanTestConfig
    {
        public bool Enabled { get; set; }

        public bool CleanOutputBeforeRun { get; set; }

        public bool WarmupBeforeScan { get; set; } = true;

        public string ServerUrl { get; set; }

        public int RequestTimeoutSeconds { get; set; } = 60;

        public string InputRoot { get; set; }

        public string OutputRoot { get; set; }

        public ScanReportConfig Report { get; set; } = new ScanReportConfig();

        public static ScanTestConfig Load(string path)
        {
            string json = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<ScanTestConfig>(json);
        }
    }

    public class ScanReportConfig
    {
        public bool Enabled { get; set; } = true;

        public string Format { get; set; } = "json";

        public string FileName { get; set; } = "scan-result.json";
    }

    public class ScanOrganizeReport
    {
        public string GeneratedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        public string InputRoot { get; set; }

        public string OutputRoot { get; set; }

        public List<ScanOrganizedItem> Organized { get; set; } = new List<ScanOrganizedItem>();

        public List<ScanUnmatchedItem> Unmatched { get; set; } = new List<ScanUnmatchedItem>();

        public List<ScanErrorItem> Errors { get; set; } = new List<ScanErrorItem>();
    }

    public class ScanOrganizedItem
    {
        public string SourceFile { get; set; }

        public string MatchedVid { get; set; }

        public string TargetDirectory { get; set; }

        public string TargetVideoPath { get; set; }
    }

    public class ScanUnmatchedItem
    {
        public string SourceFile { get; set; }

        public string Query { get; set; }

        public string Reason { get; set; }
    }

    public class ScanErrorItem
    {
        public string SourceFile { get; set; }

        public string Reason { get; set; }
    }
}
