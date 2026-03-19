namespace Jvedio.Contracts.Videos;

public sealed class BatchOperationResponse
{
    public int SuccessCount { get; set; }

    public int FailedCount { get; set; }

    public List<string> FailedVideoIds { get; set; } = new();
}
