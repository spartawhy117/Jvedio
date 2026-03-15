namespace Jvedio.Contracts.Libraries;

public sealed class GetLibraryVideosRequest
{
    public string Keyword { get; set; } = string.Empty;

    public bool MissingSidecarOnly { get; set; }

    public int PageIndex { get; set; }

    public int PageSize { get; set; } = 60;

    public string SortBy { get; set; } = "lastScanDate";

    public string SortOrder { get; set; } = "desc";
}
