using Jvedio.Contracts.Common;
using Jvedio.Contracts.Settings;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/settings")]
public sealed class SettingsController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<GetSettingsResponse>> GetSettings([FromServices] SettingsService settingsService)
    {
        var response = settingsService.GetSettings();
        return ApiResponse<GetSettingsResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpPut]
    public ActionResult<ApiResponse<UpdateSettingsResponse>> UpdateSettings(
        [FromBody] UpdateSettingsRequest? request,
        [FromServices] SettingsService settingsService)
    {
        var response = settingsService.UpdateSettings(request ?? new UpdateSettingsRequest());
        return ApiResponse<UpdateSettingsResponse>.FromData(response, HttpContext.TraceIdentifier);
    }
}
