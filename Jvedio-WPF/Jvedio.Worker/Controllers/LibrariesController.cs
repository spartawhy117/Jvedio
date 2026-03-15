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
}
