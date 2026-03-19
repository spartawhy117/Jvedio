namespace Jvedio.Contracts.Actors;

public sealed class GetActorVideosResponse
{
    public IReadOnlyList<ActorVideoListItemDto> Items { get; set; } = Array.Empty<ActorVideoListItemDto>();

    public int PageIndex { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }
}
