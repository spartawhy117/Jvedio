import type { WorkerTaskDto } from "../../types/api.js";

export function renderTaskDetailDialog(task: WorkerTaskDto, pending: boolean): string {
  const retryLabel = pending ? "重试中..." : "重试任务";
  const timeline = [
    row("任务 ID", task.id),
    row("类型", task.type),
    row("状态", localizeStatus(task.status)),
    row("阶段", task.stage || "未记录"),
    row("关联媒体库", task.libraryName ?? task.libraryId ?? "全局任务"),
    row("创建时间", formatDate(task.createdAtUtc)),
    row("开始时间", task.startedAtUtc ? formatDate(task.startedAtUtc) : "未开始"),
    row("结束时间", task.completedAtUtc ? formatDate(task.completedAtUtc) : "未结束"),
    row("最近刷新", formatDate(task.updatedAtUtc)),
    row("进度", taskProgressText(task)),
    row("重试来源", task.retriedFromTaskId ?? "首次执行"),
  ].join("");

  return `
    <div class="modal-shell" role="dialog" aria-modal="true" aria-labelledby="task-detail-title" data-task-detail-modal>
      <div class="modal-card task-detail-card">
        <div class="modal-header">
          <div>
            <span class="eyebrow ${task.status === "failed" ? "danger-eyebrow" : ""}">Task Detail</span>
            <h2 id="task-detail-title">任务详情</h2>
          </div>
          <button type="button" class="icon-button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <p class="modal-copy">
          ${escapeHtml(task.summary)}
        </p>
        <div class="task-detail-status-row">
          <span class="activity-pill">${escapeHtml(localizeStatus(task.status))}</span>
          <span class="activity-pill">${escapeHtml(task.type)}</span>
          <span class="activity-pill">${escapeHtml(task.stage || "未记录")}</span>
          <span class="activity-pill">${escapeHtml(taskProgressText(task))}</span>
        </div>
        <div class="task-detail-grid">
          ${timeline}
        </div>
        <div class="task-detail-error-block">
          <span>失败原因</span>
          <strong data-task-detail-error>${escapeHtml(task.errorMessage || "当前任务未记录失败原因。")}</strong>
        </div>
        <div class="modal-actions">
          <button type="button" class="ghost-button" data-action="close-modal">关闭</button>
          ${task.status === "failed" && task.canRetry
            ? `<button type="button" class="primary-button" data-action="retry-task" data-task-id="${escapeHtml(task.id)}" data-task-detail-retry ${pending ? "disabled" : ""}>${retryLabel}</button>`
            : ""}
        </div>
      </div>
    </div>
  `;
}

function row(label: string, value: string): string {
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function taskProgressText(task: WorkerTaskDto): string {
  if (task.progressTotal > 0) {
    return `${task.progressCurrent}/${task.progressTotal} · ${task.percent}%`;
  }

  if (task.percent > 0) {
    return `${task.percent}%`;
  }

  return task.status === "failed" ? "执行失败" : "等待中";
}

function localizeStatus(value: string): string {
  return value === "queued"
    ? "排队中"
    : value === "running"
      ? "运行中"
      : value === "succeeded"
        ? "已完成"
        : value === "failed"
          ? "失败"
          : value;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "未记录"
    : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
