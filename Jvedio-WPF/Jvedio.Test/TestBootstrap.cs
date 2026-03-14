using Jvedio.Core.Global;
using System;
using System.IO;
using System.Reflection;
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

        public static string CreateTempDirectory(string prefix)
        {
            EnsureWpfContext();
            string root = Path.Combine(Path.GetTempPath(), prefix, Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            return root;
        }

        public static IDisposable OverridePathManagerPath(string propertyName, string value)
        {
            PropertyInfo property = typeof(PathManager).GetProperty(propertyName, BindingFlags.Public | BindingFlags.Static);
            if (property == null || !property.CanRead || !property.CanWrite)
                throw new ArgumentException($"PathManager property not found: {propertyName}", nameof(propertyName));

            string original = property.GetValue(null) as string;
            property.SetValue(null, value);
            return new PathManagerPathScope(property, original);
        }

        private sealed class PathManagerPathScope : IDisposable
        {
            private readonly PropertyInfo property;
            private readonly string originalValue;
            private bool disposed;

            public PathManagerPathScope(PropertyInfo property, string originalValue)
            {
                this.property = property;
                this.originalValue = originalValue;
            }

            public void Dispose()
            {
                if (disposed)
                    return;

                property.SetValue(null, originalValue);
                disposed = true;
            }
        }
    }
}
