export function renderCreateLibraryDialog(defaultName: string, defaultScanPath: string, errorMessage: string | null, pending: boolean): string {
  return `
    <div class="modal-shell" role="dialog" aria-modal="true" aria-labelledby="create-library-title">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <span class="eyebrow">Create Library</span>
            <h2 id="create-library-title">新建媒体库</h2>
          </div>
          <button type="button" class="icon-button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <p class="modal-copy">
          先打通 Home MVP 的最小建库路径。扫描目录支持单行一个路径，当前首个路径会作为 Home 卡片主路径展示。
        </p>
        ${errorMessage ? `<div class="inline-error">${escapeHtml(errorMessage)}</div>` : ""}
        <form data-form="create-library" class="modal-form">
          <label class="field">
            <span>媒体库名称</span>
            <input type="text" name="name" value="${escapeHtml(defaultName)}" maxlength="120" required />
          </label>
          <label class="field">
            <span>扫描目录</span>
            <textarea name="scanPath" rows="4" placeholder="D:\\Media\\JAV">${escapeHtml(defaultScanPath)}</textarea>
          </label>
          <div class="modal-actions">
            <button type="button" class="ghost-button" data-action="close-modal">取消</button>
            <button type="submit" class="primary-button" ${pending ? "disabled" : ""}>${pending ? "创建中..." : "创建媒体库"}</button>
          </div>
        </form>
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
