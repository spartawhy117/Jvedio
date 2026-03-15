namespace Jvedio.Contracts.Actors;

public sealed class GetActorsRequest
{
    public string Keyword { get; set; } = string.Empty;

    public int PageIndex { get; set; }

    public int PageSize { get; set; }

    public string SortBy { get; set; } = string.Empty;

    public string SortOrder { get; set; } = string.Empty;
}
