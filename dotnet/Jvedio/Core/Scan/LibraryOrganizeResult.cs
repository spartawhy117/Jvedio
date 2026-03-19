using System.Collections.Generic;

namespace Jvedio.Core.Scan
{
    public class LibraryOrganizeResult
    {
        public bool Success { get; set; }

        public bool Organized { get; set; }

        public string SourcePath { get; set; }

        public string TargetDirectory { get; set; }

        public string TargetVideoPath { get; set; }

        public string Message { get; set; }

        public List<string> MovedFiles { get; set; } = new List<string>();
    }
}
