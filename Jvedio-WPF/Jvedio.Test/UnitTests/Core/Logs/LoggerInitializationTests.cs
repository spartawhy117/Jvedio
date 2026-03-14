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
            string root = TestBootstrap.CreateTempDirectory("logger-test");
            using (TestBootstrap.OverridePathManagerPath(nameof(PathManager.LogPath), root)) {
                string file = Path.Combine(root, SuperUtils.Time.DateHelper.NowDate() + ".log");
                File.WriteAllText(file, "old log");

                Logger.ResetCurrentLog();

                Assert.IsTrue(File.Exists(file));
                Assert.AreEqual(string.Empty, File.ReadAllText(file));
            }
        }
    }
}
