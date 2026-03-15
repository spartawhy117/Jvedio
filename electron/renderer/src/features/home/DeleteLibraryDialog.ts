import type { LibraryListItemDto } from "../../types/api.js";

export function renderDeleteLibraryDialog(library: LibraryListItemDto, errorMessage: string | null, pending: boolean): string {
  const scanPath = library.scanPaths[0] ?? "未配置扫描目录";

  return `
    <div class="modal-shell" role="dialog" aria-modal="true" aria-labelledby="delete-library-title">
      <div class="modal-card danger-card">
        <div class="modal-header">
          <div>
            <span class="eyebrow danger-eyebrow">Delete Library</span>
            <h2 id="delete-library-title">删除媒体库</h2>
          </div>
          <button type="button" class="icon-button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <p class="modal-copy">
          当前只删除库配置和关联数据，不会删除磁盘上的影片文件。
        </p>
        <div class="danger-summary">
          <div><span>名称</span><strong>${escapeHtml(library.name)}</strong></div>
          <div><span>主路径</span><strong>${escapeHtml(scanPath)}</strong></div>
          <div><span>影片数</span><strong>${library.videoCount}</strong></div>
        </div>
        ${errorMessage ? `<div class="inline-error">${escapeHtml(errorMessage)}</div>` : ""}
        <div class="modal-actions">
          <button type="button" class="ghost-button" data-action="close-modal">取消</button>
          <button type="button" class="danger-button" data-action="confirm-delete-library" data-library-id="${escapeHtml(library.libraryId)}" ${pending ? "disabled" : ""}>${pending ? "删除中..." : "确认删除"}</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
