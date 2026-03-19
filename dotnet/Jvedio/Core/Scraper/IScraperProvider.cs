using Jvedio.Core.Scraper.Models;
using System.Threading;
using System.Threading.Tasks;

namespace Jvedio.Core.Scraper
{
    public interface IScraperProvider
    {
        string ProviderId { get; }

        string DisplayName { get; }

        bool Enabled { get; }

        Task<ScrapeResult> GetInfoAsync(ScrapeRequest request, CancellationToken cancellationToken);
    }
}
