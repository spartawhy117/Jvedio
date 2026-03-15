using Jvedio.Contracts.Common;
using Jvedio.Contracts.Videos;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/videos")]
public sealed class VideosController : ControllerBase
{
    [HttpGet("favorites")]
    public ActionResult<ApiResponse<GetFavoriteVideosResponse>> GetFavorites(
        [FromQuery] GetFavoriteVideosRequest request,
        [FromServices] VideoService videoService)
    {
        var response = videoService.GetFavoriteVideos(request);
        return ApiResponse<GetFavoriteVideosResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpGet("categories")]
    public ActionResult<ApiResponse<GetVideoGroupsResponse>> GetCategories(
        [FromServices] VideoService videoService)
    {
        var response = videoService.GetCategoryGroups();
        return ApiResponse<GetVideoGroupsResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpGet("categories/{categoryName}/videos")]
    public ActionResult<ApiResponse<GetVideoGroupVideosResponse>> GetCategoryVideos(
        string categoryName,
        [FromQuery] GetVideoGroupVideosRequest request,
        [FromServices] VideoService videoService)
    {
        var response = videoService.GetCategoryVideos(categoryName, request);
        return ApiResponse<GetVideoGroupVideosResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

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
