import { ApiClient, WorkerApiError } from "../../api/client/apiClient.js";
import { useLibraryNavItems } from "../../app/navigation/useLibraryNavItems.js";
import {
  createDefaultActorsRouteQuery,
  createDefaultLibraryVideoRouteQuery,
  ensureRoute,
  toHash,
  type AppRoute,
  type ActorsRouteQuery,
  type LibraryVideoRouteQuery,
  type SettingsRouteGroup,
} from "../../app/routes/router.js";
import type {
  ActorDetailDto,
  GetSettingsResponse,
  GetActorsResponse,
  GetBootstrapResponse,
  GetActorVideosRequest,
  GetActorVideosResponse,
  GetLibraryVideosResponse,
  RunMetaTubeDiagnosticsRequest,
  RunMetaTubeDiagnosticsResponse,
  SettingsChangedEventDto,
  UpdateSettingsRequest,
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
interface ActorsActionState { kind: "refresh"; }
interface SettingsActionState { kind: "reset" | "save"; }
interface VideoActionState { kind: "play"; videoId: string; }

interface RendererState {
  appVersion: string;
  actorDetail: ActorDetailDto | null;
  actorVideos: GetActorVideosResponse | null;
  actors: GetActorsResponse | null;
  actorsAction: ActorsActionState | null;
  actorsQueryDraft: ActorsRouteQuery;
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
  settingsDiagnostics: RunMetaTubeDiagnosticsResponse | null;
  settingsDiagnosticsRunning: boolean;
  settings: GetSettingsResponse | null;
  settingsAction: SettingsActionState | null;
  settingsDraft: UpdateSettingsRequest | null;
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
    actorDetail: null,
    actorVideos: null,
    actors: null,
    actorsAction: null,
    actorsQueryDraft: createDefaultActorsRouteQuery(),
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
    settingsDiagnostics: null,
    settingsDiagnosticsRunning: false,
    settings: null,
    settingsAction: null,
    settingsDraft: null,
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
        actorDetail: isActorsFamilyRoute(route) ? this.state.actorDetail : null,
        actorVideos: isActorsFamilyRoute(route) ? this.state.actorVideos : null,
        actors: isActorsFamilyRoute(route) ? this.state.actors : null,
        actorsAction: null,
        actorsQueryDraft: syncActorsQueryDraft(this.state.actorsQueryDraft, route),
        bootstrap: { ...bootstrap, taskSummary: tasks.summary },
        libraryVideoDrafts: syncLibraryVideoDrafts(this.state.libraryVideoDrafts, route),
        loading: false,
        route,
        routeDataLoading: route.kind !== "home",
        scanPathDrafts: syncScanPathDrafts(this.state.scanPathDrafts, bootstrap.libraries),
        settingsAction: route.kind === "settings" ? this.state.settingsAction : null,
        settingsDraft: route.kind === "settings" ? this.state.settingsDraft : null,
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
    const previousRoute = this.state.route;
    const libraries = this.state.bootstrap?.libraries ?? [];
    const route = ensureRoute(window.location.hash, libraries);
    this.state = {
      ...this.state,
      actorDetail: isActorsFamilyRoute(route) && isActorsFamilyRoute(previousRoute) ? this.state.actorDetail : null,
      actorVideos: isActorsFamilyRoute(route) && isActorsFamilyRoute(previousRoute) ? this.state.actorVideos : null,
      actors: isActorsFamilyRoute(route) && isActorsFamilyRoute(previousRoute) ? this.state.actors : null,
      actorsAction: route.kind === "actors" ? this.state.actorsAction : null,
      actorsQueryDraft: syncActorsQueryDraft(this.state.actorsQueryDraft, route),
      libraryVideoDrafts: syncLibraryVideoDrafts(this.state.libraryVideoDrafts, route),
      route,
      routeDataLoading: route.kind !== "home",
      settingsAction: route.kind === "settings" ? this.state.settingsAction : null,
      settingsDraft: route.kind === "settings" && previousRoute.kind === "settings" ? this.state.settingsDraft : null,
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

    if (target instanceof HTMLElement && target.dataset.settingsField && target.dataset.settingsGroup) {
      const draft = cloneSettingsDraft(this.getSettingsDraft());
      const defaults = createDefaultSettingsResponse();
      const general = draft.general ?? defaults.general;
      const metaTube = draft.metaTube ?? defaults.metaTube;
      const playback = draft.playback ?? defaults.playback;
      const group = target.dataset.settingsGroup;
      const field = target.dataset.settingsField;
      if (group === "general" && target instanceof HTMLSelectElement && field === "currentLanguage") {
        draft.general = { ...general, currentLanguage: target.value };
      }
      if (group === "general" && target instanceof HTMLInputElement && field === "debug") {
        draft.general = { ...general, debug: target.checked };
      }
      if (group === "metaTube" && target instanceof HTMLInputElement && field === "serverUrl") {
        draft.metaTube = { ...metaTube, serverUrl: target.value };
      }
      if (group === "metaTube" && target instanceof HTMLInputElement && field === "requestTimeoutSeconds") {
        draft.metaTube = { ...metaTube, requestTimeoutSeconds: Number.parseInt(target.value || "0", 10) || 0 };
      }
      if (group === "playback" && target instanceof HTMLInputElement && field === "playerPath") {
        draft.playback = { ...playback, playerPath: target.value };
      }
      if (group === "playback" && target instanceof HTMLInputElement && field === "useSystemDefaultFallback") {
        draft.playback = { ...playback, useSystemDefaultFallback: target.checked };
      }

      this.state = {
        ...this.state,
        settingsDiagnostics: group === "metaTube" ? null : this.state.settingsDiagnostics,
        settingsDraft: draft,
      };
      return;
    }

    if (target instanceof HTMLInputElement && target.dataset.actorsQueryField === "keyword") {
      this.state = {
        ...this.state,
        actorsQueryDraft: {
          ...this.state.actorsQueryDraft,
          keyword: target.value,
          pageIndex: 0,
        },
      };
      return;
    }

    if (target instanceof HTMLSelectElement && target.dataset.actorsQueryField) {
      const current = cloneActorsQuery(this.state.actorsQueryDraft);
      if (target.dataset.actorsQueryField === "sortBy") {
        current.sortBy = target.value;
      }
      if (target.dataset.actorsQueryField === "sortOrder") {
        current.sortOrder = target.value === "desc" ? "desc" : "asc";
      }
      if (target.dataset.actorsQueryField === "pageSize") {
        current.pageSize = Number.parseInt(target.value || "0", 10) || createDefaultActorsRouteQuery().pageSize;
      }
      current.pageIndex = 0;
      this.state = {
        ...this.state,
        actorsQueryDraft: current,
      };
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
      case "navigate-actors":
        window.location.hash = toHash({ kind: "actors", query: this.state.actorsQueryDraft });
        return;
      case "navigate-library":
        if (libraryId) window.location.hash = toHash({ kind: "library", libraryId, query: this.getLibraryVideoDraft(libraryId) });
        return;
      case "navigate-settings":
        window.location.hash = toHash({ kind: "settings", group: toSettingsGroup(actionElement.dataset.group) });
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
      case "apply-actors-query":
        window.location.hash = toHash({ kind: "actors", query: this.state.actorsQueryDraft });
        return;
      case "reset-actors-query": {
        const query = createDefaultActorsRouteQuery();
        this.state = { ...this.state, actorsQueryDraft: query };
        window.location.hash = toHash({ kind: "actors", query });
        return;
      }
      case "refresh-actors":
        await this.refreshActors();
        return;
      case "actors-previous-page":
        this.navigateActorsPage(-1);
        return;
      case "actors-next-page":
        this.navigateActorsPage(1);
        return;
      case "navigate-back-to":
        if (actionElement.dataset.hash) {
          window.location.hash = actionElement.dataset.hash;
        }
        return;
      case "save-settings":
        await this.saveSettings();
        return;
      case "reset-settings":
        await this.resetSettings();
        return;
      case "run-meta-tube-diagnostics":
        await this.runMetaTubeDiagnostics();
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

  private async refreshActors(): Promise<void> {
    this.state = { ...this.state, actorsAction: { kind: "refresh" }, inlineError: null, infoMessage: null };
    this.render();
    await this.loadRouteData(true, "已刷新演员结果集。");
    this.state = { ...this.state, actorsAction: null };
    this.render();
  }

  private navigateActorsPage(direction: number): void {
    if (this.state.route.kind !== "actors" || direction === 0) return;
    const currentQuery = cloneActorsQuery(this.state.actorsQueryDraft);
    const totalCount = this.state.actors?.totalCount ?? 0;
    const pageSize = Math.max(1, this.state.actors?.pageSize ?? currentQuery.pageSize);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const nextPageIndex = clampPageIndex(currentQuery.pageIndex + direction, totalPages);
    if (nextPageIndex === currentQuery.pageIndex) return;
    const query = { ...currentQuery, pageIndex: nextPageIndex };
    this.state = { ...this.state, actorsQueryDraft: query };
    window.location.hash = toHash({ kind: "actors", query });
  }

  private async saveSettings(): Promise<void> {
    if (!this.apiClient) return;
    const draft = this.getSettingsDraft();
    this.state = { ...this.state, inlineError: null, infoMessage: null, settingsAction: { kind: "save" } };
    this.render();

    try {
      const response = await this.apiClient.updateSettings(draft);
      this.state = {
        ...this.state,
        infoMessage: "设置已保存。",
        settings: response.settings,
        settingsAction: null,
        settingsDraft: createSettingsDraft(response.settings),
      };
      this.render();
    } catch (error) {
      this.state = { ...this.state, inlineError: this.toUserMessage(error), settingsAction: null };
      this.render();
    }
  }

  private async resetSettings(): Promise<void> {
    if (!this.apiClient) return;
    this.state = { ...this.state, inlineError: null, infoMessage: null, settingsAction: { kind: "reset" } };
    this.render();

    try {
      const response = await this.apiClient.updateSettings({ resetToDefaults: true });
      this.state = {
        ...this.state,
        infoMessage: "已恢复默认设置。",
        settings: response.settings,
        settingsAction: null,
        settingsDraft: createSettingsDraft(response.settings),
      };
      this.render();
    } catch (error) {
      this.state = { ...this.state, inlineError: this.toUserMessage(error), settingsAction: null };
      this.render();
    }
  }

  private async runMetaTubeDiagnostics(): Promise<void> {
    if (!this.apiClient) return;
    const draft = this.getSettingsDraft();
    const request: RunMetaTubeDiagnosticsRequest = {
      requestTimeoutSeconds: draft.metaTube?.requestTimeoutSeconds,
      serverUrl: draft.metaTube?.serverUrl,
    };

    this.state = {
      ...this.state,
      inlineError: null,
      infoMessage: null,
      settingsDiagnosticsRunning: true,
    };
    this.render();

    try {
      const response = await this.apiClient.runMetaTubeDiagnostics(request);
      this.state = {
        ...this.state,
        infoMessage: response.success
          ? "MetaTube 诊断已完成。"
          : "MetaTube 诊断已完成，但发现异常。",
        settingsDiagnostics: response,
        settingsDiagnosticsRunning: false,
      };
      this.render();
    } catch (error) {
      this.state = {
        ...this.state,
        inlineError: this.toUserMessage(error),
        settingsDiagnosticsRunning: false,
      };
      this.render();
    }
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

      if (route.kind === "actors") {
        await this.loadActorsListRouteData(route.query, version, infoMessage);
        return;
      }

      if (route.kind === "actor") {
        await this.loadActorDetailRouteData(route.actorId, route.query, version, infoMessage);
        return;
      }

      if (route.kind === "settings") {
        const settings = await this.apiClient.getSettings();
        if (version !== this.routeLoadVersion) return;
        this.state = {
          ...this.state,
          infoMessage: infoMessage ?? this.state.infoMessage,
          inlineError: null,
          routeDataLoading: false,
          settings,
          settingsDraft: this.state.settingsDraft ?? createSettingsDraft(settings),
          videoDetail: null,
        };
        this.render();
        return;
      }

      const detail = await this.apiClient.getVideoDetail(route.videoId);
      if (version !== this.routeLoadVersion) return;
      this.state = { ...this.state, inlineError: detail.video ? null : "影片详情不存在。", routeDataLoading: false, videoDetail: detail.video };
      this.render();
    } catch (error) {
      if (version !== this.routeLoadVersion) return;
      this.state = {
        ...this.state,
        actorDetail: route.kind === "actor" ? null : this.state.actorDetail,
        actorVideos: route.kind === "actor" ? null : this.state.actorVideos,
        inlineError: this.toUserMessage(error),
        routeDataLoading: false,
        videoDetail: route.kind === "video" ? null : this.state.videoDetail,
      };
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

  private async loadActorsListRouteData(query: ActorsRouteQuery, version = this.routeLoadVersion, infoMessage?: string): Promise<void> {
    if (!this.apiClient) return;
    const actors = await this.apiClient.getActors(query);
    if (version !== this.routeLoadVersion) return;

    this.state = {
      ...this.state,
      actorDetail: null,
      actorVideos: null,
      actorsAction: null,
      actors,
      inlineError: null,
      infoMessage: infoMessage ?? this.state.infoMessage,
      routeDataLoading: false,
      videoDetail: null,
    };
    this.render();
  }

  private async loadActorDetailRouteData(
    actorId: string,
    query: ActorsRouteQuery,
    version = this.routeLoadVersion,
    infoMessage?: string,
  ): Promise<void> {
    if (!this.apiClient) return;

    const [actors, detailResponse, actorVideos] = await Promise.all([
      this.apiClient.getActors(query),
      this.apiClient.getActorDetail(actorId),
      this.apiClient.getActorVideos(actorId, createDefaultActorVideosRequest()),
    ]);
    if (version !== this.routeLoadVersion) return;

    this.state = {
      ...this.state,
      actorDetail: detailResponse.actor,
      actorVideos,
      actorsAction: null,
      actors,
      inlineError: detailResponse.actor ? null : "演员详情不存在。",
      infoMessage: infoMessage ?? this.state.infoMessage,
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
    this.eventSource.addEventListener("settings.changed", (event) => this.handleSettingsChanged(event));
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

  private handleSettingsChanged(event: Event): void {
    const envelope = parseWorkerEventEnvelope<SettingsChangedEventDto>((event as MessageEvent<string>).data);
    if (!envelope) {
      this.setWorkerWarning("Worker 推送了无法识别的设置变更事件。");
      return;
    }

    const nextSettings = envelope.data.settings;
    const currentSettings = this.state.settings ?? createDefaultSettingsResponse();
    const currentDraft = this.getSettingsDraft();
    const keepDraft = this.state.route.kind === "settings" && isSettingsDirty(currentDraft, currentSettings);
    this.state = {
      ...this.state,
      infoMessage: this.state.route.kind === "settings"
        ? keepDraft
          ? "检测到外部设置更新，当前表单保留未保存修改。"
          : "设置已同步到最新持久化值。"
        : this.state.infoMessage,
      settings: nextSettings,
      settingsDraft: keepDraft ? this.state.settingsDraft : createSettingsDraft(nextSettings),
    };
    this.render();
  }

  private getScanPathDraft(library: LibraryListItemDto): string {
    return this.state.scanPathDrafts[library.libraryId] ?? library.scanPaths.join("\n");
  }

  private getLibraryVideoDraft(libraryId: string): LibraryVideoRouteQuery {
    const routeQuery = this.state.route.kind === "library" && this.state.route.libraryId === libraryId ? this.state.route.query : null;
    return cloneQuery(this.state.libraryVideoDrafts[libraryId] ?? routeQuery ?? createDefaultLibraryVideoRouteQuery());
  }

  private getSettingsDraft(): UpdateSettingsRequest {
    return cloneSettingsDraft(this.state.settingsDraft ?? createSettingsDraft(this.state.settings ?? createDefaultSettingsResponse()));
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
      : this.state.route.kind === "actors"
        ? "演员"
      : this.state.route.kind === "actor"
        ? (this.state.actorDetail?.name ?? "演员详情")
      : this.state.route.kind === "library"
        ? (this.findLibrary(this.state.route.libraryId)?.name ?? "媒体库")
        : this.state.route.kind === "settings"
          ? "设置"
        : (this.state.videoDetail?.displayTitle ?? "影片详情");
    const routeBody = this.state.loading ? renderLoading() : this.renderRouteBody(libraries, worker);
    const eyebrow = this.state.route.kind === "home"
      ? "Home"
      : this.state.route.kind === "actors"
        ? "Actors"
      : this.state.route.kind === "actor"
        ? "Actor Detail"
        : this.state.route.kind === "library"
          ? "Library"
          : this.state.route.kind === "settings"
            ? "Settings"
            : "Video";

    this.rootElement.innerHTML = `
      <main class="app-shell">
        <aside class="shell-sidebar">
          <div class="sidebar-header"><span class="brand-mark">JV</span><div><div class="brand-title">Jvedio Desktop</div><div class="brand-subtitle">Batch 5 / Actors</div></div></div>
          <button class="primary-button wide-button" data-action="open-create-dialog">新建媒体库</button>
          <nav class="primary-nav"><a class="nav-link ${this.state.route.kind === "home" ? "active" : ""}" href="#/home"><span>Home</span><small>${libraries.length} libs</small></a><a class="nav-link ${isActorsFamilyRoute(this.state.route) ? "active" : ""}" href="${toHash({ kind: "actors", query: this.state.actorsQueryDraft })}"><span>Actors</span><small>${this.state.actors?.totalCount ?? 0} cast</small></a><a class="nav-link ${this.state.route.kind === "settings" ? "active" : ""}" href="${toHash({ kind: "settings", group: "general" })}"><span>Settings</span><small>3 groups</small></a></nav>
          <section class="nav-section"><div class="nav-section-label">Libraries</div>${renderNav(libraries, this.state.route)}</section>
          <section class="sidebar-footer"><div class="footer-card"><div class="footer-label">Worker</div><div class="footer-value ${worker.healthy ? "status-ok" : "status-error"}">${escapeHtml(worker.status)}</div><div class="footer-hint">${escapeHtml(bootstrap?.app.version ?? this.state.appVersion)}</div></div></section>
        </aside>
        <section class="shell-content">
          <header class="content-header"><div><span class="eyebrow">${eyebrow}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(routeDescription(this.state.route.kind))}</p></div><div class="header-actions"><button class="ghost-button" data-action="refresh-home">刷新</button>${this.state.route.kind === "actor" ? `<button class="ghost-button" data-action="navigate-back-to" data-hash="${escapeHtml(toHash({ kind: "actors", query: this.state.actorsQueryDraft }))}">返回演员列表</button>` : ""}${this.state.route.kind === "library" || this.state.route.kind === "settings" || this.state.route.kind === "actors" || this.state.route.kind === "actor" ? `<button class="ghost-button" data-action="navigate-home">返回 Home</button>` : ""}${this.state.route.kind === "video" && this.state.route.backTo ? `<button class="ghost-button" data-action="navigate-back-to" data-hash="${escapeHtml(this.state.route.backTo)}">返回演员</button>` : ""}${this.state.route.kind === "video" && this.state.videoDetail ? `<button class="ghost-button" data-action="navigate-library" data-library-id="${escapeHtml(this.state.videoDetail.libraryId)}">返回媒体库</button>` : ""}</div></header>
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
    if (this.state.route.kind === "actors") {
      return renderActorsRoute({
        actors: this.state.actors,
        actorsAction: this.state.actorsAction,
        currentQuery: this.state.actorsQueryDraft,
        routeDataLoading: this.state.routeDataLoading,
        worker,
      });
    }
    if (this.state.route.kind === "actor") {
      return renderActorDetailRoute({
        actorCount: this.state.actors?.totalCount ?? 0,
        actorDetail: this.state.actorDetail,
        actorVideos: this.state.actorVideos,
        backToHash: toHash({ kind: "actors", query: this.state.actorsQueryDraft }),
        currentQuery: this.state.actorsQueryDraft,
        routeDataLoading: this.state.routeDataLoading,
        worker,
      });
    }
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
    if (this.state.route.kind === "settings") {
      return renderSettingsRoute({
        currentGroup: this.state.route.group,
        diagnostics: this.state.settingsDiagnostics,
        diagnosticsRunning: this.state.settingsDiagnosticsRunning,
        routeDataLoading: this.state.routeDataLoading,
        settings: this.state.settings,
        draft: this.getSettingsDraft(),
        settingsAction: this.state.settingsAction,
      });
    }
    return renderVideoRoute({
      backToHash: this.state.route.kind === "video" ? this.state.route.backTo : null,
      routeDataLoading: this.state.routeDataLoading,
      video: this.state.videoDetail,
      videoAction: this.state.videoAction,
      worker,
    });
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

function renderActorsRoute(args: {
  actors: GetActorsResponse | null;
  actorsAction: ActorsActionState | null;
  currentQuery: ActorsRouteQuery;
  routeDataLoading: boolean;
  worker: WorkerStatusDto;
}): string {
  const { actors, actorsAction, currentQuery, routeDataLoading, worker } = args;
  const actorCount = actors?.totalCount ?? 0;
  const refreshing = actorsAction?.kind === "refresh";
  const pagination = renderActorsPagination(actors, routeDataLoading);
  const filterSummary = currentQuery.keyword.trim().length > 0 ? currentQuery.keyword.trim() : "未设置";

  return `<section class="metric-grid">${metric("演员数", String(actorCount), "来自 /api/actors 聚合结果")}${metric("当前关键字", filterSummary, "列表和详情页共用同一组筛选状态")}${metric("排序", `${currentQuery.sortBy} / ${currentQuery.sortOrder}`, "分页与排序参数写入路由")}${metric("Worker", worker.healthy ? "Ready" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}</section><section class="surface-card"><div class="section-header"><div><span class="eyebrow">Actors</span><h2>演员结果集</h2></div><div class="section-meta">${actors ? `${actors.totalCount} actors` : "等待加载"}</div></div><div class="filter-toolbar"><input class="text-field" type="text" data-actors-query-field="keyword" value="${escapeHtml(currentQuery.keyword)}" placeholder="按演员名、来源站点或来源地址筛选" /><select class="select-field" data-actors-query-field="sortBy">${option("name", currentQuery.sortBy, "姓名")}${option("actorId", currentQuery.sortBy, "演员 ID")}${option("videoCount", currentQuery.sortBy, "作品数")}${option("libraryCount", currentQuery.sortBy, "媒体库数")}${option("webType", currentQuery.sortBy, "来源站点")}${option("lastPlayedAt", currentQuery.sortBy, "最近播放")}${option("lastScanAt", currentQuery.sortBy, "最近扫描")}</select><select class="select-field" data-actors-query-field="sortOrder">${option("asc", currentQuery.sortOrder, "升序")}${option("desc", currentQuery.sortOrder, "降序")}</select><select class="select-field" data-actors-query-field="pageSize">${option("1", String(currentQuery.pageSize), "1 / 页")}${option("12", String(currentQuery.pageSize), "12 / 页")}${option("24", String(currentQuery.pageSize), "24 / 页")}${option("60", String(currentQuery.pageSize), "60 / 页")}${option("120", String(currentQuery.pageSize), "120 / 页")}</select><button class="primary-button" data-action="apply-actors-query">应用筛选</button><button class="ghost-button" data-action="reset-actors-query">重置</button><button class="ghost-button" data-action="refresh-actors" ${refreshing ? "disabled" : ""}>${refreshing ? "刷新中..." : "刷新结果"}</button></div>${routeDataLoading && !actors ? renderRouteLoading("正在拉取演员结果集...") : `${pagination}${renderActorResults(actors, currentQuery)}${pagination}`}</section>`;
}

function renderLibraryRoute(args: { draft: LibraryVideoRouteQuery; library: LibraryListItemDto; pendingAction: LibraryActionKind | null; response: GetLibraryVideosResponse | undefined; routeDataLoading: boolean; runningTask: WorkerTaskDto | null; scanPathDraft: string; summary: TaskSummaryDto; tasks: readonly WorkerTaskDto[]; worker: WorkerStatusDto; }): string {
  const { draft, library, pendingAction, response, routeDataLoading, runningTask, scanPathDraft, summary, tasks, worker } = args;
  const hasRunningTask = tasks.some((task) => isActiveTask(task));
  return `<section class="metric-grid">${metric("影片数", String(response?.totalCount ?? library.videoCount), "来自库结果集总数")}${metric("库内任务", String(tasks.length), "当前库最近任务")}${metric("最近扫描", library.lastScanAt ? formatDate(library.lastScanAt) : "未记录", "完成扫描后由 Worker 回写")}${metric("最近抓取", library.lastScrapeAt ? formatDate(library.lastScrapeAt) : "未记录", "完成抓取后回写")}</section><section class="split-layout"><div class="surface-card"><div class="section-header"><div><span class="eyebrow">Library Workbench</span><h2>${escapeHtml(library.name)}</h2></div><button class="danger-button" data-action="open-delete-dialog" data-library-id="${escapeHtml(library.libraryId)}">删除媒体库</button></div><div class="library-detail-grid"><div class="detail-card"><span>Library ID</span><strong>${escapeHtml(library.libraryId)}</strong></div><div class="detail-card"><span>主路径</span><strong>${escapeHtml(library.path || "未配置")}</strong></div><div class="detail-card"><span>运行中任务</span><strong>${hasRunningTask ? "Yes" : "No"}</strong></div><div class="detail-card"><span>Worker</span><strong>${worker.healthy ? "Ready" : "Unavailable"}</strong></div></div><div class="scan-path-editor"><label class="field-label">默认扫描目录</label><textarea class="scan-path-textarea" name="library-scan-paths" data-library-id="${escapeHtml(library.libraryId)}">${escapeHtml(scanPathDraft)}</textarea><div class="inline-note">保存后会写回库默认扫描目录。执行扫描时优先使用这里的路径。</div></div><div class="action-row"><button class="primary-button" data-action="save-library-scan-paths" data-library-id="${escapeHtml(library.libraryId)}" ${pendingAction === "save" ? "disabled" : ""}>${pendingAction === "save" ? "保存中..." : "保存扫描目录"}</button><button class="ghost-button" data-action="start-library-scan" data-library-id="${escapeHtml(library.libraryId)}" ${(pendingAction === "scan" || hasRunningTask) ? "disabled" : ""}>${pendingAction === "scan" ? "扫描启动中..." : "触发扫描"}</button><button class="ghost-button" data-action="start-library-scrape" data-library-id="${escapeHtml(library.libraryId)}" ${(pendingAction === "scrape" || hasRunningTask) ? "disabled" : ""}>${pendingAction === "scrape" ? "抓取启动中..." : "触发抓取"}</button><button class="ghost-button" data-action="refresh-library-tasks">刷新任务</button></div>${runningTask ? `<div class="page-banner info-banner">当前任务：${escapeHtml(taskHeadline(runningTask))}</div>` : ""}</div><div class="surface-card side-stack"><div class="section-header"><div><span class="eyebrow">Task Feed</span><h2>当前库任务</h2></div></div>${tasks.length > 0 ? `<div class="task-feed">${tasks.slice(0, 8).map(renderTaskCard).join("")}</div>` : `<div class="empty-card compact-empty"><h3>当前还没有任务</h3><p>先保存扫描目录，再触发扫描或抓取。</p></div>`}<div class="worker-note"><div class="note-label">摘要刷新</div><div class="note-value">${formatDate(summary.lastUpdatedUtc)}</div></div></div></section><section class="surface-card video-results-surface"><div class="section-header"><div><span class="eyebrow">Videos</span><h2>影片结果集</h2></div><div class="section-meta">${response ? `${response.totalCount} items` : `${library.videoCount} indexed`}</div></div><div class="filter-toolbar"><input class="text-field" type="text" data-query-field="keyword" data-library-id="${escapeHtml(library.libraryId)}" value="${escapeHtml(draft.keyword)}" placeholder="按标题、VID 或路径筛选" /><select class="select-field" data-query-field="sortBy" data-library-id="${escapeHtml(library.libraryId)}">${option("lastScanDate", draft.sortBy, "最近扫描")}${option("title", draft.sortBy, "标题")}${option("vid", draft.sortBy, "VID")}${option("releaseDate", draft.sortBy, "发行日期")}${option("lastPlayedAt", draft.sortBy, "最近播放")}${option("viewCount", draft.sortBy, "播放次数")}</select><select class="select-field" data-query-field="sortOrder" data-library-id="${escapeHtml(library.libraryId)}">${option("desc", draft.sortOrder, "降序")}${option("asc", draft.sortOrder, "升序")}</select><label class="toggle-chip"><input type="checkbox" data-query-field="missingSidecarOnly" data-library-id="${escapeHtml(library.libraryId)}" ${draft.missingSidecarOnly ? "checked" : ""}/><span>仅看缺 sidecar</span></label><button class="primary-button" data-action="apply-library-video-query" data-library-id="${escapeHtml(library.libraryId)}">应用筛选</button><button class="ghost-button" data-action="reset-library-video-query" data-library-id="${escapeHtml(library.libraryId)}">重置</button><button class="ghost-button" data-action="refresh-library-videos" data-library-id="${escapeHtml(library.libraryId)}" ${pendingAction === "refresh-videos" ? "disabled" : ""}>${pendingAction === "refresh-videos" ? "刷新中..." : "刷新结果"}</button></div>${routeDataLoading && !response ? renderRouteLoading("正在拉取当前媒体库影片结果集...") : renderVideoResults(response, draft)}</section>`;
}

function renderVideoRoute(args: { backToHash: string | null; routeDataLoading: boolean; video: VideoDetailDto | null; videoAction: VideoActionState | null; worker: WorkerStatusDto; }): string {
  const { backToHash, routeDataLoading, video, videoAction, worker } = args;
  if (routeDataLoading && !video) return renderRouteLoading("正在加载影片详情...");
  if (!video) return `<div class="empty-card"><h3>影片详情不可用</h3><p>当前路由未命中有效影片，请返回媒体库重新选择。</p></div>`;
  const playing = videoAction?.kind === "play" && videoAction.videoId === video.videoId;
  return `<section class="metric-grid">${metric("VID", video.vid || "未识别", "来自 metadata_video.VID")}${metric("播放次数", String(video.viewCount), "播放写回只更新最近播放时间")}${metric("最近播放", video.lastPlayedAt ? formatDate(video.lastPlayedAt) : "未播放", "POST /api/videos/{videoId}/play 后写回")}${metric("Worker", worker.healthy ? "Ready" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}</section><section class="split-layout"><div class="surface-card"><div class="section-header"><div><span class="eyebrow">Video Detail</span><h2>${escapeHtml(video.displayTitle)}</h2></div><span class="code-pill">${escapeHtml(video.vid || video.videoId)}</span></div><p class="route-copy">${escapeHtml(video.plot || video.outline || "当前影片暂无简介。")}</p><div class="video-detail-list">${detail("媒体库", video.libraryName || video.libraryId)}${detail("文件路径", video.path)}${detail("发行日期", video.releaseDate ? formatDate(video.releaseDate) : "未记录")}${detail("系列", video.series || "未记录")}${detail("导演", video.director || "未记录")}${detail("片商", video.studio || "未记录")}${detail("时长", formatDuration(video.durationSeconds))}</div>${video.webUrl ? `<div class="inline-note">来源页面：<a class="ghost-link" href="${escapeHtml(video.webUrl)}">${escapeHtml(video.webUrl)}</a></div>` : ""}</div><div class="surface-card side-stack"><div class="section-header"><div><span class="eyebrow">Playback</span><h2>操作面板</h2></div></div><div class="action-column"><button class="primary-button" data-action="play-video" data-video-id="${escapeHtml(video.videoId)}" ${(!video.playback.canPlay || playing) ? "disabled" : ""}>${playing ? "调用中..." : "播放"}</button>${backToHash ? `<button class="ghost-button" data-action="navigate-back-to" data-hash="${escapeHtml(backToHash)}">返回演员</button>` : ""}<button class="ghost-button" data-action="navigate-library" data-library-id="${escapeHtml(video.libraryId)}">返回媒体库</button></div><div class="worker-note"><div class="note-label">播放方式</div><div class="note-value">${video.playback.usesSystemDefault ? "系统默认播放器" : "自定义播放器"}</div><div class="footer-hint">${escapeHtml(video.playback.playerPath ?? "未配置自定义播放器")}</div></div><div class="worker-note"><div class="note-label">资源状态</div><div class="badge-row">${asset("NFO", video.sidecars.nfo.exists)}${asset("Poster", video.sidecars.poster.exists)}${asset("Thumb", video.sidecars.thumb.exists)}${asset("Fanart", video.sidecars.fanart.exists)}</div></div><div class="worker-note"><div class="note-label">演员</div>${video.actors.length > 0 ? `<div class="actor-pill-list">${video.actors.map((actor) => `<span class="actor-pill">${escapeHtml(actor.name)}</span>`).join("")}</div>` : `<div class="footer-hint">当前影片暂无演员信息。</div>`}</div></div></section>`;
}

function renderSettingsRoute(args: {
  currentGroup: SettingsRouteGroup;
  diagnostics: RunMetaTubeDiagnosticsResponse | null;
  diagnosticsRunning: boolean;
  draft: UpdateSettingsRequest;
  routeDataLoading: boolean;
  settings: GetSettingsResponse | null;
  settingsAction: SettingsActionState | null;
}): string {
  const { currentGroup, diagnostics, diagnosticsRunning, draft, routeDataLoading, settings, settingsAction } = args;
  if (routeDataLoading && !settings) return renderRouteLoading("正在加载设置...");
  const snapshot = settings ?? createDefaultSettingsResponse();
  const dirty = isSettingsDirty(draft, snapshot);
  const saving = settingsAction?.kind === "save";
  const resetting = settingsAction?.kind === "reset";

  return `<section class="metric-grid">${metric("语言", snapshot.general.currentLanguage, "当前真实落库的通用设置")}${metric("MetaTube", snapshot.metaTube.serverUrl || "未配置", "抓取链直接读取此地址")}${metric("播放路径", snapshot.playback.playerPath || "系统默认", "播放链优先读取这里")}${metric("默认回退", snapshot.playback.useSystemDefaultFallback ? "开启" : "关闭", "控制是否回退系统播放器")}</section><section class="settings-layout"><aside class="surface-card settings-group-nav"><div class="section-header"><div><span class="eyebrow">Groups</span><h2>设置分组</h2></div></div>${renderSettingsGroupLink("general", currentGroup, "General", "语言与调试")}${renderSettingsGroupLink("metaTube", currentGroup, "MetaTube", "抓取服务地址与超时")}${renderSettingsGroupLink("playback", currentGroup, "Playback", "播放器路径与回退策略")}</aside><section class="surface-card settings-form-surface"><div class="section-header"><div><span class="eyebrow">Settings</span><h2>${escapeHtml(settingsGroupTitle(currentGroup))}</h2></div><div class="section-meta">${escapeHtml(settingsGroupDescription(currentGroup))}</div></div>${renderSettingsGroupForm(currentGroup, draft)}${currentGroup === "metaTube" ? renderMetaTubeDiagnosticsPanel(draft.metaTube ?? snapshot.metaTube, diagnostics, diagnosticsRunning) : ""}<div class="settings-save-bar"><div><div class="note-label">表单状态</div><div class="note-value">${dirty ? "有未保存修改" : "已与当前持久化值一致"}</div></div><div class="header-actions"><button class="ghost-button" data-action="reset-settings" ${saving || resetting || diagnosticsRunning ? "disabled" : ""}>${resetting ? "恢复中..." : "恢复默认"}</button><button class="primary-button" data-action="save-settings" ${(!dirty || saving || resetting || diagnosticsRunning) ? "disabled" : ""}>${saving ? "保存中..." : "保存设置"}</button></div></div></section></section>`;
}

function renderVideoResults(response: GetLibraryVideosResponse | undefined, draft: LibraryVideoRouteQuery): string {
  if (!response) return `<div class="empty-card"><h3>结果集尚未加载</h3><p>点击“应用筛选”或“刷新结果”后即可查看当前媒体库影片。</p></div>`;
  if (response.items.length === 0) return `<div class="empty-card"><h3>暂无结果</h3><p>${escapeHtml(draft.keyword || draft.missingSidecarOnly ? "当前筛选条件下没有命中影片。" : "当前媒体库还没有影片，请先执行扫描。")}</p></div>`;
  return `<div class="video-result-grid">${response.items.map((video) => `<article class="video-result-card"><div class="video-result-head"><a href="${toHash({ kind: "video", backTo: null, videoId: video.videoId })}" class="video-result-title">${escapeHtml(video.displayTitle)}</a><span class="code-pill">${escapeHtml(video.vid || "NO-VID")}</span></div><div class="video-result-meta"><span>扫描：${escapeHtml(video.lastScanAt ? formatDate(video.lastScanAt) : "未记录")}</span><span>播放：${escapeHtml(video.lastPlayedAt ? formatDate(video.lastPlayedAt) : "未播放")}</span><span>次数：${video.viewCount}</span></div><div class="badge-row">${asset("NFO", video.hasNfo)}${asset("Poster", video.hasPoster)}${asset("Thumb", video.hasThumb)}${asset("Fanart", video.hasFanart)}</div><div class="inline-note">${escapeHtml(video.path)}</div><div class="library-card-actions"><a href="${toHash({ kind: "video", backTo: null, videoId: video.videoId })}" class="ghost-link">查看详情</a></div></article>`).join("")}</div>`;
}

function renderActorResults(
  response: GetActorsResponse | null,
  query: ActorsRouteQuery,
): string {
  if (!response) {
    return `<div class="empty-card"><h3>结果集尚未加载</h3><p>点击“应用筛选”或“刷新结果”后即可查看当前演员聚合结果。</p></div>`;
  }

  if (response.items.length === 0) {
    return `<div class="empty-card"><h3>暂无演员</h3><p>${escapeHtml(query.keyword ? "当前筛选条件下没有命中演员。" : "当前还没有演员数据，请先完成扫描或抓取。")}</p></div>`;
  }

  return `<div class="actor-result-grid">${response.items.map((actor) => {
    const detailHash = toHash({ kind: "actor", actorId: actor.actorId, query });
    return `<article class="actor-result-card" data-actor-card-id="${escapeHtml(actor.actorId)}"><div class="actor-result-head">${renderActorAvatar(actor.avatarPath, actor.name)}<div><div class="actor-result-title">${escapeHtml(actor.name)}</div><div class="library-stat">${actor.videoCount} videos · ${actor.libraryCount} libraries</div></div></div><div class="actor-result-meta"><span>演员 ID：${escapeHtml(actor.actorId)}</span><span>最近扫描：${escapeHtml(actor.lastScanAt ? formatDate(actor.lastScanAt) : "未记录")}</span><span>最近播放：${escapeHtml(actor.lastPlayedAt ? formatDate(actor.lastPlayedAt) : "未记录")}</span></div><div class="badge-row">${actor.webType ? `<span class="asset-badge ok">${escapeHtml(actor.webType)}</span>` : ""}${actor.webUrl ? `<span class="asset-badge ok">Link</span>` : ""}${actor.avatarPath ? `<span class="asset-badge ok">Avatar</span>` : `<span class="asset-badge missing">Placeholder</span>`}</div><div class="library-card-actions"><a class="ghost-link" href="${detailHash}">查看详情</a></div></article>`;
  }).join("")}</div>`;
}

function renderActorsPagination(response: GetActorsResponse | null, loading: boolean): string {
  if (!response) {
    return "";
  }

  const totalPages = Math.max(1, Math.ceil(response.totalCount / Math.max(1, response.pageSize)));
  const currentPage = Math.min(response.pageIndex + 1, totalPages);
  const from = response.totalCount === 0 ? 0 : response.pageIndex * response.pageSize + 1;
  const to = response.totalCount === 0 ? 0 : Math.min(response.totalCount, from + response.items.length - 1);
  const previousDisabled = loading || response.pageIndex <= 0;
  const nextDisabled = loading || currentPage >= totalPages;

  return `<div class="result-pagination" data-actors-pagination><div class="pagination-summary" data-actors-page-summary>第 ${currentPage} / ${totalPages} 页 · 第 ${from}-${to} 项，共 ${response.totalCount} 名演员</div><div class="pagination-actions"><button class="ghost-button" data-action="actors-previous-page" ${previousDisabled ? "disabled" : ""}>上一页</button><button class="ghost-button" data-action="actors-next-page" ${nextDisabled ? "disabled" : ""}>下一页</button></div></div>`;
}

function renderActorDetailRoute(args: {
  actorCount: number;
  actorDetail: ActorDetailDto | null;
  actorVideos: GetActorVideosResponse | null;
  backToHash: string;
  currentQuery: ActorsRouteQuery;
  routeDataLoading: boolean;
  worker: WorkerStatusDto;
}): string {
  const { actorCount, actorDetail, actorVideos, backToHash, currentQuery, routeDataLoading, worker } = args;
  if (routeDataLoading && !actorDetail) {
    return renderRouteLoading("正在拉取演员详情和关联影片...");
  }

  if (!actorDetail) {
    return `<div class="empty-card"><h3>演员详情不可用</h3><p>当前未命中有效演员，请返回列表重新选择。</p></div>`;
  }

  const videoItems = actorVideos?.items ?? [];
  const currentQuerySummary = `${currentQuery.sortBy} / ${currentQuery.sortOrder} / ${currentQuery.pageSize} 每页`;
  const backRouteHash = toHash({ kind: "actor", actorId: actorDetail.actorId, query: currentQuery });
  return `<section class="metric-grid">${metric("演员总数", String(actorCount), "来自当前演员聚合结果集")}${metric("作品数", String(actorDetail.videoCount), "来自 /api/actors/{actorId}")}${metric("媒体库数", String(actorDetail.libraryCount), "演员跨库聚合数量")}${metric("Worker", worker.healthy ? "Ready" : "Unavailable", worker.baseUrl || "等待 Worker 地址")}</section><section class="split-layout"><div class="surface-card"><div class="section-header"><div><span class="eyebrow">Actor Detail</span><h2 data-actor-detail-name>${escapeHtml(actorDetail.name)}</h2></div><div class="header-actions"><button class="ghost-button" data-action="navigate-back-to" data-hash="${escapeHtml(backToHash)}">返回演员列表</button></div></div><div class="actor-detail-head">${renderActorAvatar(actorDetail.avatarPath, actorDetail.name, true)}<div class="actor-detail-copy"><div class="code-pill">${escapeHtml(actorDetail.actorId)}</div><p class="route-copy">当前头部信息和关联影片都来自 Worker actors 查询接口。</p><div class="badge-row">${actorDetail.avatarPath ? `<span class="asset-badge ok">已解析真实头像</span>` : `<span class="asset-badge missing">使用占位头像</span>`}</div></div></div><div class="library-detail-grid actor-detail-grid">${detail("作品数", String(actorDetail.videoCount))}${detail("媒体库数", String(actorDetail.libraryCount))}${detail("最近扫描", actorDetail.lastScanAt ? formatDate(actorDetail.lastScanAt) : "未记录")}${detail("最近播放", actorDetail.lastPlayedAt ? formatDate(actorDetail.lastPlayedAt) : "未记录")}</div><div class="worker-note"><div class="note-label">返回链路</div><div class="note-value" data-actor-back-summary>Actors 列表 → Actor Detail → Video Detail</div><div class="footer-hint">当前列表状态：${escapeHtml(currentQuerySummary)}</div></div><div class="worker-note"><div class="note-label">所属媒体库</div><div class="actor-library-list">${actorDetail.libraryNames.length > 0 ? actorDetail.libraryNames.map((item) => `<span class="path-badge">${escapeHtml(item)}</span>`).join("") : `<span class="footer-hint">当前未关联媒体库。</span>`}</div>${actorDetail.webUrl ? `<div class="inline-note">来源：<a class="ghost-link" href="${escapeHtml(actorDetail.webUrl)}">${escapeHtml(actorDetail.webType || actorDetail.webUrl)}</a></div>` : ""}</div></div><div class="surface-card side-stack actor-detail-route-surface"><div class="section-header"><div><span class="eyebrow">Related Videos</span><h2>关联影片</h2></div><div class="section-meta">${actorVideos?.totalCount ?? 0} items</div></div>${videoItems.length > 0 ? `<div class="task-feed">${videoItems.map((video) => `<article class="video-result-card compact" data-actor-video-id="${escapeHtml(video.videoId)}"><div class="video-result-head"><a href="${toHash({ kind: "video", backTo: backRouteHash, videoId: video.videoId })}" class="video-result-title">${escapeHtml(video.displayTitle)}</a><span class="code-pill">${escapeHtml(video.vid || "NO-VID")}</span></div><div class="video-result-meta"><span>${escapeHtml(video.libraryName || video.libraryId)}</span><span>扫描：${escapeHtml(video.lastScanAt ? formatDate(video.lastScanAt) : "未记录")}</span><span>播放：${escapeHtml(video.lastPlayedAt ? formatDate(video.lastPlayedAt) : "未播放")}</span></div><div class="badge-row">${asset("NFO", video.hasNfo)}${asset("Poster", video.hasPoster)}${asset("Thumb", video.hasThumb)}${asset("Fanart", video.hasFanart)}</div><div class="inline-note">${escapeHtml(video.path)}</div><div class="library-card-actions"><a class="ghost-link" href="${toHash({ kind: "video", backTo: backRouteHash, videoId: video.videoId })}">查看影片详情</a></div></article>`).join("")}</div>` : `<div class="empty-card compact-empty"><h3>暂无关联影片</h3><p>当前演员还没有关联影片结果。</p></div>`}</div></section>`;
}

function renderActorAvatar(avatarPath: string | null, actorName: string, large = false): string {
  const sizeClass = large ? "large" : "";
  if (!avatarPath) {
    return `<div class="actor-avatar ${sizeClass} placeholder" data-actor-avatar-state="placeholder"><span class="actor-avatar-fallback">${escapeHtml(actorInitials(actorName))}</span></div>`;
  }

  return `<div class="actor-avatar ${sizeClass}" data-actor-avatar-state="image"><img class="actor-avatar-image" src="${escapeHtml(toLocalFileUrl(avatarPath))}" alt="${escapeHtml(actorName)}" loading="lazy" /><span class="actor-avatar-fallback sr-only">${escapeHtml(actorInitials(actorName))}</span></div>`;
}

function renderSettingsGroupLink(group: SettingsRouteGroup, currentGroup: SettingsRouteGroup, title: string, note: string): string {
  return `<a class="nav-link ${group === currentGroup ? "active" : ""}" href="${toHash({ kind: "settings", group })}"><span>${escapeHtml(title)}</span><small>${escapeHtml(note)}</small></a>`;
}

function renderMetaTubeDiagnosticsPanel(
  metaTube: { requestTimeoutSeconds: number; serverUrl: string; },
  diagnostics: RunMetaTubeDiagnosticsResponse | null,
  diagnosticsRunning: boolean,
): string {
  const statusClass = diagnostics?.success ? "status-ok" : "status-error";
  const statusLabel = diagnostics ? (diagnostics.success ? "通过" : "异常") : "未执行";
  const summary = diagnostics?.summary ?? "点击“执行诊断”后，将检查根地址、providers、测试番号搜索和详情链路。";
  const targetUrl = diagnostics?.serverUrl || metaTube.serverUrl || "未配置";
  const timeout = diagnostics?.timeoutSeconds ?? metaTube.requestTimeoutSeconds;
  const resultBlock = diagnostics
    ? `<div class="diagnostics-summary-grid"><div class="worker-note"><div class="note-label">状态</div><div class="note-value ${statusClass}" data-settings-diagnostics-status="${diagnostics.success ? "success" : "failure"}">${statusLabel}</div><div class="footer-hint" data-settings-diagnostics-summary>${escapeHtml(summary)}</div></div><div class="worker-note"><div class="note-label">目标地址</div><div class="note-value">${escapeHtml(targetUrl)}</div><div class="footer-hint">超时 ${timeout} 秒</div></div><div class="worker-note"><div class="note-label">providers</div><div class="note-value">movie ${diagnostics.movieProviderCount} / actor ${diagnostics.actorProviderCount}</div><div class="footer-hint">搜索结果 ${diagnostics.searchResultCount} 条</div></div>${diagnostics.matchedProvider || diagnostics.detailTitle ? `<div class="worker-note"><div class="note-label">首条命中</div><div class="note-value">${escapeHtml(diagnostics.detailTitle || diagnostics.testVideoId)}</div><div class="footer-hint">${escapeHtml([diagnostics.matchedProvider, diagnostics.matchedMovieId].filter(Boolean).join(" / ") || "无详情")}</div></div>` : ""}<div class="worker-note diagnostics-log-panel"><div class="note-label">诊断步骤</div><ol class="diagnostics-log-list">${diagnostics.steps.map((step, index) => `<li data-settings-diagnostics-step="${index}">${escapeHtml(step)}</li>`).join("")}</ol></div></div>`
    : `<div class="empty-card"><h3>诊断尚未执行</h3><p>当前会使用表单中的 MetaTube 地址和超时配置发起诊断，不需要先保存。</p></div>`;

  return `<section class="settings-diagnostics-block"><div class="section-header"><div><span class="eyebrow">Diagnostics</span><h2>MetaTube diagnostics</h2></div><div class="header-actions"><button class="ghost-button" data-action="run-meta-tube-diagnostics" ${diagnosticsRunning ? "disabled" : ""}>${diagnosticsRunning ? "诊断中..." : "执行诊断"}</button></div></div><div class="inline-note">默认会用测试番号 <strong>${escapeHtml(diagnostics?.testVideoId ?? "IPX-001")}</strong> 校验搜索与详情链路。</div>${resultBlock}</section>`;
}

function renderSettingsGroupForm(group: SettingsRouteGroup, draft: UpdateSettingsRequest): string {
  if (group === "general") {
    return `<div class="settings-form-grid"><label class="field-stack"><span class="field-label">当前语言</span><select class="select-field" data-settings-group="general" data-settings-field="currentLanguage">${option("zh-CN", draft.general?.currentLanguage ?? "zh-CN", "简体中文")}${option("en-US", draft.general?.currentLanguage ?? "zh-CN", "English")}${option("ja-JP", draft.general?.currentLanguage ?? "zh-CN", "日本語")}</select><span class="inline-note">第一轮直接持久化 WindowConfig.Settings.CurrentLanguage。</span></label><label class="toggle-card"><input type="checkbox" data-settings-group="general" data-settings-field="debug" ${draft.general?.debug ? "checked" : ""} /><div><strong>开启调试模式</strong><div class="inline-note">保存后写回 WindowConfig.Settings.Debug。</div></div></label></div>`;
  }

  if (group === "metaTube") {
    return `<div class="settings-form-grid"><label class="field-stack"><span class="field-label">MetaTube 服务地址</span><input class="text-field" type="text" data-settings-group="metaTube" data-settings-field="serverUrl" value="${escapeHtml(draft.metaTube?.serverUrl ?? "")}" placeholder="https://metatube-server.hf.space" /><span class="inline-note">抓取链直接读取 MetaTubeConfig.ServerUrl。</span></label><label class="field-stack"><span class="field-label">请求超时（秒）</span><input class="text-field" type="number" min="15" max="300" data-settings-group="metaTube" data-settings-field="requestTimeoutSeconds" value="${draft.metaTube?.requestTimeoutSeconds ?? 60}" /><span class="inline-note">当前限制为 15 到 300 秒，诊断会优先使用当前表单里的值。</span></label></div>`;
  }

  return `<div class="settings-form-grid"><label class="field-stack"><span class="field-label">自定义播放器路径</span><input class="text-field" type="text" data-settings-group="playback" data-settings-field="playerPath" value="${escapeHtml(draft.playback?.playerPath ?? "")}" placeholder="留空则依赖系统默认播放器" /><span class="inline-note">播放链优先使用 WindowConfig.Settings.VideoPlayerPath。</span></label><label class="toggle-card"><input type="checkbox" data-settings-group="playback" data-settings-field="useSystemDefaultFallback" ${draft.playback?.useSystemDefaultFallback ? "checked" : ""} /><div><strong>允许回退系统默认播放器</strong><div class="inline-note">关闭后若未配置自定义播放器，将阻止播放请求。</div></div></label></div>`;
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
function renderLoading(): string { return `<section class="loading-shell"><div class="loading-card"><span class="eyebrow">Loading</span><h2>正在加载桌面壳数据</h2><p>读取 bootstrap、libraries、tasks 和当前路由所需的数据。</p></div></section>`; }
function routeDescription(kind: AppRoute["kind"]): string { return kind === "home" ? "当前壳层已覆盖库列表、任务摘要和设置入口。" : kind === "actors" ? "这里承载演员聚合结果、筛选排序和分页。" : kind === "actor" ? "这里承载演员头部信息、关联影片和到影片详情的返回链路。" : kind === "library" ? "这里同时承载扫描/抓取工作台和影片结果集。" : kind === "settings" ? "第四批聚焦真正落库且能被播放/抓取链消费的设置项。" : "基础详情、播放调用和播放写回已在这一页打通。"; }
function cloneActorsQuery(query: ActorsRouteQuery): ActorsRouteQuery { return { keyword: query.keyword, pageIndex: query.pageIndex, pageSize: query.pageSize, sortBy: query.sortBy, sortOrder: query.sortOrder }; }
function cloneQuery(query: LibraryVideoRouteQuery): LibraryVideoRouteQuery { return { keyword: query.keyword, missingSidecarOnly: query.missingSidecarOnly, pageIndex: query.pageIndex, pageSize: query.pageSize, sortBy: query.sortBy, sortOrder: query.sortOrder }; }
function createDefaultSettingsResponse(): GetSettingsResponse { return { general: { currentLanguage: "zh-CN", debug: false }, metaTube: { requestTimeoutSeconds: 60, serverUrl: "" }, playback: { playerPath: "", useSystemDefaultFallback: true } }; }
function createDefaultActorVideosRequest(): GetActorVideosRequest { return { keyword: "", pageIndex: 0, pageSize: 12, sortBy: "lastScanAt", sortOrder: "desc" }; }
function createSettingsDraft(settings: GetSettingsResponse): UpdateSettingsRequest { return { general: { ...settings.general }, metaTube: { ...settings.metaTube }, playback: { ...settings.playback }, resetToDefaults: false }; }
function cloneSettingsDraft(draft: UpdateSettingsRequest): UpdateSettingsRequest { return { general: draft.general ? { ...draft.general } : undefined, metaTube: draft.metaTube ? { ...draft.metaTube } : undefined, playback: draft.playback ? { ...draft.playback } : undefined, resetToDefaults: draft.resetToDefaults }; }
function isSettingsDirty(draft: UpdateSettingsRequest, settings: GetSettingsResponse): boolean { return (draft.general?.currentLanguage ?? "") !== settings.general.currentLanguage || Boolean(draft.general?.debug) !== settings.general.debug || (draft.metaTube?.serverUrl ?? "") !== settings.metaTube.serverUrl || Number(draft.metaTube?.requestTimeoutSeconds ?? 0) !== settings.metaTube.requestTimeoutSeconds || (draft.playback?.playerPath ?? "") !== settings.playback.playerPath || Boolean(draft.playback?.useSystemDefaultFallback) !== settings.playback.useSystemDefaultFallback; }
function settingsGroupTitle(group: SettingsRouteGroup): string { return group === "general" ? "General" : group === "metaTube" ? "MetaTube" : "Playback"; }
function settingsGroupDescription(group: SettingsRouteGroup): string { return group === "general" ? "语言与调试开关。" : group === "metaTube" ? "抓取服务地址和请求超时。" : "播放器路径和系统默认回退策略。"; }
function toSettingsGroup(value: string | undefined): SettingsRouteGroup { return value === "metaTube" || value === "playback" ? value : "general"; }
function syncActorsQueryDraft(current: ActorsRouteQuery, route: AppRoute): ActorsRouteQuery { return isActorsFamilyRoute(route) ? cloneActorsQuery(route.query) : current; }
function isActorsFamilyRoute(route: AppRoute): route is Extract<AppRoute, { kind: "actors" | "actor"; }> { return route.kind === "actors" || route.kind === "actor"; }
function syncLibraryVideoDrafts(current: Record<string, LibraryVideoRouteQuery>, route: AppRoute): Record<string, LibraryVideoRouteQuery> { return route.kind === "library" ? { ...current, [route.libraryId]: cloneQuery(route.query) } : current; }
function syncScanPathDrafts(current: Record<string, string>, libraries: readonly LibraryListItemDto[]): Record<string, string> { const next: Record<string, string> = {}; for (const library of libraries) next[library.libraryId] = current[library.libraryId] ?? library.scanPaths.join("\n"); return next; }
function normalizeScanPaths(value: string): string[] { const seen = new Set<string>(); const result: string[] = []; for (const item of value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) { const key = item.toLowerCase(); if (!seen.has(key)) { seen.add(key); result.push(item); } } return result; }
function isActiveTask(task: WorkerTaskDto): boolean { return task.status === "queued" || task.status === "running"; }
function taskHeadline(task: WorkerTaskDto): string { const progress = task.progressTotal > 0 ? ` ${task.progressCurrent}/${task.progressTotal}` : ""; return `${status(task.status)} · ${task.type} · ${task.percent}%${progress}`; }
function status(value: string): string { return value === "queued" ? "排队中" : value === "running" ? "运行中" : value === "succeeded" ? "已完成" : value === "failed" ? "失败" : value; }
function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value || "未记录" : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatDuration(minutes: number): string { if (!minutes || minutes <= 0) return "未记录"; const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours > 0 ? `${hours} 小时${rest > 0 ? ` ${rest} 分钟` : ""}` : `${minutes} 分钟`; }
function actorInitials(name: string): string { const trimmed = name.trim(); return trimmed.length >= 2 ? trimmed.slice(0, 2).toUpperCase() : (trimmed || "?").toUpperCase(); }
function clampPageIndex(pageIndex: number, totalPages: number): number { return Math.min(Math.max(0, pageIndex), Math.max(0, totalPages - 1)); }
function toLocalFileUrl(value: string): string {
  if (/^[a-z]+:\/\//i.test(value)) {
    return value;
  }

  const normalized = value.replace(/\\/g, "/");
  return normalized.startsWith("/")
    ? encodeURI(`file://${normalized}`)
    : encodeURI(`file:///${normalized}`);
}
function emptySummary(): TaskSummaryDto { return { completedTodayCount: 0, failedCount: 0, lastUpdatedUtc: new Date().toISOString(), queuedCount: 0, runningCount: 0 }; }
function emptyWorker(): WorkerStatusDto { return { baseUrl: "", eventStreamPath: "/api/events", healthy: false, startedAtUtc: "", status: "starting" }; }
function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function parseWorkerEventEnvelope<TData>(raw: string): WorkerEventEnvelopeDto<TData> | null { try { return JSON.parse(raw) as WorkerEventEnvelopeDto<TData>; } catch { return null; } }
