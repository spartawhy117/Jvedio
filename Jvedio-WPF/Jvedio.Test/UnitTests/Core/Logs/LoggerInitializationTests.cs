using Jvedio.Core.Global;
using Jvedio.Core.Logs;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.IO;

namespace Jvedio.Test.UnitTests.Core.Logs
{
    [TestClass]
    public class LoggerInitializationTests
    {
        [TestMethod]
        public void LoggerShouldResetDailyLogOnStartup()
        {
            string root = Path.Combine(Path.GetTempPath(), "logger-test", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            typeof(PathManager).GetProperty("LogPath").SetValue(null, root);

            string file = Path.Combine(root, SuperUtils.Time.DateHelper.NowDate() + ".log");
            File.WriteAllText(file, "old log");

            Logger.ResetCurrentLog();

            Assert.IsTrue(File.Exists(file));
            Assert.AreEqual(string.Empty, File.ReadAllText(file));
        }
    }
}
