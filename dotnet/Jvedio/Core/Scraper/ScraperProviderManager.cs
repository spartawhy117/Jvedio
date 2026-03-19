using Jvedio.Core.Scraper.MetaTube;
using System.Collections.Generic;
using System.Linq;

namespace Jvedio.Core.Scraper
{
    public static class ScraperProviderManager
    {
        private static List<IScraperProvider> Providers { get; set; } = new List<IScraperProvider>();

        public static void Init()
        {
            Providers = new List<IScraperProvider>() {
                new MetaTubeScraperProvider(),
            };
        }

        public static List<IScraperProvider> GetProviders()
        {
            if (Providers == null || Providers.Count == 0)
                Init();
            return Providers;
        }

        public static IScraperProvider GetActiveProvider()
        {
            return GetProviders().FirstOrDefault(arg => arg.Enabled);
        }
    }
}
