using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;

namespace Jvedio.Test.IntegrationTests.Scan
{
    public class ScanTestConfig
    {
        public bool Enabled { get; set; }

        public bool CleanOutputBeforeRun { get; set; }

        public string TestRoot { get; set; }

        public string FlatLibraryRoot { get; set; }

        public List<ScanTestCase> Cases { get; set; } = new List<ScanTestCase>();

        public static ScanTestConfig Load(string path)
        {
            string json = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<ScanTestConfig>(json);
        }
    }

    public class ScanTestCase
    {
        public string Name { get; set; }

        public string[] Files { get; set; }

        public bool ExpectOrganized { get; set; }

        public string ExpectedDirectoryName { get; set; }

        public bool ExpectSubtitleMoved { get; set; }

        public bool ExpectSkipped { get; set; }
    }
}
