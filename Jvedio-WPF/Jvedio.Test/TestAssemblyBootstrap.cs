using Jvedio.Core.Config;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Reflection;
using System.Windows;

namespace Jvedio.Test
{
    [TestClass]
    public class TestAssemblyBootstrap
    {
        [AssemblyInitialize]
        public static void Initialize(TestContext context)
        {
            if (Application.Current == null)
                new Application();

            Application.ResourceAssembly = typeof(Jvedio.App).Assembly;
            Jvedio.App.Init();

            if (ConfigManager.MetaTubeConfig == null)
                ConfigManager.MetaTubeConfig = MetaTubeConfig.CreateInstance();
        }
    }
}
