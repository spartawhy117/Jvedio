import { ApiClient, WorkerApiError } from "../../api/client/apiClient.js";
import { useLibraryNavItems } from "../../app/navigation/useLibraryNavItems.js";
import {
  createDefaultLibraryVideoRouteQuery,
  ensureRoute,
  toHash,
  type AppRoute,
  type LibraryVideoRouteQuery,
} from "../../app/routes/router.js";
import type {
  GetBootstrapResponse,
  GetLibraryVideosResponse,
  LibraryChangedEventDto,
  LibraryListItemDto,
  TaskSummaryDto,
  TaskSummaryChangedEventDto,
  VideoDetailDto,
  WorkerEventEnvelopeDto,
  WorkerStatusDto,
  WorkerTaskDto,
} from "../../types/api.js";
import { renderCreateLibraryDialog } from "./CreateLibraryDialog.js";
import { renderDeleteLibraryDialog } from "./DeleteLibraryDialog.js";

interface AppBridge { getAppVersion(): Promise<string>; }
interface WorkerBridge { getWorkerBaseUrl(): Promise<string>; }

declare global {
  interface Window {
    jvedioApp: AppBridge;
    jvedioWorker: WorkerBridge;
  }
}

type ModalState =
  | null
  | { kind: "create"; errorMessage: string | null; name: string; pending: boolean; scanPath: string; }
  | { kind: "delete"; errorMessage: string | null; libraryId: string; pending: boolean; };

type LibraryActionKind = "refresh-videos" | "save" | "scan" | "scrape";
interface LibraryActionState { kind: LibraryActionKind; libraryId: string; }
interface VideoActionState { kind: "play"; videoId: string; }

interface RendererState {
  appVersion: string;
  bootstrap: GetBootstrapResponse | null;
  inlineError: string | null;
  infoMessage: string | null;
  libraryAction: LibraryActionState | null;
  libraryVideoDrafts: Record<string, LibraryVideoRouteQuery>;
  libraryVideos: Record<string, GetLibraryVideosResponse | undefined>;
  loading: boolean;
  modal: ModalState;
  route: AppRoute;
  routeDataLoading: boolean;
  scanPathDrafts: Record<string, string>;
  tasks: readonly WorkerTaskDto[];
  videoAction: VideoActionState | null;
  videoDetail: VideoDetailDto | null;
  workerBaseUrl: string;
  workerWarning: string | null;
}

export class HomePageController {
  private apiClient: ApiClient | null = null;
  private eventSource: EventSource | null = null;
  private eventStreamUrl = "";
  private readonly rootElement: HTMLElement;
  private routeLoadVersion = 0;
  private state: RendererState = {
    appVersion: "",
    bootstrap: null,
    inlineError: null,
    infoMessage: null,
    libraryAction: null,
    libraryVideoDrafts: {},
    libraryVideos: {},
    loading: true,
    modal: null,
    route: { kind: "home" },
    routeDataLoading: false,
    scanPathDrafts: {},
    tasks: [],
    videoAction: null,
    videoDetail: null,
    workerBaseUrl: "",
    workerWarning: null,
  };

  public constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
    this.rootElement.addEventListener("change", (event) => this.handleInput(event));
    this.rootElement.addEventListener("click", (event) => void this.handleClick(event));
    this.rootElement.addEventListener("input", (event) => this.handleInput(event));
    this.rootElement.addEventListener("submit", (event) => void this.handleSubmit(event));
    window.addEventListener("beforeunload", () => this.disposeEventStream());
    window.addEventListener("hashchange", () => void this.onHashChanged());
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.state.modal) this.closeModal();
    });
  }

  public async initialize(): Promise<void> {
    this.render();
    const [appVersion, workerBaseUrl] = await Promise.all([
      window.jvedioApp.getAppVersion(),
      window.jvedioWorker.getWorkerBaseUrl(),
    ]);
    this.state = { ...this.state, appVersion, workerBaseUrl };
    this.apiClient = new ApiClient(workerBaseUrl);
    await this.reloadHomeData();
  }

  private async reloadHomeData(info?: string | null): Promise<void> {
    if (!this.apiClient) return;
    this.state = {
      ...this.state,
      infoMessage: info ?? null,
      inlineError: null,
      libraryAction: null,
      loading: true,
    };
    this.render();

    try {
      const [bootstrap, tasks] = await Promise.all([
        this.apiClient.getBootstrap(),
        this.apiClient.getTasks(),
      ]);
      const route = ensureRoute(window.location.hash || bootstrap.shell.startRoute, bootstrap.libraries);
      if (toHash(route) !== (window.location.hash || "#/home")) {
        window.location.hash = toHash(route);
      }

      this.state = {
        ...this.state,
        bootstrap: { ...bootstrap, taskSummary: tasks.summary },
        libraryVideoDrafts: syncLibraryVideoDrafts(this.state.libraryVideoDrafts, route),
        loading: false,
        route,
        routeDataLoading: route.kind !== "home",
        scanPathDrafts: syncScanPathDrafts(this.state.scanPathDrafts, bootstrap.libraries),
        tasks: tasks.tasks,
        workerWarning: null,
      };
      this.ensureEventStream(bootstrap.worker.eventStreamPath);
      this.render();
      await this.loadRouteData(false);
    } catch (error) {
      this.disposeEventStream();
      this.state = {
        ...this.state,
        bootstrap: null,
        infoMessage: null,
        inlineError: this.toUserMessage(error),
        loading: false,
        routeDataLoading: false,
        tasks: [],
        videoDetail: null,
        workerWarning: null,
      };
      this.render();
    }
  }

  private async onHashChanged(): Promise<void> {
    const libraries = this.state.bootstrap?.libraries ?? [];
    const route = ensureRoute(window.location.hash, libraries);
    this.state = {
      ...this.state,
      libraryVideoDrafts: syncLibraryVideoDrafts(this.state.libraryVideoDrafts, route),
      route,
      routeDataLoading: route.kind !== "home",
    };
    this.render();
    await this.loadRouteData(false);
  }

  private handleInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && target.name === "library-scan-paths") {
      const libraryId = target.dataset.libraryId ?? "";
      if (libraryId) {
        this.state = {
          ...this.state,
          scanPathDrafts: { ...this.state.scanPathDrafts, [libraryId]: target.value },
        };
      }
      return;
    }

    const libraryId = target instanceof HTMLElement ? target.dataset.libraryId ?? "" : "";
    if (!libraryId) return;

    const current = cloneQuery(this.getLibraryVideoDraft(libraryId));
    if (target instanceof HTMLInputElement && target.dataset.queryField) {
      if (target.dataset.queryField === "keyword") current.keyword = target.value;
      if (target.dataset.queryField === "missingSidecarOnly") current.missingSidecarOnly = target.checked;
      current.pageIndex = 0;
    }

    if (target instanceof HTMLSelectElement && target.dataset.queryField) {
      if (target.dataset.queryField === "sortBy") current.sortBy = target.value;
      if (target.dataset.queryField === "sortOrder") current.sortOrder = target.value === "asc" ? "asc" : "desc";
    }

    this.state = {
      ...this.state,
      libraryVideoDrafts: { ...this.state.libraryVideoDrafts, [libraryId]: current },
    };
  }

  private async handleClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement | null;
    const actionElement = target?.closest<HTMLElement>("[data-action]");
    const action = actionElement?.dataset.action;
    if (!action || !actionElement) return;

    const libraryId = actionElement.dataset.libraryId ?? "";
    const videoId = actionElement.dataset.videoId ?? "";
    switch (action) {
      case "open-create-dialog":
        this.state = { ...this.state, modal: { kind: "create", errorMessage: null, name: "", pending: false, scanPath: "" } };
        this.render();
        return;
      case "open-delete-dialog":
        this.state = { ...this.state, modal: { kind: "delete", errorMessage: null, libraryId, pending: false } };
        this.render();
        return;
      case "close-modal":
        this.closeModal();
        return;
      case "confirm-delete-library":
        await this.deleteLibrary(libraryId);
        return;
      case "navigate-home":
        window.location.hash = "#/home";
        return;
      case "navigate-library":
        if (libraryId) window.location.hash = toHash({ kind: "library", libraryId, query: this.getLibraryVideoDraft(libraryId) });
        return;
      case "refresh-home":
        await this.reloadHomeData();
        return;
      case "refresh-library-tasks":
        await this.refreshAllDataInBackground();
        return;
      case "save-library-scan-paths":
        await this.saveLibraryScanPaths(libraryId);
        return;
      case "start-library-scan":
        await this.startLibraryScan(libraryId);
        return;
      case "start-library-scrape":
        await this.startLibraryScrape(libraryId);
        return;
      case "apply-library-video-query":
        if (libraryId) window.location.hash = toHash({ kind: "library", libraryId, query: this.getLibraryVideoDraft(libraryId) });
        return;
      case "reset-library-video-query":
        if (libraryId) {
          const query = createDefaultLibraryVideoRouteQuery();
          this.state = { ...this.state, libraryVideoDrafts: { ...this.state.libraryVideoDrafts, [libraryId]: query } };
          window.location.hash = toHash({ kind: "library", libraryId, query });
        }
        return;
      case "refresh-library-videos":
        await this.refreshLibraryVideos(libraryId);
        return;
      case "play-video":
        await this.playVideo(videoId);
        return;
      default:
        return;
    }
  }

  private async handleSubmit(event: Event): Promise<void> {
    const form = event.target as HTMLFormElement | null;
    if (!form || form.dataset.form !== "create-library") return;
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const scanPath = String(formData.get("scanPath") ?? "").trim();
    const scanPaths = normalizeScanPaths(scanPath);
    this.state = { ...this.state, modal: { kind: "create", errorMessage: null, name, pending: true, scanPath } };
    this.render();

    try {
      await this.apiClient?.createLibrary({ name, path: scanPaths[0] ?? "", scanPaths });
      this.closeModal(false);
      await this.reloadHomeData(`媒体库“${name}”已创建。`);
    } catch (error) {
      this.state = { ...this.state, modal: { kind: "create", errorMessage: this.toUserMessage(error), name, pending: false, scanPath } };
      this.render();
    }
  }

  private async deleteLibrary(libraryId: string): Promise<void> {
    if (!this.apiClient || this.state.modal?.kind !== "delete") return;
    this.state = { ...this.state, modal: { ...this.state.modal, errorMessage: null, pending: true } };
    this.render();

    try {
      const deleted = this.findLibrary(libraryId);
      await this.apiClient.deleteLibrary(libraryId);
      this.closeModal(false);
      if (this.state.route.kind === "library" && this.state.route.libraryId === libraryId) window.location.hash = "#/home";
      await this.reloadHomeData(deleted ? `媒体库“${deleted.name}”已删除。` : "媒体库已删除。");
    } catch (error) {
      if (this.state.modal?.kind !== "delete") return;
      this.state = { ...this.state, modal: { ...this.state.modal, errorMessage: this.toUserMessage(error), pending: false } };
      this.render();
    }
  }

  private async saveLibraryScanPaths(libraryId: string): Promise<void> {
    const library = this.findLibrary(libraryId);
    if (!this.apiClient || !library) return;
    this.state = { ...this.state, inlineError: null, infoMessage: null, libraryAction: { kind: "save", libraryId } };
    this.render();

    try {
      const scanPaths = normalizeScanPaths(this.getScanPathDraft(library));
      await this.apiClient.updateLibrary(libraryId, { name: library.name, scanPaths });
      this.state = { ...this.state, scanPathDrafts: { ...this.state.scanPathDrafts, [libraryId]: scanPaths.join("\n") } };
      await this.reloadHomeData(`已保存“${library.name}”的扫描目录。`);
    } catch (error) {
      this.state = { ...this.state, inlineError: this.toUserMessage(error), libraryAction: null };
      this.render();
    }
  }

  private async startLibraryScan(libraryId: string): Promise<void> {
    const library = this.findLibrary(libraryId);
    if (!this.apiClient || !library) return;
    this.state = { ...this.state, inlineError: null, infoMessage: null, libraryAction: { kind: "scan", libraryId } };
    this.render();

    try {
      const response = await this.apiClient.startLibraryScan(libraryId, {
        forceRescan: false,
        organizeBeforeScan: true,
        paths: normalizeScanPaths(this.getScanPathDraft(library)),
      });
      await this.reloadHomeData(`已启动扫描任务 ${response.task.id}。`);
    } catch (error) {
      this.state = { ...this.state, inlineError: this.toUserMessage(error), libraryAction: null };
      this.render();
    }
  }

  private async startLibraryScrape(libraryId: string): Promise<void> {
    const library = this.findLibrary(libraryId);
    if (!this.apiClient || !library) return;
    this.state = { ...this.state, inlineError: null, infoMessage: null, libraryAction: { kind: "scrape", libraryId } };
    this.render();

    try {
      const response = await this.apiClient.startLibraryScrape(libraryId, {
        downloadActorAvatars: true,
        forceRefreshMetadata: false,
        mode: "missing-only",
        videoIds: [],
        writeSidecars: true,
      });
      await this.reloadHomeData(`已启动抓取任务 ${response.task.id}。`);
    } catch (error) {
      this.state = { ...this.state, inlineError: this.toUserMessage(error), libraryAction: null };
      this.render();
    }
  }

  private async refreshLibraryVideos(libraryId: string): Promise<void> {
    if (!libraryId) return;
    this.state = { ...this.state, inlineError: null, infoMessage: null, libraryAction: { kind: "refresh-videos", libraryId } };
    this.render();
    await this.loadRouteData(true, "已刷新影片结果集。");
    this.state = { ...this.state, libraryAction: null };
    this.render();
  }

  private async playVideo(videoId: string): Promise<void> {
    if (!this.apiClient || !videoId) return;
    this.state = { ...this.state, inlineError: null, infoMessage: null, videoAction: { kind: "play", videoId } };
    this.render();

    try {
      const response = await this.apiClient.playVideo(videoId, { playerProfile: "default", resume: true });
      this.state = {
        ...this.state,
        infoMessage: response.usedSystemDefault
          ? "已调用系统默认播放器，并完成播放写回。"
          : `已调用播放器 ${response.usedPlayerPath ?? ""}，并完成播放写回。`,
        videoAction: null,
      };
      await this.loadRouteData(false);
      if (this.state.videoDetail) await this.loadLibraryVideosFor(this.state.videoDetail.libraryId, false);
    } catch (error) {
      this.state = { ...this.state, inlineError: this.toUserMessage(error), videoAction: null };
      this.render();
    }
  }

  private async loadRouteData(showLoading: boolean, infoMessage?: string): Promise<void> {
    if (!this.apiClient || !this.state.bootstrap) return;
    const route = this.state.route;
    const version = ++this.routeLoadVersion;
    if (showLoading) {
      this.state = { ...this.state, inlineError: null, infoMessage: infoMessage ?? this.state.infoMessage, routeDataLoading: route.kind !== "home" };
      this.render();
    }

    try {
      if (route.kind === "home") {
        this.state = { ...this.state, routeDataLoading: false, videoDetail: null };
        this.render();
        return;
      }

      if (route.kind === "library") {
        await this.loadLibraryVideosFor(route.libraryId, showLoading, version, infoMessage);
        return;
      }

      const detail = await this.apiClient.getVideoDetail(route.videoId);
      if (version !== this.routeLoadVersion) return;
      this.state = { ...this.state, inlineError: detail.video ? null : "影片详情不存在。", routeDataLoading: false, videoDetail: detail.video };
      this.render();
    } catch (error) {
      if (version !== this.routeLoadVersion) return;
      this.state = { ...this.state, inlineError: this.toUserMessage(error), routeDataLoading: false, videoDetail: route.kind === "video" ? null : this.state.videoDetail };
      this.render();
    }
  }

  private async loadLibraryVideosFor(libraryId: string, _showLoading: boolean, version = this.routeLoadVersion, infoMessage?: string): Promise<void> {
    if (!this.apiClient) return;
    const response = await this.apiClient.getLibraryVideos(libraryId, this.getLibraryVideoDraft(libraryId));
    if (version !== this.routeLoadVersion) return;
    this.state = {
      ...this.state,
      infoMessage: infoMessage ?? this.state.infoMessage,
      inlineError: null,
      libraryVideos: { ...this.state.libraryVideos, [libraryId]: response },
      routeDataLoading: false,
      videoDetail: null,
    };
    this.render();
  }

  private async refreshAllDataInBackground(): Promise<void> {
    await Promise.all([this.refreshBootstrapInBackground(), this.refreshTasksInBackground(), this.loadRouteData(false)]);
  }

  private async refreshBootstrapInBackground(): Promise<void> {
    if (!this.apiClient || !this.state.bootstrap) return;
    try {
      const bootstrap = await this.apiClient.getBootstrap();
      const route = ensureRoute(window.location.hash || bootstrap.shell.startRoute, bootstrap.libraries);
      this.state = {
        ...this.state,
        bootstrap: { ...bootstrap, taskSummary: this.state.bootstrap.taskSummary },
        libraryVideoDrafts: syncLibraryVideoDrafts(this.state.libraryVideoDrafts, route),
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
    if (!this.apiClient || !this.state.bootstrap) return;
    try {
      const tasks = await this.apiClient.getTasks();
      this.state = { ...this.state, bootstrap: { ...this.state.bootstrap, taskSummary: tasks.summary }, tasks: tasks.tasks };
      this.render();
    } catch (error) {
      this.setWorkerWarning(this.toBackgroundWarningMessage(error));
    }
  }

  private ensureEventStream(path: string): void {
    if (!this.apiClient) return;
    if (typeof EventSource === "undefined") {
      this.setWorkerWarning("当前运行环境不支持 Worker 事件流。");
      return;
    }

    const url = this.apiClient.getEventStreamUrl(path);
    if (this.eventSource && this.eventStreamUrl === url) return;
    this.disposeEventStream();
    this.eventSource = new EventSource(url);
    this.eventStreamUrl = url;
    this.eventSource.onopen = () => this.setWorkerWarning(null);
    this.eventSource.onerror = () => this.setWorkerWarning("Worker 事件流已断开，可手动刷新。");
    this.eventSource.addEventListener("library.changed", (event) => void this.handleLibraryChanged(event));
    this.eventSource.addEventListener("task.summary.changed", (event) => this.handleTaskSummaryChanged(event));
    this.eventSource.addEventListener("task.created", () => void this.refreshAllDataInBackground());
    this.eventSource.addEventListener("task.completed", () => void this.refreshAllDataInBackground());
    this.eventSource.addEventListener("task.failed", () => void this.refreshAllDataInBackground());
    this.eventSource.addEventListener("task.progress", () => void this.refreshTasksInBackground());
  }

  private disposeEventStream(): void {
    if (!this.eventSource) return;
    this.eventSource.close();
    this.eventSource = null;
    this.eventStreamUrl = "";
  }

  private async handleLibraryChanged(event: Event): Promise<void> {
    const envelope = parseWorkerEventEnvelope<LibraryChangedEventDto>((event as MessageEvent<string>).data);
    if (!envelope) {
      this.setWorkerWarning("Worker 推送了无法识别的库变更事件。");
      return;
    }
    await this.refreshBootstrapInBackground();
    await this.loadRouteData(false);
  }

  private handleTaskSummaryChanged(event: Event): void {
    const envelope = parseWorkerEventEnvelope<TaskSummaryChangedEventDto>((event as MessageEvent<string>).data);
    if (!envelope || !this.state.bootstrap) return;
    this.state = { ...this.state, bootstrap: { ...this.state.bootstrap, taskSummary: envelope.data.summary } };
    this.render();
  }

  private getScanPathDraft(library: LibraryListItemDto): string {
    return this.state.scanPathDrafts[library.libraryId] ?? library.scanPaths.join("\n");
  }

  private getLibraryVideoDraft(libraryId: string): LibraryVideoRouteQuery {
    const routeQuery = this.state.route.kind === "library" && this.state.route.libraryId === libraryId ? this.state.route.query : null;
    return cloneQuery(this.state.libraryVideoDrafts[libraryId] ?? routeQuery ?? createDefaultLibraryVideoRouteQuery());
  }

  private findLibrary(libraryId: string): LibraryListItemDto | undefined {
    return this.state.bootstrap?.libraries.find((library) => library.libraryId === libraryId);
  }

  private closeModal(clearMessage = true): void {
    this.state = { ...this.state, modal: null, ...(clearMessage ? { infoMessage: null } : {}) };
    this.render();
  }

  private setWorkerWarning(message: string | null): void {
    if (this.state.workerWarning === message) return;
    this.state = { ...this.state, workerWarning: message };
    this.render();
  }

  private toUserMessage(error: unknown): string {
    if (error instanceof WorkerApiError) return error.userMessage;
    if (error instanceof Error) return error.message;
    return "发生未知错误，请稍后重试。";
  }

  private toBackgroundWarningMessage(error: unknown): string {
    return `${this.toUserMessage(error)} 当前已保留上一次成功加载的数据。`;
  }

  private render(): void {
    const bootstrap = this.state.bootstrap;
    const libraries = bootstrap?.libraries ?? [];
    const worker = bootstrap?.worker ?? emptyWorker();
    const title = this.state.route.kind === "home"
      ? "媒体库总览"
      : this.state.route.kind === "library"
        ? (this.findLibrary(this.state.route.libraryId)?.name ?? "媒体库")
        : (this.state.videoDetail?.displayTitle ?? "影片详情");
    const routeBody = this.state.loading ? renderLoading() : this.renderRouteBody(libraries, worker);

    this.rootElement.innerHTML = `
      <main class="app-shell">
        <aside class="shell-sidebar">
          <div class="sidebar-header"><span class="brand-mark">JV</span><div><div class="brand-title">Jvedio Desktop</div><div class="brand-subtitle">Batch 3 / Videos + Playback</div></div></div>
          <button class="primary-button wide-button" data-action="open-create-dialog">新建媒体库</button>
          <nav class="primary-nav"><a class="nav-link ${this.state.route.kind === "home" ? "active" : ""}" href="#/home"><span>Home</span><small>${libraries.length} libs</small></a></nav>
          <section class="nav-section"><div class="nav-section-label">Libraries</div>${renderNav(libraries, this.state.route)}</section>
          <section class="sidebar-footer"><div class="footer-card"><div class="footer-label">Worker</div><div class="footer-value ${worker.healthy ? "status-ok" : "status-error"}">${escapeHtml(worker.status)}</div><div class="footer-hint">${escapeHtml(bootstrap?.app.version ?? this.state.appVersion)}</div></div></section>
        </aside>
        <section class="shell-content">
          <header class="content-header"><div><span class="eyebrow">${this.state.route.kind === "home" ? "Home" : this.state.route.kind === "library" ? "Library" : "Video"}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(routeDescription(this.state.route.kind))}</p></div><div class="header-actions"><button class="ghost-button" data-action="refresh-home">刷新</button>${this.state.route.kind === "library" ? `<button class="ghost-button" data-action="navigate-home">返回 Home</button>` : ""}${this.state.route.kind === "video" && this.state.videoDetail ? `<button class="ghost-button" data-action="navigate-library" data-library-id="${escapeHtml(this.state.videoDetail.libraryId)}">返回媒体库</button>` : ""}</div></header>
          ${this.state.workerWarning ? `<div class="page-banner warning-banner">${escapeHtml(this.state.workerWarning)}</div>` : ""}
          ${this.state.inlineError ? `<div class="page-banner error-banner">${escapeHtml(this.state.inlineError)}</div>` : ""}
          ${this.state.infoMessage ? `<div class="page-banner info-banner">${escapeHtml(this.state.infoMessage)}</div>` : ""}
          ${routeBody}
        </section>
        ${this.renderModal(libraries)}
      </main>`;
  }

  private renderRouteBody(libraries: readonly LibraryListItemDto[], worker: WorkerStatusDto): string {
    const summary = this.state.bootstrap?.taskSummary ?? emptySummary();
    if (this.state.route.kind === "home") return renderHome(libraries, summary, worker, this.state.tasks);
    if (this.state.route.kind === "library") {
      const library = this.findLibrary(this.state.route.libraryId);
      return library ? renderLibraryRoute({
        draft: this.getLibraryVideoDraft(library.libraryId),
        library,
        pendingAction: this.state.libraryAction?.libraryId === library.libraryId ? this.state.libraryAction.kind : null,
        response: this.state.libraryVideos[library.libraryId],
        routeDataLoading: this.state.routeDataLoading,
        runningTask: this.state.tasks.find((task) => task.libraryId === library.libraryId && isActiveTask(task)) ?? null,
        scanPathDraft: this.getScanPathDraft(library),
        summary,
        tasks: this.state.tasks.filter((task) => task.libraryId === library.libraryId),
        worker,
      }) : `<div class="empty-card"><h3>媒体库不存在</h3><p>请返回 Home 重新选择媒体库。</p></div>`;
    }
    return renderVideoRoute({ routeDataLoading: this.state.routeDataLoading, video: this.state.videoDetail, videoAction: this.state.videoAction, worker });
  }

  private renderModal(libraries: readonly LibraryListItemDto[]): string {
    if (!this.state.modal) return "";
    if (this.state.modal.kind === "create") {
      return renderCreateLibraryDialog(this.state.modal.name, this.state.modal.scanPath, this.state.modal.errorMessage, this.state.modal.pending);
    }
    const libraryId = this.state.modal.kind === "delete" ? this.state.modal.libraryId : "";
    const library = libraries.find((item) => item.libraryId === libraryId);
    return library ? renderDeleteLibraryDialog(library, this.state.modal.errorMessage, this.state.modal.pending) : "";
  }
}

function renderNav(libraries: readonly LibraryListItemDto[], route: AppRoute): string {
  const items = useLibraryNavItems(libraries, route);
  return items.length > 0
    ? items.map((item) => `<a class="nav-link ${item.active ? "active" : ""}" href="${item.href}"><span>${escapeHtml(item.label)}</span>${item.badge ? `<small>${escapeHtml(item.badge)}</small>` : ""}</a>`).join("")
    : `<div class="empty-nav">当前还没有媒体库，先创建一个。</div>`;
}

function renderHome(libraries: readonly LibraryListItemDto[], summary: TaskSummaryDto, worker: WorkerStatusDto, tasks: readonly WorkerTaskDto[]): string {
  return `<section class="metric-grid">${metric("媒体库", String(libraries.length), "Home 与左导航共享库清单")}${metric("运行中任务", String(summary.runningCount), "包含扫描与抓取任务")}${metric("今日完成", String(summary.completedTodayCount), "由 SSE 与 /api/tasks 刷新")}${metric("Worker", worker.healthy ? "Healthy" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}</section><section class="split-layout"><div class="surface-card"><div class="section-header"><div><span class="eyebrow">Libraries</span><h2>媒体库列表</h2></div><button class="ghost-button" data-action="open-create-dialog">添加媒体库</button></div>${libraries.length > 0 ? `<div class="library-grid">${libraries.map((library) => renderLibraryCard(library, tasks)).join("")}</div>` : `<div class="empty-card"><h3>还没有媒体库</h3><p>先创建一个库，再在库页完成扫描、展示和播放验证。</p></div>`}</div><div class="surface-card side-stack"><div class="section-header"><div><span class="eyebrow">Task Summary</span><h2>任务摘要</h2></div></div><div class="task-list">${row("运行中", summary.runningCount)}${row("排队中", summary.queuedCount)}${row("失败", summary.failedCount)}${row("今日完成", summary.completedTodayCount)}</div><div class="task-feed home-task-feed">${tasks.length > 0 ? tasks.slice(0, 5).map(renderTaskCard).join("") : `<div class="empty-task-feed">当前还没有任务记录。</div>`}</div><div class="worker-note"><div class="note-label">最近刷新</div><div class="note-value">${formatDate(summary.lastUpdatedUtc)}</div></div></div></section>`;
}

function renderLibraryRoute(args: { draft: LibraryVideoRouteQuery; library: LibraryListItemDto; pendingAction: LibraryActionKind | null; response: GetLibraryVideosResponse | undefined; routeDataLoading: boolean; runningTask: WorkerTaskDto | null; scanPathDraft: string; summary: TaskSummaryDto; tasks: readonly WorkerTaskDto[]; worker: WorkerStatusDto; }): string {
  const { draft, library, pendingAction, response, routeDataLoading, runningTask, scanPathDraft, summary, tasks, worker } = args;
  const hasRunningTask = tasks.some((task) => isActiveTask(task));
  return `<section class="metric-grid">${metric("影片数", String(response?.totalCount ?? library.videoCount), "来自库结果集总数")}${metric("库内任务", String(tasks.length), "当前库最近任务")}${metric("最近扫描", library.lastScanAt ? formatDate(library.lastScanAt) : "未记录", "完成扫描后由 Worker 回写")}${metric("最近抓取", library.lastScrapeAt ? formatDate(library.lastScrapeAt) : "未记录", "完成抓取后回写")}</section><section class="split-layout"><div class="surface-card"><div class="section-header"><div><span class="eyebrow">Library Workbench</span><h2>${escapeHtml(library.name)}</h2></div><button class="danger-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}">删除媒体库</button></div><div class="library-detail-grid"><div class="detail-card"><span>Library ID</span><strong>${escapeHtml(library.libraryId)}</strong></div><div class="detail-card"><span>主路径</span><strong>${escapeHtml(library.path || "未配置")}</strong></div><div class="detail-card"><span>运行中任务</span><strong>${hasRunningTask ? "Yes" : "No"}</strong></div><div class="detail-card"><span>Worker</span><strong>${worker.healthy ? "Ready" : "Unavailable"}</strong></div></div><div class="scan-path-editor"><label class="field-label">默认扫描目录</label><textarea class="scan-path-textarea" name="library-scan-paths" data-library-id="${escapeHtml(library.libraryId)}">${escapeHtml(scanPathDraft)}</textarea><div class="inline-note">保存后会写回库默认扫描目录。执行扫描时优先使用这里的路径。</div></div><div class="action-row"><button class="primary-button" data-action="save-library-scan-paths" data-library-id="${escapeHtml(library.libraryId)}" ${pendingAction === "save" ? "disabled" : ""}>${pendingAction === "save" ? "保存中..." : "保存扫描目录"}</button><button class="ghost-button" data-action="start-library-scan" data-library-id="${escapeHtml(library.libraryId)}" ${(pendingAction === "scan" || hasRunningTask) ? "disabled" : ""}>${pendingAction === "scan" ? "扫描启动中..." : "触发扫描"}</button><button class="ghost-button" data-action="start-library-scrape" data-library-id="${escapeHtml(library.libraryId)}" ${(pendingAction === "scrape" || hasRunningTask) ? "disabled" : ""}>${pendingAction === "scrape" ? "抓取启动中..." : "触发抓取"}</button><button class="ghost-button" data-action="refresh-library-tasks">刷新任务</button></div>${runningTask ? `<div class="page-banner info-banner">当前任务：${escapeHtml(taskHeadline(runningTask))}</div>` : ""}</div><div class="surface-card side-stack"><div class="section-header"><div><span class="eyebrow">Task Feed</span><h2>当前库任务</h2></div></div>${tasks.length > 0 ? `<div class="task-feed">${tasks.slice(0, 8).map(renderTaskCard).join("")}</div>` : `<div class="empty-card compact-empty"><h3>当前还没有任务</h3><p>先保存扫描目录，再触发扫描或抓取。</p></div>`}<div class="worker-note"><div class="note-label">摘要刷新</div><div class="note-value">${formatDate(summary.lastUpdatedUtc)}</div></div></div></section><section class="surface-card video-results-surface"><div class="section-header"><div><span class="eyebrow">Videos</span><h2>影片结果集</h2></div><div class="section-meta">${response ? `${response.totalCount} items` : `${library.videoCount} indexed`}</div></div><div class="filter-toolbar"><input class="text-field" type="text" data-query-field="keyword" data-library-id="${escapeHtml(library.libraryId)}" value="${escapeHtml(draft.keyword)}" placeholder="按标题、VID 或路径筛选" /><select class="select-field" data-query-field="sortBy" data-library-id="${escapeHtml(library.libraryId)}">${option("lastScanDate", draft.sortBy, "最近扫描")}${option("title", draft.sortBy, "标题")}${option("vid", draft.sortBy, "VID")}${option("releaseDate", draft.sortBy, "发行日期")}${option("lastPlayedAt", draft.sortBy, "最近播放")}${option("viewCount", draft.sortBy, "播放次数")}</select><select class="select-field" data-query-field="sortOrder" data-library-id="${escapeHtml(library.libraryId)}">${option("desc", draft.sortOrder, "降序")}${option("asc", draft.sortOrder, "升序")}</select><label class="toggle-chip"><input type="checkbox" data-query-field="missingSidecarOnly" data-library-id="${escapeHtml(library.libraryId)}" ${draft.missingSidecarOnly ? "checked" : ""}/><span>仅看缺 sidecar</span></label><button class="primary-button" data-action="apply-library-video-query" data-library-id="${escapeHtml(library.libraryId)}">应用筛选</button><button class="ghost-button" data-action="reset-library-video-query" data-library-id="${escapeHtml(library.libraryId)}">重置</button><button class="ghost-button" data-action="refresh-library-videos" data-library-id="${escapeHtml(library.libraryId)}" ${pendingAction === "refresh-videos" ? "disabled" : ""}>${pendingAction === "refresh-videos" ? "刷新中..." : "刷新结果"}</button></div>${routeDataLoading && !response ? renderRouteLoading("正在拉取当前媒体库影片结果集...") : renderVideoResults(response, draft)}</section>`;
}

function renderVideoRoute(args: { routeDataLoading: boolean; video: VideoDetailDto | null; videoAction: VideoActionState | null; worker: WorkerStatusDto; }): string {
  const { routeDataLoading, video, videoAction, worker } = args;
  if (routeDataLoading && !video) return renderRouteLoading("正在加载影片详情...");
  if (!video) return `<div class="empty-card"><h3>影片详情不可用</h3><p>当前路由未命中有效影片，请返回媒体库重新选择。</p></div>`;
  const playing = videoAction?.kind === "play" && videoAction.videoId === video.videoId;
  return `<section class="metric-grid">${metric("VID", video.vid || "未识别", "来自 metadata_video.VID")}${metric("播放次数", String(video.viewCount), "播放写回只更新最近播放时间")}${metric("最近播放", video.lastPlayedAt ? formatDate(video.lastPlayedAt) : "未播放", "POST /api/videos/{videoId}/play 后写回")}${metric("Worker", worker.healthy ? "Ready" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}</section><section class="split-layout"><div class="surface-card"><div class="section-header"><div><span class="eyebrow">Video Detail</span><h2>${escapeHtml(video.displayTitle)}</h2></div><span class="code-pill">${escapeHtml(video.vid || video.videoId)}</span></div><p class="route-copy">${escapeHtml(video.plot || video.outline || "当前影片暂无简介。")}</p><div class="video-detail-list">${detail("媒体库", video.libraryName || video.libraryId)}${detail("文件路径", video.path)}${detail("发行日期", video.releaseDate ? formatDate(video.releaseDate) : "未记录")}${detail("系列", video.series || "未记录")}${detail("导演", video.director || "未记录")}${detail("片商", video.studio || "未记录")}${detail("时长", formatDuration(video.durationSeconds))}</div>${video.webUrl ? `<div class="inline-note">来源页面：<a class="ghost-link" href="${escapeHtml(video.webUrl)}">${escapeHtml(video.webUrl)}</a></div>` : ""}</div><div class="surface-card side-stack"><div class="section-header"><div><span class="eyebrow">Playback</span><h2>操作面板</h2></div></div><div class="action-column"><button class="primary-button" data-action="play-video" data-video-id="${escapeHtml(video.videoId)}" ${(!video.playback.canPlay || playing) ? "disabled" : ""}>${playing ? "调用中..." : "播放"}</button><button class="ghost-button" data-action="navigate-library" data-library-id="${escapeHtml(video.libraryId)}">返回媒体库</button></div><div class="worker-note"><div class="note-label">播放方式</div><div class="note-value">${video.playback.usesSystemDefault ? "系统默认播放器" : "自定义播放器"}</div><div class="footer-hint">${escapeHtml(video.playback.playerPath ?? "未配置自定义播放器")}</div></div><div class="worker-note"><div class="note-label">资源状态</div><div class="badge-row">${asset("NFO", video.sidecars.nfo.exists)}${asset("Poster", video.sidecars.poster.exists)}${asset("Thumb", video.sidecars.thumb.exists)}${asset("Fanart", video.sidecars.fanart.exists)}</div></div><div class="worker-note"><div class="note-label">演员</div>${video.actors.length > 0 ? `<div class="actor-pill-list">${video.actors.map((actor) => `<span class="actor-pill">${escapeHtml(actor.name)}</span>`).join("")}</div>` : `<div class="footer-hint">当前影片暂无演员信息。</div>`}</div></div></section>`;
}

function renderVideoResults(response: GetLibraryVideosResponse | undefined, draft: LibraryVideoRouteQuery): string {
  if (!response) return `<div class="empty-card"><h3>结果集尚未加载</h3><p>点击“应用筛选”或“刷新结果”后即可查看当前媒体库影片。</p></div>`;
  if (response.items.length === 0) return `<div class="empty-card"><h3>暂无结果</h3><p>${escapeHtml(draft.keyword || draft.missingSidecarOnly ? "当前筛选条件下没有命中影片。" : "当前媒体库还没有影片，请先执行扫描。")}</p></div>`;
  return `<div class="video-result-grid">${response.items.map((video) => `<article class="video-result-card"><div class="video-result-head"><a href="#/videos/${escapeHtml(video.videoId)}" class="video-result-title">${escapeHtml(video.displayTitle)}</a><span class="code-pill">${escapeHtml(video.vid || "NO-VID")}</span></div><div class="video-result-meta"><span>扫描：${escapeHtml(video.lastScanAt ? formatDate(video.lastScanAt) : "未记录")}</span><span>播放：${escapeHtml(video.lastPlayedAt ? formatDate(video.lastPlayedAt) : "未播放")}</span><span>次数：${video.viewCount}</span></div><div class="badge-row">${asset("NFO", video.hasNfo)}${asset("Poster", video.hasPoster)}${asset("Thumb", video.hasThumb)}${asset("Fanart", video.hasFanart)}</div><div class="inline-note">${escapeHtml(video.path)}</div><div class="library-card-actions"><a href="#/videos/${escapeHtml(video.videoId)}" class="ghost-link">查看详情</a></div></article>`).join("")}</div>`;
}

function renderLibraryCard(library: LibraryListItemDto, tasks: readonly WorkerTaskDto[]): string {
  const scanPaths = library.scanPaths.length > 0 ? library.scanPaths.slice(0, 2).map((path) => `<span class="path-badge">${escapeHtml(path)}</span>`).join("") : `<span class="path-badge muted-badge">未配置扫描目录</span>`;
  const activeTask = tasks.find((task) => task.libraryId === library.libraryId && isActiveTask(task));
  return `<article class="library-card"><div class="library-card-head"><a href="#/libraries/${escapeHtml(library.libraryId)}" class="library-title">${escapeHtml(library.name)}</a><button class="icon-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}" aria-label="删除媒体库">×</button></div><div class="library-stat">${library.videoCount} videos</div><div class="path-list">${scanPaths}</div>${activeTask ? `<div class="task-chip">${escapeHtml(taskHeadline(activeTask))}</div>` : ""}<div class="library-card-actions"><a href="#/libraries/${escapeHtml(library.libraryId)}" class="ghost-link">打开库工作台</a></div></article>`;
}

function renderTaskCard(task: WorkerTaskDto): string {
  const progress = task.progressTotal > 0 ? `${task.progressCurrent}/${task.progressTotal}` : task.percent > 0 ? `${task.percent}%` : "等待中";
  return `<article class="task-card ${escapeHtml(task.status)}"><div class="task-card-head"><strong>${escapeHtml(task.libraryName ?? task.libraryId ?? "全局任务")}</strong><span>${escapeHtml(status(task.status))}</span></div><div class="task-card-title">${escapeHtml(task.type)}</div><div class="task-card-summary">${escapeHtml(task.summary)}</div><div class="task-card-meta"><span>${escapeHtml(task.stage)}</span><span>${escapeHtml(progress)}</span><span>${task.percent}%</span></div><div class="task-card-time">${escapeHtml(formatDate(task.updatedAtUtc))}</div>${task.errorMessage ? `<div class="task-error">${escapeHtml(task.errorMessage)}</div>` : ""}</article>`;
}

function metric(label: string, value: string, note: string): string { return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`; }
function row(label: string, value: number): string { return `<div class="task-row"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`; }
function detail(label: string, value: string): string { return `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "未记录")}</strong></div>`; }
function asset(label: string, exists: boolean): string { return `<span class="asset-badge ${exists ? "ok" : "missing"}">${escapeHtml(label)} ${exists ? "OK" : "Missing"}</span>`; }
function option(value: string, current: string, label: string): string { return `<option value="${escapeHtml(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label)}</option>`; }
function renderRouteLoading(message: string): string { return `<section class="loading-shell"><div class="loading-card"><span class="eyebrow">Loading</span><h2>正在同步路由数据</h2><p>${escapeHtml(message)}</p></div></section>`; }
function renderLoading(): string { return `<section class="loading-shell"><div class="loading-card"><span class="eyebrow">Loading</span><h2>正在加载 Batch 3 数据</h2><p>读取 bootstrap、libraries、tasks 和当前路由所需的影片结果集或详情。</p></div></section>`; }
function routeDescription(kind: AppRoute["kind"]): string { return kind === "home" ? "当前阶段进入影片展示和播放。" : kind === "library" ? "这里同时承载扫描/抓取工作台和影片结果集。" : "基础详情、播放调用和播放写回已在这一页打通。"; }
function cloneQuery(query: LibraryVideoRouteQuery): LibraryVideoRouteQuery { return { keyword: query.keyword, missingSidecarOnly: query.missingSidecarOnly, pageIndex: query.pageIndex, pageSize: query.pageSize, sortBy: query.sortBy, sortOrder: query.sortOrder }; }
function syncLibraryVideoDrafts(current: Record<string, LibraryVideoRouteQuery>, route: AppRoute): Record<string, LibraryVideoRouteQuery> { return route.kind === "library" ? { ...current, [route.libraryId]: cloneQuery(route.query) } : current; }
function syncScanPathDrafts(current: Record<string, string>, libraries: readonly LibraryListItemDto[]): Record<string, string> { const next: Record<string, string> = {}; for (const library of libraries) next[library.libraryId] = current[library.libraryId] ?? library.scanPaths.join("\n"); return next; }
function normalizeScanPaths(value: string): string[] { const seen = new Set<string>(); const result: string[] = []; for (const item of value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) { const key = item.toLowerCase(); if (!seen.has(key)) { seen.add(key); result.push(item); } } return result; }
function isActiveTask(task: WorkerTaskDto): boolean { return task.status === "queued" || task.status === "running"; }
function taskHeadline(task: WorkerTaskDto): string { const progress = task.progressTotal > 0 ? ` ${task.progressCurrent}/${task.progressTotal}` : ""; return `${status(task.status)} · ${task.type} · ${task.percent}%${progress}`; }
function status(value: string): string { return value === "queued" ? "排队中" : value === "running" ? "运行中" : value === "succeeded" ? "已完成" : value === "failed" ? "失败" : value; }
function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value || "未记录" : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatDuration(minutes: number): string { if (!minutes || minutes <= 0) return "未记录"; const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours > 0 ? `${hours} 小时${rest > 0 ? ` ${rest} 分钟` : ""}` : `${minutes} 分钟`; }
function emptySummary(): TaskSummaryDto { return { completedTodayCount: 0, failedCount: 0, lastUpdatedUtc: new Date().toISOString(), queuedCount: 0, runningCount: 0 }; }
function emptyWorker(): WorkerStatusDto { return { baseUrl: "", eventStreamPath: "/api/events", healthy: false, startedAtUtc: "", status: "starting" }; }
function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function parseWorkerEventEnvelope<TData>(raw: string): WorkerEventEnvelopeDto<TData> | null { try { return JSON.parse(raw) as WorkerEventEnvelopeDto<TData>; } catch { return null; } }
