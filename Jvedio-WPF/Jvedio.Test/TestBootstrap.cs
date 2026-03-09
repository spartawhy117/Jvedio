using System.IO;
using System.Windows;

namespace Jvedio.Test
{
    internal static class TestBootstrap
    {
        public static void EnsureWpfContext()
        {
            if (Application.Current == null)
                new Application();

            Application.ResourceAssembly = typeof(Jvedio.App).Assembly;
            Directory.SetCurrentDirectory(Path.GetDirectoryName(typeof(Jvedio.App).Assembly.Location));
        }
    }
}
