namespace Jvedio.Contracts.Videos;

public sealed class VideoActorDto
{
    public string? ActorId { get; set; }

    public string? AvatarPath { get; set; }

    public string Name { get; set; } = string.Empty;
}
