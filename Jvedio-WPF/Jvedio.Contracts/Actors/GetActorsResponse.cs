namespace Jvedio.Contracts.Actors;

public sealed class GetActorsResponse
{
    public IReadOnlyList<ActorListItemDto> Items { get; set; } = Array.Empty<ActorListItemDto>();

    public int PageIndex { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }
}
