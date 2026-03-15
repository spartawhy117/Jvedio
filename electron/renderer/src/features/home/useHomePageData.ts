import { ApiClient, WorkerApiError } from "../../api/client/apiClient.js";
import { useLibraryNavItems } from "../../app/navigation/useLibraryNavItems.js";
import { ensureRoute, toHash, type AppRoute } from "../../app/routes/router.js";
import type {
  GetBootstrapResponse,
  GetTasksResponse,
  LibraryChangedEventDto,
  LibraryListItemDto,
  TaskSummaryDto,
  TaskSummaryChangedEventDto,
  WorkerEventEnvelopeDto,
  WorkerStatusDto,
  WorkerTaskDto,
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

type LibraryActionKind = "save" | "scan" | "scrape";

interface LibraryActionState {
  kind: LibraryActionKind;
  libraryId: string;
}

interface RendererState {
  appVersion: string;
  bootstrap: GetBootstrapResponse | null;
  inlineError: string | null;
  infoMessage: string | null;
  libraryAction: LibraryActionState | null;
  loading: boolean;
  modal: ModalState;
  route: AppRoute;
  scanPathDrafts: Record<string, string>;
  tasks: readonly WorkerTaskDto[];
  workerBaseUrl: string;
  workerWarning: string | null;
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
    libraryAction: null,
    loading: true,
    modal: null,
    route: { kind: "home" },
    scanPathDrafts: {},
    tasks: [],
    workerBaseUrl: "",
    workerWarning: null,
  };

  public constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
    this.rootElement.addEventListener("click", (event) => {
      void this.handleClick(event);
    });
    this.rootElement.addEventListener("input", (event) => {
      this.handleInput(event);
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
      window.jvedioWorker.getWorkerBaseUrl(),
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
      libraryAction: null,
      loading: true,
    };
    this.render();

    try {
      const [bootstrap, tasksResponse] = await Promise.all([
        this.apiClient.getBootstrap(),
        this.apiClient.getTasks(),
      ]);
      const route = ensureRoute(window.location.hash || bootstrap.shell.startRoute, bootstrap.libraries);

      if (toHash(route) !== (window.location.hash || "#/home")) {
        window.location.hash = toHash(route);
      }

      this.state = {
        ...this.state,
        bootstrap: {
          ...bootstrap,
          taskSummary: tasksResponse.summary,
        },
        inlineError: null,
        loading: false,
        route,
        scanPathDrafts: syncScanPathDrafts(this.state.scanPathDrafts, bootstrap.libraries),
        tasks: tasksResponse.tasks,
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
        libraryAction: null,
        loading: false,
        tasks: [],
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

  private handleInput(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!(target instanceof HTMLTextAreaElement) || target.name !== "library-scan-paths") {
      return;
    }

    const libraryId = target.dataset.libraryId ?? "";
    if (!libraryId) {
      return;
    }

    this.state = {
      ...this.state,
      scanPathDrafts: {
        ...this.state.scanPathDrafts,
        [libraryId]: target.value,
      },
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
      case "refresh-library-tasks":
        await this.refreshAllDataInBackground();
        break;
      case "save-library-scan-paths":
        await this.saveLibraryScanPaths(actionElement.dataset.libraryId ?? "");
        break;
      case "start-library-scan":
        await this.startLibraryScan(actionElement.dataset.libraryId ?? "");
        break;
      case "start-library-scrape":
        await this.startLibraryScrape(actionElement.dataset.libraryId ?? "");
        break;
      case "confirm-delete-library":
        await this.deleteLibrary(actionElement.dataset.libraryId ?? "");
        break;
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
    const scanPaths = normalizeScanPaths(scanPath);

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
        infoMessage: deletedLibrary ? `媒体库“${deletedLibrary.name}”已删除。` : "媒体库已删除。",
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

  private async saveLibraryScanPaths(libraryId: string): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    const library = this.findLibrary(libraryId);
    if (!library) {
      return;
    }

    const scanPathText = this.getScanPathDraft(library);
    const scanPaths = normalizeScanPaths(scanPathText);
    this.state = {
      ...this.state,
      infoMessage: null,
      inlineError: null,
      libraryAction: {
        kind: "save",
        libraryId,
      },
      scanPathDrafts: {
        ...this.state.scanPathDrafts,
        [libraryId]: scanPathText,
      },
    };
    this.render();

    try {
      await this.apiClient.updateLibrary(libraryId, {
        name: library.name,
        scanPaths,
      });
      this.state = {
        ...this.state,
        scanPathDrafts: {
          ...this.state.scanPathDrafts,
          [libraryId]: scanPaths.join("\n"),
        },
      };
      await this.reloadHomeData({ infoMessage: `已保存“${library.name}”的扫描目录。` });
    } catch (error) {
      this.state = {
        ...this.state,
        inlineError: this.toUserMessage(error),
        libraryAction: null,
      };
      this.render();
    }
  }

  private async startLibraryScan(libraryId: string): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    const library = this.findLibrary(libraryId);
    if (!library) {
      return;
    }

    this.state = {
      ...this.state,
      infoMessage: null,
      inlineError: null,
      libraryAction: {
        kind: "scan",
        libraryId,
      },
    };
    this.render();

    try {
      const response = await this.apiClient.startLibraryScan(libraryId, {
        forceRescan: false,
        organizeBeforeScan: true,
        paths: normalizeScanPaths(this.getScanPathDraft(library)),
      });
      await this.reloadHomeData({
        infoMessage: `已启动扫描任务 ${response.task.id}。`,
      });
    } catch (error) {
      this.state = {
        ...this.state,
        inlineError: this.toUserMessage(error),
        libraryAction: null,
      };
      this.render();
    }
  }

  private async startLibraryScrape(libraryId: string): Promise<void> {
    if (!this.apiClient) {
      return;
    }

    const library = this.findLibrary(libraryId);
    if (!library) {
      return;
    }

    this.state = {
      ...this.state,
      infoMessage: null,
      inlineError: null,
      libraryAction: {
        kind: "scrape",
        libraryId,
      },
    };
    this.render();

    try {
      const response = await this.apiClient.startLibraryScrape(libraryId, {
        downloadActorAvatars: true,
        forceRefreshMetadata: false,
        mode: "missing-only",
        videoIds: [],
        writeSidecars: true,
      });
      await this.reloadHomeData({
        infoMessage: `已启动抓取任务 ${response.task.id}。`,
      });
    } catch (error) {
      this.state = {
        ...this.state,
        inlineError: this.toUserMessage(error),
        libraryAction: null,
      };
      this.render();
    }
  }

  private getScanPathDraft(library: LibraryListItemDto): string {
    return this.state.scanPathDrafts[library.libraryId] ?? library.scanPaths.join("\n");
  }

  private findLibrary(libraryId: string): LibraryListItemDto | undefined {
    return this.state.bootstrap?.libraries.find((library) => library.libraryId === libraryId);
  }

  private ensureEventStream(eventStreamPath: string): void {
    if (!this.apiClient) {
      return;
    }

    if (typeof EventSource === "undefined") {
      this.setWorkerWarning("当前运行环境不支持 Worker 事件流，任务状态和库状态需要手动刷新。");
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
      this.setWorkerWarning("Worker 事件流已断开，库状态与任务状态可能不是最新数据，可手动刷新。");
    };

    eventSource.addEventListener("library.changed", (event) => {
      void this.handleLibraryChangedEvent(event);
    });
    eventSource.addEventListener("task.summary.changed", (event) => {
      void this.handleTaskSummaryChangedEvent(event);
    });
    eventSource.addEventListener("task.created", () => {
      void this.refreshAllDataInBackground();
    });
    eventSource.addEventListener("task.completed", () => {
      void this.refreshAllDataInBackground();
    });
    eventSource.addEventListener("task.failed", () => {
      void this.refreshAllDataInBackground();
    });
    eventSource.addEventListener("task.progress", () => {
      void this.refreshTasksInBackground();
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
        bootstrap: {
          ...bootstrap,
          taskSummary: this.state.bootstrap?.taskSummary ?? bootstrap.taskSummary,
        },
        inlineError: null,
        libraryAction: null,
        route,
        scanPathDrafts: syncScanPathDrafts(this.state.scanPathDrafts, bootstrap.libraries),
        workerWarning: null,
      };
      this.render();
    } catch (error) {
      this.setWorkerWarning(this.toBackgroundWarningMessage(error));
    }
  }

  private async refreshTasksInBackground(): Promise<void> {
    if (!this.apiClient || !this.state.bootstrap) {
      return;
    }

    try {
      const response = await this.apiClient.getTasks();
      this.applyTasksResponse(response);
      this.setWorkerWarning(null);
    } catch (error) {
      this.setWorkerWarning(this.toBackgroundWarningMessage(error));
    }
  }

  private async refreshAllDataInBackground(): Promise<void> {
    await Promise.all([
      this.refreshBootstrapInBackground(),
      this.refreshTasksInBackground(),
    ]);
  }

  private applyTasksResponse(response: GetTasksResponse): void {
    if (!this.state.bootstrap) {
      return;
    }

    this.state = {
      ...this.state,
      bootstrap: {
        ...this.state.bootstrap,
        taskSummary: response.summary,
      },
      libraryAction: null,
      tasks: response.tasks,
    };
    this.render();
  }

  private closeModal(clearMessage = true): void {
    this.state = {
      ...this.state,
      modal: null,
      ...(clearMessage ? { infoMessage: null } : {}),
    };
    this.render();
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
    return `${this.toUserMessage(error)} 当前已保留上一次成功加载的数据。`;
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
              <div class="brand-subtitle">Stage D / Scan + Scrape Loop</div>
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
                  ? "当前阶段优先收口扫描目录、扫描触发、任务状态回传和 MetaTube 最小抓取闭环。"
                  : "这里已接入扫描目录保存、扫描/抓取入口和任务状态列表，可直接验证 Stage D 主链路。"}
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
        ? this.renderLibraryRoute(selectedLibrary, taskSummary, worker)
        : `<div class="page-banner error-banner">当前媒体库不存在，已回退到 Home。</div>`;
    }

    return renderHomePage(libraries, taskSummary, worker, this.state.tasks);
  }

  private renderLibraryRoute(library: LibraryListItemDto, taskSummary: TaskSummaryDto, worker: WorkerStatusDto): string {
    const libraryTasks = this.state.tasks.filter((task) => task.libraryId === library.libraryId);
    const pendingAction = this.state.libraryAction?.libraryId === library.libraryId
      ? this.state.libraryAction.kind
      : null;
    const hasRunningTask = libraryTasks.some((task) => isActiveTask(task));
    const runningTask = libraryTasks.find((task) => isActiveTask(task)) ?? null;

    return `
      <section class="metric-grid">
        ${renderMetricCard("影片数", String(library.videoCount), "来自 sqlite 中该库的 metadata 计数")}
        ${renderMetricCard("库内任务", String(libraryTasks.length), "显示当前库最近的扫描/抓取任务")}
        ${renderMetricCard("最近扫描", library.lastScanAt ? formatDateTime(library.lastScanAt) : "未记录", "完成扫描后由 Worker 回写")}
        ${renderMetricCard("最近抓取", library.lastScrapeAt ? formatDateTime(library.lastScrapeAt) : "未记录", "完成抓取后写入库状态")}
      </section>
      <section class="split-layout">
        <div class="surface-card library-workbench">
          <div class="section-header">
            <div>
              <span class="eyebrow">Library Workbench</span>
              <h2>${escapeHtml(library.name)}</h2>
            </div>
            <button class="danger-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}">删除媒体库</button>
          </div>
          <p class="route-copy">Worker 已支持读取和保存默认扫描目录，并可直接发起扫描与 MetaTube 最小抓取链路。</p>
          <div class="library-detail-grid">
            <div class="detail-card"><span>Library ID</span><strong>${escapeHtml(library.libraryId)}</strong></div>
            <div class="detail-card"><span>主路径</span><strong>${escapeHtml(library.path || "未配置")}</strong></div>
            <div class="detail-card"><span>运行中任务</span><strong>${hasRunningTask ? "Yes" : "No"}</strong></div>
            <div class="detail-card"><span>Worker</span><strong>${worker.healthy ? "Ready" : "Unavailable"}</strong></div>
          </div>
          <div class="scan-path-editor">
            <label class="field-label" for="library-scan-paths-${escapeHtml(library.libraryId)}">默认扫描目录</label>
            <textarea id="library-scan-paths-${escapeHtml(library.libraryId)}" class="scan-path-textarea" name="library-scan-paths" data-library-id="${escapeHtml(library.libraryId)}" placeholder="每行一个目录">${escapeHtml(this.getScanPathDraft(library))}</textarea>
            <div class="inline-note">保存后会写回库默认扫描目录。执行扫描时会优先使用这里的路径。</div>
          </div>
          <div class="action-row">
            <button class="primary-button" data-action="save-library-scan-paths" data-library-id="${escapeHtml(library.libraryId)}" ${pendingAction === "save" ? "disabled" : ""}>${pendingAction === "save" ? "保存中..." : "保存扫描目录"}</button>
            <button class="ghost-button" data-action="start-library-scan" data-library-id="${escapeHtml(library.libraryId)}" ${(pendingAction === "scan" || hasRunningTask) ? "disabled" : ""}>${pendingAction === "scan" ? "扫描启动中..." : "触发扫描"}</button>
            <button class="ghost-button" data-action="start-library-scrape" data-library-id="${escapeHtml(library.libraryId)}" ${(pendingAction === "scrape" || hasRunningTask) ? "disabled" : ""}>${pendingAction === "scrape" ? "抓取启动中..." : "触发抓取"}</button>
            <button class="ghost-button" data-action="refresh-library-tasks">刷新任务</button>
          </div>
          ${runningTask ? `<div class="page-banner info-banner">当前任务：${escapeHtml(formatTaskHeadline(runningTask))}</div>` : ""}
        </div>
        <div class="surface-card side-stack">
          <div class="section-header">
            <div>
              <span class="eyebrow">Task Feed</span>
              <h2>当前库任务</h2>
            </div>
          </div>
          ${libraryTasks.length > 0
            ? `<div class="task-feed">${libraryTasks.slice(0, 8).map(renderTaskCard).join("")}</div>`
            : `<div class="empty-card compact-empty"><h3>当前还没有任务</h3><p>先保存扫描目录，再触发扫描或抓取，就可以在这里看到任务状态回传。</p></div>`}
          <div class="worker-note">
            <div class="note-label">摘要刷新</div>
            <div class="note-value">${formatDateTime(taskSummary.lastUpdatedUtc)}</div>
          </div>
        </div>
      </section>
    `;
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
    return library ? renderDeleteLibraryDialog(library, modal.errorMessage, modal.pending) : "";
  }
}

function renderHomePage(
  libraries: readonly LibraryListItemDto[],
  taskSummary: TaskSummaryDto,
  worker: WorkerStatusDto,
  tasks: readonly WorkerTaskDto[],
): string {
  return `
    <section class="metric-grid">
      ${renderMetricCard("媒体库", String(libraries.length), "Home 与左导航共享同一份库清单")}
      ${renderMetricCard("运行中任务", String(taskSummary.runningCount), "包含扫描与抓取任务")}
      ${renderMetricCard("今日完成", String(taskSummary.completedTodayCount), "由 SSE 与 /api/tasks 刷新")}
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
          ? `<div class="library-grid">${libraries.map((library) => renderLibraryCard(library, tasks)).join("")}</div>`
          : `<div class="empty-card">
              <h3>还没有媒体库</h3>
              <p>先创建一个库，接着在库页配置扫描目录并触发扫描/抓取链路。</p>
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
        <div class="task-feed home-task-feed">
          ${tasks.length > 0
            ? tasks.slice(0, 5).map(renderTaskCard).join("")
            : `<div class="empty-task-feed">当前还没有任务记录。</div>`}
        </div>
        <div class="worker-note" data-last-updated-utc="${escapeHtml(taskSummary.lastUpdatedUtc)}">
          <div class="note-label">最近刷新</div>
          <div class="note-value">${formatDateTime(taskSummary.lastUpdatedUtc)}</div>
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

function renderLibraryCard(library: LibraryListItemDto, tasks: readonly WorkerTaskDto[]): string {
  const scanPathMarkup = library.scanPaths.length > 0
    ? library.scanPaths.slice(0, 2).map((path) => `<span class="path-badge">${escapeHtml(path)}</span>`).join("")
    : `<span class="path-badge muted-badge">未配置扫描目录</span>`;
  const activeTask = tasks.find((task) => task.libraryId === library.libraryId && isActiveTask(task));

  return `
    <article class="library-card">
      <div class="library-card-head">
        <a href="#/libraries/${escapeHtml(library.libraryId)}" class="library-title">${escapeHtml(library.name)}</a>
        <button class="icon-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}" aria-label="删除媒体库">×</button>
      </div>
      <div class="library-stat">${library.videoCount} videos</div>
      <div class="path-list">${scanPathMarkup}</div>
      ${activeTask ? `<div class="task-chip">${escapeHtml(formatTaskHeadline(activeTask))}</div>` : ""}
      <div class="library-card-actions">
        <a href="#/libraries/${escapeHtml(library.libraryId)}" class="ghost-link">打开库工作台</a>
      </div>
    </article>
  `;
}

function renderTaskCard(task: WorkerTaskDto): string {
  const progress = task.progressTotal > 0
    ? `${task.progressCurrent}/${task.progressTotal}`
    : task.percent > 0
      ? `${task.percent}%`
      : "等待中";

  return `
    <article class="task-card ${escapeHtml(task.status)}">
      <div class="task-card-head">
        <strong>${escapeHtml(task.libraryName ?? task.libraryId ?? "全局任务")}</strong>
        <span>${escapeHtml(formatTaskStatus(task.status))}</span>
      </div>
      <div class="task-card-title">${escapeHtml(task.type)}</div>
      <div class="task-card-summary">${escapeHtml(task.summary)}</div>
      <div class="task-card-meta">
        <span>${escapeHtml(task.stage)}</span>
        <span>${escapeHtml(progress)}</span>
        <span>${task.percent}%</span>
      </div>
      <div class="task-card-time">${escapeHtml(formatDateTime(task.updatedAtUtc))}</div>
      ${task.errorMessage ? `<div class="task-error">${escapeHtml(task.errorMessage)}</div>` : ""}
    </article>
  `;
}

function renderLoadingState(): string {
  return `
    <section class="loading-shell">
      <div class="loading-card">
        <span class="eyebrow">Loading</span>
        <h2>正在加载 Stage D 数据</h2>
        <p>读取 bootstrap、libraries 与 tasks，准备初始化库工作台和任务状态回传。</p>
      </div>
    </section>
  `;
}

function syncScanPathDrafts(
  currentDrafts: Record<string, string>,
  libraries: readonly LibraryListItemDto[],
): Record<string, string> {
  const nextDrafts: Record<string, string> = {};
  for (const library of libraries) {
    nextDrafts[library.libraryId] = currentDrafts[library.libraryId] ?? library.scanPaths.join("\n");
  }

  return nextDrafts;
}

function normalizeScanPaths(scanPathText: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of scanPathText.split(/\r?\n/).map((value) => value.trim()).filter((value) => value.length > 0)) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function isActiveTask(task: WorkerTaskDto): boolean {
  return task.status === "queued" || task.status === "running";
}

function formatTaskHeadline(task: WorkerTaskDto): string {
  const progress = task.progressTotal > 0 ? ` ${task.progressCurrent}/${task.progressTotal}` : "";
  return `${formatTaskStatus(task.status)} · ${task.type} · ${task.percent}%${progress}`;
}

function formatTaskStatus(status: string): string {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "运行中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status;
  }
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
    timeStyle: "short",
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
