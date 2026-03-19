namespace Jvedio.Contracts.Videos;

public sealed class DeleteVideoResponse
{
    public string VideoId { get; set; } = string.Empty;

    public bool Deleted { get; set; }

    /// <summary>是否同时删除了原始文件</summary>
    public bool FileDeleted { get; set; }
}
