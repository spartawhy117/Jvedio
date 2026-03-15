using System.Collections.Concurrent;

using Jvedio.Contracts.Tasks;

namespace Jvedio.Worker.Services;

public sealed class WorkerTaskRegistryService
{
    private readonly ConcurrentDictionary<string, WorkerTaskDto> tasks = new(StringComparer.OrdinalIgnoreCase);
    private readonly object gate = new();
    private readonly TaskSummarySnapshotService taskSummarySnapshotService;
    private readonly WorkerEventStreamBroker workerEventStreamBroker;

    public WorkerTaskRegistryService(
        TaskSummarySnapshotService taskSummarySnapshotService,
        WorkerEventStreamBroker workerEventStreamBroker)
    {
        this.taskSummarySnapshotService = taskSummarySnapshotService;
        this.workerEventStreamBroker = workerEventStreamBroker;
    }

    public WorkerTaskDto CreateTask(string type, string? libraryId, string? libraryName, string summary)
    {
        lock (gate)
        {
            var utcNow = DateTimeOffset.UtcNow;
            var task = new WorkerTaskDto
            {
                CreatedAtUtc = utcNow,
                Id = $"task_{Guid.NewGuid():N}",
                LibraryId = string.IsNullOrWhiteSpace(libraryId) ? null : libraryId,
                LibraryName = string.IsNullOrWhiteSpace(libraryName) ? null : libraryName,
                Percent = 0,
                ProgressCurrent = 0,
                ProgressTotal = 0,
                Stage = "queued",
                Status = "queued",
                Summary = summary,
                Type = type,
                UpdatedAtUtc = utcNow,
            };

            tasks[task.Id] = task;
            PublishSummaryLocked();
            workerEventStreamBroker.Publish(
                "task.created",
                BuildTopic(task),
                new TaskCreatedEvent
                {
                    CreatedAtUtc = task.CreatedAtUtc,
                    Task = Clone(task),
                });
            return Clone(task);
        }
    }

    public WorkerTaskDto? GetTask(string taskId)
    {
        return tasks.TryGetValue(taskId, out var task) ? Clone(task) : null;
    }

    public TaskSummaryDto GetSummary()
    {
        lock (gate)
        {
            return taskSummarySnapshotService.GetCurrent();
        }
    }

    public IReadOnlyList<WorkerTaskDto> GetTasks(string? libraryId = null)
    {
        IEnumerable<WorkerTaskDto> values = tasks.Values;
        if (!string.IsNullOrWhiteSpace(libraryId))
        {
            values = values.Where(task => string.Equals(task.LibraryId, libraryId, StringComparison.OrdinalIgnoreCase));
        }

        return values
            .OrderByDescending(task => task.UpdatedAtUtc)
            .Select(Clone)
            .ToList();
    }

    public bool HasRunningTask(string libraryId, params string[] taskTypes)
    {
        if (string.IsNullOrWhiteSpace(libraryId))
        {
            return false;
        }

        return tasks.Values.Any(task =>
            string.Equals(task.LibraryId, libraryId, StringComparison.OrdinalIgnoreCase)
            && string.Equals(task.Status, "running", StringComparison.OrdinalIgnoreCase)
            && (taskTypes.Length == 0 || taskTypes.Contains(task.Type, StringComparer.OrdinalIgnoreCase)));
    }

    public WorkerTaskDto MarkRunning(string taskId, string stage, string summary)
    {
        return UpdateTask(taskId, task =>
        {
            task.Stage = stage;
            task.StartedAtUtc ??= DateTimeOffset.UtcNow;
            task.Status = "running";
            task.Summary = summary;
        }, publishProgressEvent: true);
    }

    public WorkerTaskDto ReportProgress(string taskId, string stage, int current, int total, string summary)
    {
        return UpdateTask(taskId, task =>
        {
            task.Stage = stage;
            task.Status = "running";
            task.ProgressCurrent = Math.Max(0, current);
            task.ProgressTotal = Math.Max(0, total);
            task.Percent = total <= 0 ? 0 : Math.Clamp((int)Math.Round((double)current / total * 100d), 0, 100);
            task.StartedAtUtc ??= DateTimeOffset.UtcNow;
            task.Summary = summary;
        }, publishProgressEvent: true);
    }

    public WorkerTaskDto CompleteTask(string taskId, string summary)
    {
        lock (gate)
        {
            var task = GetRequiredTask(taskId);
            task.CompletedAtUtc = DateTimeOffset.UtcNow;
            task.Percent = 100;
            task.Stage = "completed";
            task.Status = "succeeded";
            task.Summary = summary;
            task.UpdatedAtUtc = DateTimeOffset.UtcNow;

            PublishSummaryLocked();
            workerEventStreamBroker.Publish(
                "task.completed",
                BuildTopic(task),
                new TaskCompletedEvent
                {
                    CompletedAtUtc = task.CompletedAtUtc.Value,
                    Task = Clone(task),
                });
            return Clone(task);
        }
    }

    public WorkerTaskDto FailTask(string taskId, string errorMessage, string summary)
    {
        lock (gate)
        {
            var task = GetRequiredTask(taskId);
            task.CompletedAtUtc = DateTimeOffset.UtcNow;
            task.ErrorMessage = errorMessage;
            task.Stage = "failed";
            task.Status = "failed";
            task.Summary = summary;
            task.UpdatedAtUtc = DateTimeOffset.UtcNow;

            PublishSummaryLocked();
            workerEventStreamBroker.Publish(
                "task.failed",
                BuildTopic(task),
                new TaskFailedEvent
                {
                    FailedAtUtc = task.CompletedAtUtc.Value,
                    Task = Clone(task),
                });
            return Clone(task);
        }
    }

    private WorkerTaskDto UpdateTask(string taskId, Action<WorkerTaskDto> update, bool publishProgressEvent)
    {
        lock (gate)
        {
            var task = GetRequiredTask(taskId);
            update(task);
            task.UpdatedAtUtc = DateTimeOffset.UtcNow;

            PublishSummaryLocked();
            if (publishProgressEvent)
            {
                workerEventStreamBroker.Publish(
                    "task.progress",
                    BuildTopic(task),
                    new TaskProgressEvent
                    {
                        OccurredAtUtc = task.UpdatedAtUtc,
                        Task = Clone(task),
                    });
            }

            return Clone(task);
        }
    }

    private void PublishSummaryLocked()
    {
        var utcNow = DateTimeOffset.UtcNow;
        var summary = new TaskSummaryDto
        {
            CompletedTodayCount = tasks.Values.Count(task =>
                string.Equals(task.Status, "succeeded", StringComparison.OrdinalIgnoreCase)
                && task.CompletedAtUtc.HasValue
                && task.CompletedAtUtc.Value.UtcDateTime.Date == utcNow.UtcDateTime.Date),
            FailedCount = tasks.Values.Count(task => string.Equals(task.Status, "failed", StringComparison.OrdinalIgnoreCase)),
            LastUpdatedUtc = utcNow,
            QueuedCount = tasks.Values.Count(task => string.Equals(task.Status, "queued", StringComparison.OrdinalIgnoreCase)),
            RunningCount = tasks.Values.Count(task => string.Equals(task.Status, "running", StringComparison.OrdinalIgnoreCase)),
        };

        taskSummarySnapshotService.SetCurrent(summary);
        workerEventStreamBroker.Publish("task.summary.changed", "tasks", taskSummarySnapshotService.CreateChangedEvent());
    }

    private WorkerTaskDto GetRequiredTask(string taskId)
    {
        if (!tasks.TryGetValue(taskId, out var task))
        {
            throw new KeyNotFoundException($"Task not found: {taskId}");
        }

        return task;
    }

    private static WorkerTaskDto Clone(WorkerTaskDto source)
    {
        return new WorkerTaskDto
        {
            CompletedAtUtc = source.CompletedAtUtc,
            CreatedAtUtc = source.CreatedAtUtc,
            ErrorMessage = source.ErrorMessage,
            Id = source.Id,
            LibraryId = source.LibraryId,
            LibraryName = source.LibraryName,
            Percent = source.Percent,
            ProgressCurrent = source.ProgressCurrent,
            ProgressTotal = source.ProgressTotal,
            Stage = source.Stage,
            StartedAtUtc = source.StartedAtUtc,
            Status = source.Status,
            Summary = source.Summary,
            Type = source.Type,
            UpdatedAtUtc = source.UpdatedAtUtc,
        };
    }

    private static string BuildTopic(WorkerTaskDto task)
    {
        return string.IsNullOrWhiteSpace(task.LibraryId) ? "tasks" : $"library:{task.LibraryId}";
    }
}
