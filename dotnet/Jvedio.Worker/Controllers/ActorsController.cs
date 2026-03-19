using Jvedio.Contracts.Actors;
using Jvedio.Contracts.Common;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/actors")]
public sealed class ActorsController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<GetActorsResponse>> GetActors(
        [FromQuery] GetActorsRequest request,
        [FromServices] ActorService actorService)
    {
        var response = actorService.GetActors(request);
        return ApiResponse<GetActorsResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpGet("{actorId}")]
    public ActionResult<ApiResponse<GetActorDetailResponse>> GetActor(
        string actorId,
        [FromServices] ActorService actorService)
    {
        var response = actorService.GetActorDetail(actorId);
        return ApiResponse<GetActorDetailResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpGet("{actorId}/avatar")]
    public IActionResult GetAvatar(
        string actorId,
        [FromServices] ActorService actorService)
    {
        var avatarPath = actorService.GetActorAvatarPath(actorId);
        return PhysicalFile(avatarPath, GetImageContentType(avatarPath));
    }

    [HttpGet("{actorId}/videos")]
    public ActionResult<ApiResponse<GetActorVideosResponse>> GetActorVideos(
        string actorId,
        [FromQuery] GetActorVideosRequest request,
        [FromServices] ActorService actorService)
    {
        var response = actorService.GetActorVideos(actorId, request);
        return ApiResponse<GetActorVideosResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    private static string GetImageContentType(string path)
    {
        return Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".gif" => "image/gif",
            _ => "image/jpeg",
        };
    }
}
