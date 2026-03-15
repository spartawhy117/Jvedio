using Jvedio.Contracts.Common;

namespace Jvedio.Worker.Services;

public sealed class WorkerApiException : Exception
{
    public WorkerApiException(int statusCode, ApiErrorDto error)
        : base(error.Message)
    {
        StatusCode = statusCode;
        Error = error;
    }

    public WorkerApiException(int statusCode, ApiErrorDto error, Exception innerException)
        : base(error.Message, innerException)
    {
        StatusCode = statusCode;
        Error = error;
    }

    public ApiErrorDto Error { get; }

    public int StatusCode { get; }
}
