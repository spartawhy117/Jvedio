using Jvedio.Contracts.Common;
using Jvedio.Contracts.Tasks;
using Jvedio.Worker.Services;

using Microsoft.AspNetCore.Mvc;

namespace Jvedio.Worker.Controllers;

[ApiController]
[Route("api/tasks")]
public sealed class TasksController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<GetTasksResponse>> GetTasks([FromServices] TaskSummarySnapshotService taskSummarySnapshotService)
    {
        var response = new GetTasksResponse
        {
            Summary = taskSummarySnapshotService.GetCurrent(),
        };

        return ApiResponse<GetTasksResponse>.FromData(response, HttpContext.TraceIdentifier);
    }
}
