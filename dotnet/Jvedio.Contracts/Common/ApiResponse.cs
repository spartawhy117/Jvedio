namespace Jvedio.Contracts.Common;

public sealed class ApiResponse<TData>
{
    public bool Success { get; set; }

    public string RequestId { get; set; } = string.Empty;

    public DateTimeOffset Timestamp { get; set; }

    public TData? Data { get; set; }

    public ApiErrorDto? Error { get; set; }

    public static ApiResponse<TData> FromData(TData data, string requestId)
    {
        return new ApiResponse<TData>
        {
            Success = true,
            RequestId = requestId,
            Timestamp = DateTimeOffset.UtcNow,
            Data = data,
        };
    }

    public static ApiResponse<TData> FromError(ApiErrorDto error, string requestId)
    {
        return new ApiResponse<TData>
        {
            Success = false,
            RequestId = requestId,
            Timestamp = DateTimeOffset.UtcNow,
            Error = error,
        };
    }
}
