using Jvedio.Contracts.App;
using Jvedio.Contracts.Common;
using Jvedio.Worker.Hosting;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet("live")]
    public ActionResult<ApiResponse<object>> GetLive()
    {
        return ApiResponse<object>.FromData(new { status = "live" }, HttpContext.TraceIdentifier);
    }

    [HttpGet("ready")]
    public ActionResult<ApiResponse<WorkerStatusDto>> GetReady([FromServices] WorkerRuntimeState runtimeState)
    {
        var status = new WorkerStatusDto
        {
            Status = runtimeState.IsReady ? "ready" : "starting",
            BaseUrl = runtimeState.BaseUrl,
            StartedAtUtc = runtimeState.StartedAtUtc,
            Healthy = runtimeState.IsReady,
            EventStreamPath = "/api/events",
        };

        return ApiResponse<WorkerStatusDto>.FromData(status, HttpContext.TraceIdentifier);
    }
}
