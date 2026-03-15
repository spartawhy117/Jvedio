using Jvedio.Contracts.Common;
using Jvedio.Contracts.Videos;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/videos")]
public sealed class VideosController : ControllerBase
{
    [HttpGet("{videoId}")]
    public ActionResult<ApiResponse<GetVideoDetailResponse>> GetVideo(
        string videoId,
        [FromServices] VideoService videoService)
    {
        var response = videoService.GetVideoDetail(videoId);
        return ApiResponse<GetVideoDetailResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpPost("{videoId}/play")]
    public ActionResult<ApiResponse<PlayVideoResponse>> PlayVideo(
        string videoId,
        [FromBody] PlayVideoRequest? request,
        [FromServices] VideoService videoService)
    {
        var response = videoService.PlayVideo(videoId, request ?? new PlayVideoRequest());
        return ApiResponse<PlayVideoResponse>.FromData(response, HttpContext.TraceIdentifier);
    }
}
