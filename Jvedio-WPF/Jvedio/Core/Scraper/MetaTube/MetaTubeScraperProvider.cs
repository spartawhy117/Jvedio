using Jvedio.Core.Scraper.Models;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Core.Scraper.MetaTube
{
    public class MetaTubeScraperProvider : IScraperProvider
    {
        public string ProviderId => "metatube";

        public string DisplayName => "MetaTube";

        public bool Enabled => ConfigManager.MetaTubeConfig != null && ConfigManager.MetaTubeConfig.Enabled;

        public Task<ScrapeResult> GetInfoAsync(ScrapeRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult<ScrapeResult>(null);
        }
    }
}
