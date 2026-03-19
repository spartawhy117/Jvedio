namespace Jvedio.Contracts.Common;

public sealed class ApiErrorDto
{
    public string Code { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string UserMessage { get; set; } = string.Empty;

    public bool Retryable { get; set; }

    public object? Details { get; set; }

    public string? LogPath { get; set; }
}
