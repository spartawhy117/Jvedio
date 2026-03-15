namespace Jvedio.Contracts.Tasks;

public sealed class WorkerTaskDto
{
    public DateTimeOffset? CompletedAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public string? ErrorMessage { get; set; }

    public string Id { get; set; } = string.Empty;

    public string? LibraryId { get; set; }

    public string? LibraryName { get; set; }

    public int Percent { get; set; }

    public int ProgressCurrent { get; set; }

    public int ProgressTotal { get; set; }

    public string Stage { get; set; } = string.Empty;

    public DateTimeOffset? StartedAtUtc { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
