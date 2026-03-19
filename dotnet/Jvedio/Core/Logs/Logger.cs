using Jvedio.Core.Global;
using SuperUtils.Framework.Logger;
using SuperUtils.IO;
using SuperUtils.Time;
using System;
using System.IO;

namespace Jvedio.Core.Logs
{
    /// <summary>
    /// 日志记录
    /// </summary>
    public class Logger : AbstractLogger
    {

        private static object LogLock { get; set; }
        public static Logger Instance { get; }

        private Logger() { }

        static Logger()
        {
            Instance = new Logger();
            LogLock = new object();

#if DEBUG
            Instance.LogLevel = Level.Debug;
#else
            Instance.LogLevel = Level.Info;
#endif
        }

        public override void LogPrint(string str)
        {
            if (str == null)
                str = "";
            Console.Write(str);
            string filePath = PathManager.LogPath;
            DirHelper.TryCreateDirectory(filePath);
            string filepath =
                System.IO.Path.Combine(filePath, DateHelper.NowDate() + ".log");
            lock (LogLock) {
                try {
                    File.AppendAllText(filepath, str);
                } catch (Exception ex) {
                    // 防止递归
                    Console.WriteLine(ex.Message);
                }
            }
        }

        public static void ResetCurrentLog()
        {
            string filePath = PathManager.LogPath;
            DirHelper.TryCreateDirectory(filePath);
            string filepath = System.IO.Path.Combine(filePath, DateHelper.NowDate() + ".log");
            lock (LogLock) {
                try {
                    File.WriteAllText(filepath, string.Empty);
                } catch (Exception ex) {
                    Console.WriteLine(ex.Message);
                }
            }
        }

    }
}
