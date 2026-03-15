import { ApiClient, WorkerApiError } from "../../api/client/apiClient.js";
import { useLibraryNavItems } from "../../app/navigation/useLibraryNavItems.js";
import { ensureRoute, toHash, type AppRoute } from "../../app/routes/router.js";
import type {
  GetBootstrapResponse,
  LibraryChangedEventDto,
  LibraryListItemDto,
  TaskSummaryDto,
  TaskSummaryChangedEventDto,
  WorkerEventEnvelopeDto,
  WorkerStatusDto
} from "../../types/api.js";
import { renderCreateLibraryDialog } from "./CreateLibraryDialog.js";
import { renderDeleteLibraryDialog } from "./DeleteLibraryDialog.js";

interface AppBridge {
  getAppVersion(): Promise<string>;
}

interface WorkerBridge {
  getWorkerBaseUrl(): Promise<string>;
}

declare global {
  interface Window {
    jvedioApp: AppBridge;
    jvedioWorker: WorkerBridge;
  }
}

type ModalState =
  | null
  | {
      kind: "create";
      name: string;
      scanPath: string;
      errorMessage: string | null;
      pending: boolean;
    }
  | {
      kind: "delete";
      libraryId: string;
      errorMessage: string | null;
      pending: boolean;
    };

interface RendererState {
  appVersion: string;
  bootstrap: GetBootstrapResponse | null;
  inlineError: string | null;
  infoMessage: string | null;
  loading: boolean;
  modal: ModalState;
  route: AppRoute;
  workerWarning: string | null;
  workerBaseUrl: string;
}

export class HomePageController {
  private apiClient: ApiClient | null = null;
  private eventSource: EventSource | null = null;
  private eventStreamUrl = "";
  private readonly rootElement: HTMLElement;
  private state: RendererState = {
    appVersion: "",
    bootstrap: null,
    inlineError: null,
    infoMessage: null,
    loading: true,
    modal: null,
    route: { kind: "home" },
    workerWarning: null,
    workerBaseUrl: "",
  };

  public constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
    this.rootElement.addEventListener("click", (event) => {
      void this.handleClick(event);
    });
    this.rootElement.addEventListener("submit", (event) => {
      void this.handleSubmit(event);
    });
    window.addEventListener("hashchange", () => {
      this.syncRouteFromHash();
      this.render();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.state.modal) {
        this.closeModal();
      }
    });
    window.addEventListener("beforeunload", () => {
      this.disposeEventStream();
    });
  }

  public async initialize(): Promise<void> {
    this.render();

    const [appVersion, workerBaseUrl] = await Promise.all([
      window.jvedioApp.getAppVersion(),
      window.jvedioWorker.getWorkerBaseUrl()
    ]);

    this.state = {
      ...this.state,
      appVersion,
      workerBaseUrl,
    };
    this.apiClient = new ApiClient(workerBaseUrl);

    await this.reloadHomeData();
  }

  private async reloadHomeData(options?: { infoMessage?: string | null }): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    this.state = {
      ...this.state,
      infoMessage: options?.infoMessage ?? null,
      inlineError: null,
      loading: true,
    };
    this.render();

    try {
      const bootstrap = await this.apiClient.getBootstrap();
      const route = ensureRoute(window.location.hash || bootstrap.shell.startRoute, bootstrap.libraries);

      if (toHash(route) !== (window.location.hash || "#/home")) {
        window.location.hash = toHash(route);
      }

      this.state = {
        ...this.state,
        bootstrap,
        inlineError: null,
        loading: false,
        route,
        workerWarning: null,
      };
      this.ensureEventStream(bootstrap.worker.eventStreamPath);
    } catch (error) {
      this.disposeEventStream();
      this.state = {
        ...this.state,
        bootstrap: null,
        infoMessage: null,
        inlineError: this.toUserMessage(error),
        loading: false,
        workerWarning: null,
      };
    }

    this.render();
  }

  private syncRouteFromHash(): void {
    const libraries = this.state.bootstrap?.libraries ?? [];
    this.state = {
      ...this.state,
      route: ensureRoute(window.location.hash, libraries),
    };
  }

  private async handleClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement | null;
    const actionElement = target?.closest<HTMLElement>("[data-action]");
    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.action;
    if (!action) {
      return;
    }

    switch (action) {
      case "open-create-dialog":
        this.state = {
          ...this.state,
          modal: {
            kind: "create",
            name: "",
            scanPath: "",
            errorMessage: null,
            pending: false,
          },
        };
        this.render();
        break;
      case "open-delete-dialog": {
        const libraryId = actionElement.dataset.libraryId ?? "";
        this.state = {
          ...this.state,
          modal: {
            kind: "delete",
            libraryId,
            errorMessage: null,
            pending: false,
          },
        };
        this.render();
        break;
      }
      case "navigate-home":
        window.location.hash = "#/home";
        break;
      case "close-modal":
        this.closeModal();
        break;
      case "refresh-home":
        await this.reloadHomeData();
        break;
      case "confirm-delete-library": {
        const libraryId = actionElement.dataset.libraryId ?? "";
        await this.deleteLibrary(libraryId);
        break;
      }
      default:
        break;
    }
  }

  private async handleSubmit(event: Event): Promise<void> {
    const form = event.target as HTMLFormElement | null;
    if (!form || form.dataset.form !== "create-library") {
      return;
    }

    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const scanPath = String(formData.get("scanPath") ?? "").trim();
    const scanPaths = scanPath
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    this.state = {
      ...this.state,
      modal: {
        kind: "create",
        name,
        scanPath,
        errorMessage: null,
        pending: true,
      },
    };
    this.render();

    try {
      await this.apiClient?.createLibrary({
        name,
        path: scanPaths[0] ?? "",
        scanPaths,
      });
      this.closeModal(false);
      await this.reloadHomeData({ infoMessage: `媒体库“${name}”已创建。` });
    } catch (error) {
      this.state = {
        ...this.state,
        modal: {
          kind: "create",
          name,
          scanPath,
          errorMessage: this.toUserMessage(error),
          pending: false,
        },
      };
      this.render();
    }
  }

  private async deleteLibrary(libraryId: string): Promise<void> {
    if (!this.apiClient || this.state.modal?.kind !== "delete") {
      return;
    }

    this.state = {
      ...this.state,
      modal: {
        ...this.state.modal,
        errorMessage: null,
        pending: true,
      },
    };
    this.render();

    try {
      const deletedLibrary = this.findLibrary(libraryId);
      await this.apiClient.deleteLibrary(libraryId);
      this.closeModal(false);
      if (this.state.route.kind === "library" && this.state.route.libraryId === libraryId) {
        window.location.hash = "#/home";
      }
      await this.reloadHomeData({
        infoMessage: deletedLibrary ? `媒体库“${deletedLibrary.name}”已删除。` : "媒体库已删除。"
      });
    } catch (error) {
      if (this.state.modal?.kind !== "delete") {
        return;
      }

      this.state = {
        ...this.state,
        modal: {
          ...this.state.modal,
          errorMessage: this.toUserMessage(error),
          pending: false,
        },
      };
      this.render();
    }
  }

  private closeModal(clearMessage = true): void {
    this.state = {
      ...this.state,
      modal: null,
      ...(clearMessage ? { infoMessage: null } : {}),
    };
    this.render();
  }

  private findLibrary(libraryId: string): LibraryListItemDto | undefined {
    return this.state.bootstrap?.libraries.find((library) => library.libraryId === libraryId);
  }

  private ensureEventStream(eventStreamPath: string): void {
    if (!this.apiClient) {
      return;
    }

    if (typeof EventSource === "undefined") {
      this.setWorkerWarning("当前运行环境不支持 Worker 事件流，任务摘要和库导航需要手动刷新。");
      return;
    }

    const nextEventStreamUrl = this.apiClient.getEventStreamUrl(eventStreamPath);
    if (this.eventSource && this.eventStreamUrl === nextEventStreamUrl) {
      return;
    }

    this.disposeEventStream();

    const eventSource = new EventSource(nextEventStreamUrl);
    this.eventSource = eventSource;
    this.eventStreamUrl = nextEventStreamUrl;

    eventSource.onopen = () => {
      this.setWorkerWarning(null);
    };

    eventSource.onerror = () => {
      this.setWorkerWarning("Worker 事件流已断开，库导航和任务摘要可能不是最新状态，可手动刷新。");
    };

    eventSource.addEventListener("library.changed", (event) => {
      void this.handleLibraryChangedEvent(event);
    });
    eventSource.addEventListener("task.summary.changed", (event) => {
      void this.handleTaskSummaryChangedEvent(event);
    });
    eventSource.addEventListener("task.created", () => {
      void this.refreshTaskSummaryInBackground();
    });
    eventSource.addEventListener("task.completed", () => {
      void this.refreshTaskSummaryInBackground();
    });
    eventSource.addEventListener("task.failed", () => {
      void this.refreshTaskSummaryInBackground();
    });
  }

  private disposeEventStream(): void {
    if (!this.eventSource) {
      return;
    }

    this.eventSource.close();
    this.eventSource = null;
    this.eventStreamUrl = "";
  }

  private async handleLibraryChangedEvent(event: Event): Promise<void> {
    const messageEvent = event as MessageEvent<string>;
    const envelope = parseWorkerEventEnvelope<LibraryChangedEventDto>(messageEvent.data);
    if (!envelope) {
      this.setWorkerWarning("Worker 推送了无法识别的库变更事件，请查看日志。");
      return;
    }

    await this.refreshBootstrapInBackground();
  }

  private async handleTaskSummaryChangedEvent(event: Event): Promise<void> {
    const messageEvent = event as MessageEvent<string>;
    const envelope = parseWorkerEventEnvelope<TaskSummaryChangedEventDto>(messageEvent.data);
    if (!envelope) {
      this.setWorkerWarning("Worker 推送了无法识别的任务摘要事件，请查看日志。");
      return;
    }

    this.applyTaskSummary(envelope.data.summary);
  }

  private applyTaskSummary(summary: TaskSummaryDto): void {
    if (!this.state.bootstrap) {
      return;
    }

    this.state = {
      ...this.state,
      bootstrap: {
        ...this.state.bootstrap,
        taskSummary: summary,
      },
    };
    this.render();
  }

  private async refreshBootstrapInBackground(): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    try {
      const bootstrap = await this.apiClient.getBootstrap();
      const route = ensureRoute(window.location.hash || bootstrap.shell.startRoute, bootstrap.libraries);

      if (toHash(route) !== (window.location.hash || "#/home")) {
        window.location.hash = toHash(route);
      }

      this.state = {
        ...this.state,
        bootstrap,
        inlineError: null,
        route,
        workerWarning: null,
      };
      this.ensureEventStream(bootstrap.worker.eventStreamPath);
      this.render();
    } catch (error) {
      this.setWorkerWarning(this.toBackgroundWarningMessage(error));
    }
  }

  private async refreshTaskSummaryInBackground(): Promise<void> {
    if (!this.apiClient || !this.state.bootstrap) {
      return;
    }

    try {
      const response = await this.apiClient.getTasks();
      this.state = {
        ...this.state,
        bootstrap: {
          ...this.state.bootstrap,
          taskSummary: response.summary,
        },
        workerWarning: null,
      };
      this.render();
    } catch (error) {
      this.setWorkerWarning(this.toBackgroundWarningMessage(error));
    }
  }

  private setWorkerWarning(message: string | null): void {
    if (this.state.workerWarning === message) {
      return;
    }

    this.state = {
      ...this.state,
      workerWarning: message,
    };
    this.render();
  }

  private toUserMessage(error: unknown): string {
    if (error instanceof WorkerApiError) {
      return error.userMessage;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "发生未知错误，请稍后重试。";
  }

  private toBackgroundWarningMessage(error: unknown): string {
    const userMessage = this.toUserMessage(error);
    return `${userMessage} 当前已保留上一次成功加载的数据。`;
  }

  private render(): void {
    this.rootElement.innerHTML = this.renderShell();
  }

  private renderShell(): string {
    const bootstrap = this.state.bootstrap;
    const libraries = bootstrap?.libraries ?? [];
    const taskSummary = bootstrap?.taskSummary ?? emptyTaskSummary();
    const worker = bootstrap?.worker ?? emptyWorkerStatus();
    const currentRoute = this.state.route;
    const currentLibraryId = currentRoute.kind === "library" ? currentRoute.libraryId : null;
    const selectedLibrary = currentLibraryId
      ? libraries.find((library) => library.libraryId === currentLibraryId) ?? null
      : null;
    const libraryNavItems = useLibraryNavItems(libraries, currentRoute);

    return `
      <main class="app-shell">
        <aside class="shell-sidebar">
          <div class="sidebar-header">
            <span class="brand-mark">JV</span>
            <div>
              <div class="brand-title">Jvedio Desktop</div>
              <div class="brand-subtitle">Home MVP / Stage C-3</div>
            </div>
          </div>
          <button class="primary-button wide-button" data-action="open-create-dialog">新建媒体库</button>
          <nav class="primary-nav">
            <a class="nav-link ${currentRoute.kind === "home" ? "active" : ""}" href="#/home">
              <span>Home</span>
              <small>${libraries.length} libs</small>
            </a>
          </nav>
          <section class="nav-section">
            <div class="nav-section-label">Libraries</div>
            ${libraryNavItems.length > 0
              ? libraryNavItems.map((item) => `
                  <a class="nav-link ${item.active ? "active" : ""}" href="${item.href}">
                    <span>${escapeHtml(item.label)}</span>
                    ${item.badge ? `<small>${escapeHtml(item.badge)}</small>` : ""}
                  </a>
                `).join("")
              : `<div class="empty-nav">当前还没有媒体库，先创建一个。</div>`}
          </section>
          <section class="sidebar-footer">
            <div class="footer-card">
              <div class="footer-label">Worker</div>
              <div class="footer-value ${worker.healthy ? "status-ok" : "status-error"}">${escapeHtml(worker.status)}</div>
              <div class="footer-hint">${escapeHtml(bootstrap?.app.version ?? this.state.appVersion)}</div>
            </div>
          </section>
        </aside>
        <section class="shell-content">
          <header class="content-header">
            <div>
              <span class="eyebrow">${currentRoute.kind === "home" ? "Home" : "Library"}</span>
              <h1>${currentRoute.kind === "home" ? "媒体库总览" : escapeHtml(selectedLibrary?.name ?? "媒体库")}</h1>
              <p>
                ${currentRoute.kind === "home"
                  ? "当前阶段已打通 Worker 同步接口，这里开始承接 Home 页面、导航和库管理交互。"
                  : "Library 路由壳已接通。下一阶段会在这里补齐影片列表、筛选和扫描抓取入口。"}
              </p>
            </div>
            <div class="header-actions">
              <button class="ghost-button" data-action="refresh-home">刷新</button>
              ${currentRoute.kind === "library" ? `<button class="ghost-button" data-action="navigate-home">返回 Home</button>` : ""}
            </div>
          </header>
          ${this.state.workerWarning ? `<div class="page-banner warning-banner">${escapeHtml(this.state.workerWarning)}</div>` : ""}
          ${this.state.inlineError ? `<div class="page-banner error-banner">${escapeHtml(this.state.inlineError)}</div>` : ""}
          ${this.state.infoMessage ? `<div class="page-banner info-banner">${escapeHtml(this.state.infoMessage)}</div>` : ""}
          ${this.state.loading ? renderLoadingState() : this.renderRouteContent(libraries, taskSummary, worker, selectedLibrary)}
        </section>
        ${this.renderModal(libraries)}
      </main>
    `;
  }

  private renderRouteContent(
    libraries: readonly LibraryListItemDto[],
    taskSummary: TaskSummaryDto,
    worker: WorkerStatusDto,
    selectedLibrary: LibraryListItemDto | null,
  ): string {
    if (this.state.route.kind === "library") {
      return selectedLibrary
        ? renderLibraryRoute(selectedLibrary, taskSummary, worker)
        : `<div class="page-banner error-banner">当前媒体库不存在，已回退到 Home。</div>`;
    }

    return renderHomePage(libraries, taskSummary, worker);
  }

  private renderModal(libraries: readonly LibraryListItemDto[]): string {
    const modal = this.state.modal;
    if (!modal) {
      return "";
    }

    if (modal.kind === "create") {
      return renderCreateLibraryDialog(
        modal.name,
        modal.scanPath,
        modal.errorMessage,
        modal.pending,
      );
    }

    const library = libraries.find((item) => item.libraryId === modal.libraryId);
    if (!library) {
      return "";
    }

    return renderDeleteLibraryDialog(library, modal.errorMessage, modal.pending);
  }
}

function renderHomePage(libraries: readonly LibraryListItemDto[], taskSummary: TaskSummaryDto, worker: WorkerStatusDto): string {
  return `
    <section class="metric-grid">
      ${renderMetricCard("媒体库", String(libraries.length), "Home 与左导航共享同一份库清单")}
      ${renderMetricCard("运行中任务", String(taskSummary.runningCount), "当前任务抽屉尚未接线，先展示摘要")}
      ${renderMetricCard("今日完成", String(taskSummary.completedTodayCount), "后续由 SSE 与任务中心刷新")}
      ${renderMetricCard("Worker", worker.healthy ? "Healthy" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}
    </section>
    <section class="split-layout">
      <div class="surface-card">
        <div class="section-header">
          <div>
            <span class="eyebrow">Libraries</span>
            <h2>媒体库列表</h2>
          </div>
          <button class="ghost-button" data-action="open-create-dialog">添加媒体库</button>
        </div>
        ${libraries.length > 0
          ? `<div class="library-grid">${libraries.map(renderLibraryCard).join("")}</div>`
          : `<div class="empty-card">
              <h3>还没有媒体库</h3>
              <p>先创建一个库，后续 C-4 再接入 SSE，让 Home 与侧栏自动刷新。</p>
              <button class="primary-button" data-action="open-create-dialog">创建第一个媒体库</button>
            </div>`}
      </div>
      <div class="surface-card side-stack">
        <div class="section-header">
          <div>
            <span class="eyebrow">Task Summary</span>
            <h2>任务摘要</h2>
          </div>
        </div>
        <div class="task-list">
          ${renderSummaryRow("运行中", taskSummary.runningCount)}
          ${renderSummaryRow("排队中", taskSummary.queuedCount)}
          ${renderSummaryRow("失败", taskSummary.failedCount)}
          ${renderSummaryRow("今日完成", taskSummary.completedTodayCount)}
        </div>
        <div class="worker-note" data-last-updated-utc="${escapeHtml(taskSummary.lastUpdatedUtc)}">
          <div class="note-label">最近刷新</div>
          <div class="note-value">${formatDateTime(taskSummary.lastUpdatedUtc)}</div>
        </div>
      </div>
    </section>
  `;
}

function renderLibraryRoute(library: LibraryListItemDto, taskSummary: TaskSummaryDto, worker: WorkerStatusDto): string {
  const scanPaths = library.scanPaths.length > 0
    ? library.scanPaths.map((path) => `<li>${escapeHtml(path)}</li>`).join("")
    : "<li>未配置扫描目录</li>";

  return `
    <section class="metric-grid">
      ${renderMetricCard("影片数", String(library.videoCount), "当前来自 app_databases.Count")}
      ${renderMetricCard("运行中任务", String(taskSummary.runningCount), "下一阶段会关联到当前库")}
      ${renderMetricCard("抓取时间", library.lastScrapeAt ? formatDateTime(library.lastScrapeAt) : "未记录", "C-4 后再做事件刷新")}
      ${renderMetricCard("Worker", worker.healthy ? "Ready" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}
    </section>
    <section class="split-layout single-column">
      <div class="surface-card">
        <div class="section-header">
          <div>
            <span class="eyebrow">Library Route</span>
            <h2>${escapeHtml(library.name)}</h2>
          </div>
          <button class="danger-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}">删除媒体库</button>
        </div>
        <p class="route-copy">
          C-3 先完成路由壳、导航同步和 Home 列表交互。影片列表、筛选、扫描与抓取入口会在下一批阶段继续补齐。
        </p>
        <div class="library-detail-grid">
          <div class="detail-card">
            <span>Library ID</span>
            <strong>${escapeHtml(library.libraryId)}</strong>
          </div>
          <div class="detail-card">
            <span>主路径</span>
            <strong>${escapeHtml(library.path || "未配置")}</strong>
          </div>
          <div class="detail-card">
            <span>扫描路径数量</span>
            <strong>${library.scanPaths.length}</strong>
          </div>
          <div class="detail-card">
            <span>运行中任务</span>
            <strong>${library.hasRunningTask ? "Yes" : "No"}</strong>
          </div>
        </div>
        <div class="scan-path-panel">
          <div class="scan-path-title">扫描目录</div>
          <ul>${scanPaths}</ul>
        </div>
      </div>
    </section>
  `;
}

function renderMetricCard(label: string, value: string, note: string): string {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function renderSummaryRow(label: string, value: number): string {
  return `
    <div class="task-row">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderLibraryCard(library: LibraryListItemDto): string {
  const scanPathMarkup = library.scanPaths.length > 0
    ? library.scanPaths.slice(0, 2).map((path) => `<span class="path-badge">${escapeHtml(path)}</span>`).join("")
    : `<span class="path-badge muted-badge">未配置扫描目录</span>`;

  return `
    <article class="library-card">
      <div class="library-card-head">
        <a href="#/libraries/${escapeHtml(library.libraryId)}" class="library-title">${escapeHtml(library.name)}</a>
        <button class="icon-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}" aria-label="删除媒体库">×</button>
      </div>
      <div class="library-stat">${library.videoCount} videos</div>
      <div class="path-list">${scanPathMarkup}</div>
      <div class="library-card-actions">
        <a href="#/libraries/${escapeHtml(library.libraryId)}" class="ghost-link">打开库路由</a>
      </div>
    </article>
  `;
}

function renderLoadingState(): string {
  return `
    <section class="loading-shell">
      <div class="loading-card">
        <span class="eyebrow">Loading</span>
        <h2>正在加载 Home MVP 数据</h2>
        <p>读取 bootstrap、libraries 与 tasks summary，准备初始化左导航和路由壳。</p>
      </div>
    </section>
  `;
}

function formatDateTime(value: string): string {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function emptyTaskSummary(): TaskSummaryDto {
  return {
    completedTodayCount: 0,
    failedCount: 0,
    lastUpdatedUtc: new Date().toISOString(),
    queuedCount: 0,
    runningCount: 0,
  };
}

function emptyWorkerStatus(): WorkerStatusDto {
  return {
    baseUrl: "",
    eventStreamPath: "/api/events",
    healthy: false,
    startedAtUtc: "",
    status: "starting",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseWorkerEventEnvelope<TData>(rawValue: string): WorkerEventEnvelopeDto<TData> | null {
  try {
    return JSON.parse(rawValue) as WorkerEventEnvelopeDto<TData>;
  } catch {
    return null;
  }
}
