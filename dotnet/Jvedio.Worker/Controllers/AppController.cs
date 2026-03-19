using Jvedio.Contracts.App;
using Jvedio.Contracts.Common;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/app")]
public sealed class AppController : ControllerBase
{
    [HttpGet("bootstrap")]
    public ActionResult<ApiResponse<GetBootstrapResponse>> GetBootstrap([FromServices] AppBootstrapService appBootstrapService)
    {
        var response = appBootstrapService.GetBootstrap();
        return ApiResponse<GetBootstrapResponse>.FromData(response, HttpContext.TraceIdentifier);
    }
}
