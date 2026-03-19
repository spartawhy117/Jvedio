using Jvedio.Contracts.Common;
using Jvedio.Contracts.Libraries;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/libraries")]
public sealed class LibrariesController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<GetLibrariesResponse>> GetLibraries([FromServices] LibraryService libraryService)
    {
        var libraries = libraryService.GetLibraries();
        var response = new GetLibrariesResponse
        {
            Libraries = libraries,
            TotalCount = libraries.Count,
        };

        return ApiResponse<GetLibrariesResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpPost]
    public ActionResult<ApiResponse<CreateLibraryResponse>> CreateLibrary(
        [FromBody] CreateLibraryRequest request,
        [FromServices] LibraryService libraryService)
    {
        var library = libraryService.CreateLibrary(request);
        var response = new CreateLibraryResponse
        {
            Library = library,
            CreatedAtUtc = DateTimeOffset.UtcNow,
        };

        return ApiResponse<CreateLibraryResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpDelete("{libraryId}")]
    public ActionResult<ApiResponse<DeleteLibraryResponse>> DeleteLibrary(
        string libraryId,
        [FromServices] LibraryService libraryService)
    {
        libraryService.DeleteLibrary(libraryId);
        var response = new DeleteLibraryResponse
        {
            LibraryId = libraryId,
            DeletedAtUtc = DateTimeOffset.UtcNow,
        };

        return ApiResponse<DeleteLibraryResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpPut("{libraryId}")]
    public ActionResult<ApiResponse<UpdateLibraryResponse>> UpdateLibrary(
        string libraryId,
        [FromBody] UpdateLibraryRequest request,
        [FromServices] LibraryService libraryService)
    {
        var library = libraryService.UpdateLibrary(libraryId, request);
        var response = new UpdateLibraryResponse
        {
            Library = library,
            UpdatedAtUtc = DateTimeOffset.UtcNow,
        };

        return ApiResponse<UpdateLibraryResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpGet("{libraryId}/videos")]
    public ActionResult<ApiResponse<GetLibraryVideosResponse>> GetLibraryVideos(
        string libraryId,
        [FromQuery] GetLibraryVideosRequest request,
        [FromServices] VideoService videoService)
    {
        var response = videoService.GetLibraryVideos(libraryId, request);
        return ApiResponse<GetLibraryVideosResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpPost("{libraryId}/scan")]
    public ActionResult<ApiResponse<StartLibraryScanResponse>> StartScan(
        string libraryId,
        [FromBody] StartLibraryScanRequest request,
        [FromServices] LibraryTaskOrchestratorService libraryTaskOrchestratorService)
    {
        var task = libraryTaskOrchestratorService.StartScanTask(libraryId, request);
        var response = new StartLibraryScanResponse
        {
            AcceptedAtUtc = DateTimeOffset.UtcNow,
            Task = task,
        };

        return Accepted(ApiResponse<StartLibraryScanResponse>.FromData(response, HttpContext.TraceIdentifier));
    }

    [HttpPost("{libraryId}/scrape")]
    public ActionResult<ApiResponse<StartLibraryScrapeResponse>> StartScrape(
        string libraryId,
        [FromBody] StartLibraryScrapeRequest request,
        [FromServices] LibraryTaskOrchestratorService libraryTaskOrchestratorService)
    {
        var task = libraryTaskOrchestratorService.StartScrapeTask(libraryId, request);
        var response = new StartLibraryScrapeResponse
        {
            AcceptedAtUtc = DateTimeOffset.UtcNow,
            Task = task,
        };

        return Accepted(ApiResponse<StartLibraryScrapeResponse>.FromData(response, HttpContext.TraceIdentifier));
    }
}
