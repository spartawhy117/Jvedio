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
    public ActionResult<ApiResponse<GetTasksResponse>> GetTasks([FromServices] WorkerTaskRegistryService workerTaskRegistryService)
    {
        var response = new GetTasksResponse
        {
            Summary = workerTaskRegistryService.GetSummary(),
            Tasks = workerTaskRegistryService.GetTasks(),
        };

        return ApiResponse<GetTasksResponse>.FromData(response, HttpContext.TraceIdentifier);
    }

    [HttpGet("{taskId}")]
    public ActionResult<ApiResponse<GetTaskResponse>> GetTask(
        string taskId,
        [FromServices] WorkerTaskRegistryService workerTaskRegistryService)
    {
        var response = new GetTaskResponse
        {
            Task = workerTaskRegistryService.GetTask(taskId),
        };

        return ApiResponse<GetTaskResponse>.FromData(response, HttpContext.TraceIdentifier);
    }
}
