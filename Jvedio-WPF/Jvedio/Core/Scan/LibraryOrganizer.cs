using Jvedio.Entity;
using SuperUtils.IO;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Jvedio.Core.Scan
{
    public static class LibraryOrganizer
    {
        private static readonly HashSet<string> SubtitleExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".srt", ".ass", ".ssa", ".vtt", ".sub",
        };

        public static LibraryOrganizeResult TryOrganize(Video video, IEnumerable<string> videoExtensions)
        {
            LibraryOrganizeResult result = new LibraryOrganizeResult() {
                Success = true,
                Organized = false,
                SourcePath = video?.Path,
            };

            if (video == null || string.IsNullOrWhiteSpace(video.Path) || !File.Exists(video.Path)) {
                result.Success = false;
                result.Message = "影片文件不存在";
                return result;
            }

            string sourcePath = Path.GetFullPath(video.Path);
            string parentDir = Path.GetDirectoryName(sourcePath);
            string sourceFileName = Path.GetFileName(sourcePath);
            string targetDirName = BuildDirectoryName(video);
            string targetDir = Path.Combine(parentDir, targetDirName);
            result.TargetDirectory = targetDir;

            if (!NeedOrganize(sourcePath, parentDir, targetDir, videoExtensions)) {
                result.TargetVideoPath = sourcePath;
                result.Message = "已处于独立目录";
                return result;
            }

            if (!Directory.Exists(targetDir))
                Directory.CreateDirectory(targetDir);

            string targetVideoPath = Path.Combine(targetDir, sourceFileName);
            result.TargetVideoPath = targetVideoPath;
            if (File.Exists(targetVideoPath) && !sourcePath.Equals(targetVideoPath, StringComparison.OrdinalIgnoreCase)) {
                result.Success = false;
                result.Message = $"目标目录已存在同名影片: {targetVideoPath}";
                return result;
            }

            if (!sourcePath.Equals(targetVideoPath, StringComparison.OrdinalIgnoreCase)) {
                File.Move(sourcePath, targetVideoPath);
                result.MovedFiles.Add(targetVideoPath);
                result.Organized = true;
            }

            MoveSiblingSubtitleFiles(sourcePath, targetDir, result);
            result.Message = result.Organized ? $"已整理到目录: {targetDirName}" : "无需整理";
            return result;
        }

        private static bool NeedOrganize(string sourcePath, string parentDir, string targetDir, IEnumerable<string> videoExtensions)
        {
            if (sourcePath.StartsWith(targetDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                return false;

            HashSet<string> extSet = new HashSet<string>(videoExtensions ?? new List<string>(), StringComparer.OrdinalIgnoreCase);
            string[] files = Directory.GetFiles(parentDir, "*.*", SearchOption.TopDirectoryOnly);
            int videoCount = files.Count(arg => extSet.Contains(Path.GetExtension(arg)));
            return videoCount > 1 || !parentDir.Equals(targetDir, StringComparison.OrdinalIgnoreCase);
        }

        private static void MoveSiblingSubtitleFiles(string sourcePath, string targetDir, LibraryOrganizeResult result)
        {
            string sourceDir = Path.GetDirectoryName(sourcePath);
            string baseName = Path.GetFileNameWithoutExtension(sourcePath);
            string[] files = Directory.GetFiles(sourceDir, baseName + ".*", SearchOption.TopDirectoryOnly);
            foreach (string file in files) {
                if (!SubtitleExtensions.Contains(Path.GetExtension(file)))
                    continue;
                string target = Path.Combine(targetDir, Path.GetFileName(file));
                if (file.Equals(target, StringComparison.OrdinalIgnoreCase) || File.Exists(target))
                    continue;
                File.Move(file, target);
                result.MovedFiles.Add(target);
                result.Organized = true;
            }
        }

        private static string BuildDirectoryName(Video video)
        {
            if (!string.IsNullOrWhiteSpace(video?.VID))
                return video.VID.ToProperFileName();
            if (!string.IsNullOrWhiteSpace(video?.Path))
                return Path.GetFileNameWithoutExtension(video.Path).ToProperFileName();
            return "movie";
        }
    }
}
