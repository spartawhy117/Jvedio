using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;

namespace Jvedio.Test.IntegrationTests.MetaTube
{
    public class MetaTubeTestConfig
    {
        public bool Enabled { get; set; }

        public string ServerUrl { get; set; }

        public int RequestTimeoutSeconds { get; set; }

        public bool WarmupBeforeScrape { get; set; }

        public bool ClearOutputBeforeRun { get; set; }

        public string TestOutputRoot { get; set; }

        public string CacheRoot { get; set; }

        public bool LogToConsole { get; set; }

        public List<MetaTubeTestCase> Cases { get; set; } = new List<MetaTubeTestCase>();

        public static MetaTubeTestConfig Load(string path)
        {
            string json = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<MetaTubeTestConfig>(json);
        }
    }

    public class MetaTubeTestCase
    {
        public string Name { get; set; }

        public string Vid { get; set; }

        public bool ExpectMovieHit { get; set; }

        public bool ExpectMovieTitleNotEmpty { get; set; }

        public int ExpectActorCountMin { get; set; }

        public int ExpectPreviewCountMin { get; set; }

        public bool ExpectActorAvatarAtLeastOne { get; set; }

        public bool ExpectTestOutputFiles { get; set; }
    }
}
