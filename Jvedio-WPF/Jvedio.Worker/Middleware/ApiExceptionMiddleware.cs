using System.Net;
using System.Text.Json;

using Jvedio.Contracts.Common;
using Jvedio.Worker.Services;

namespace Jvedio.Worker.Middleware;

public sealed class ApiExceptionMiddleware
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly ILogger<ApiExceptionMiddleware> logger;
    private readonly RequestDelegate next;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
    {
        this.next = next;
        this.logger = logger;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await next(httpContext);
        }
        catch (WorkerApiException ex)
        {
            logger.LogWarning(ex, "[Worker-HomeMvp] API error {Code}", ex.Error.Code);
            await WriteErrorAsync(httpContext, ex.StatusCode, ex.Error);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Worker-HomeMvp] Unhandled worker error");
            await WriteErrorAsync(
                httpContext,
                (int)HttpStatusCode.InternalServerError,
                new ApiErrorDto
                {
                    Code = "system.unhandled",
                    Message = ex.Message,
                    UserMessage = "Worker 内部异常，请查看日志。",
                    Retryable = false,
                });
        }
    }

    private static async Task WriteErrorAsync(HttpContext httpContext, int statusCode, ApiErrorDto error)
    {
        if (httpContext.Response.HasStarted)
        {
            return;
        }

        httpContext.Response.Clear();
        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json; charset=utf-8";

        var response = ApiResponse<object>.FromError(error, httpContext.TraceIdentifier);
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(response, JsonSerializerOptions));
    }
}
