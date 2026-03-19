namespace Jvedio.Contracts.Common;

public sealed class PagedResult<TItem>
{
    public int PageNumber { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }

    public IReadOnlyList<TItem> Items { get; set; } = Array.Empty<TItem>();
}
