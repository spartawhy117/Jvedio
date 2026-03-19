namespace Jvedio.Contracts.Videos;

public sealed class BatchOperationRequest
{
    public List<string> VideoIds { get; set; } = new();
}
