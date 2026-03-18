/**
 * Worker API Client.
 *
 * Covers all endpoints exposed by Jvedio.Worker.
 * Each method unwraps ApiResponse<T> and throws WorkerApiError on failure.
 */

import type {
  ApiResponse,
  // Bootstrap
  GetBootstrapResponse,
  // Libraries
  GetLibrariesResponse,
  CreateLibraryRequest,
  CreateLibraryResponse,
  UpdateLibraryRequest,
  UpdateLibraryResponse,
  DeleteLibraryResponse,
  StartLibraryScanRequest,
  StartLibraryScanResponse,
  StartLibraryScrapeRequest,
  StartLibraryScrapeResponse,
  // Videos
  GetLibraryVideosRequest,
  GetLibraryVideosResponse,
  GetFavoriteVideosRequest,
  GetFavoriteVideosResponse,
  GetVideoDetailResponse,
  PlayVideoRequest,
  PlayVideoResponse,
  // Video Groups
  GetVideoGroupsResponse,
  GetVideoGroupVideosRequest,
  GetVideoGroupVideosResponse,
  // Actors
  GetActorsRequest,
  GetActorsResponse,
  GetActorDetailResponse,
  GetActorVideosRequest,
  GetActorVideosResponse,
  // Tasks
  GetTasksResponse,
  RetryTaskResponse,
  // Settings
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  RunMetaTubeDiagnosticsRequest,
  RunMetaTubeDiagnosticsResponse,
} from "./types";

// ── Error class ─────────────────────────────────────────

export class WorkerApiError extends Error {
  public readonly statusCode: number;
  public readonly requestId: string;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly details: unknown;

  constructor(
    message: string,
    opts: {
      statusCode: number;
      requestId?: string;
      userMessage?: string;
      retryable?: boolean;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "WorkerApiError";
    this.statusCode = opts.statusCode;
    this.requestId = opts.requestId ?? "";
    this.userMessage = opts.userMessage ?? message;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
  }
}

// ── API Client ──────────────────────────────────────────

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  // ── Internals ───────────────────────────────────────

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    console.log(`[api-client] ${init?.method ?? "GET"} ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          ...init?.headers,
        },
      });
    } catch (err) {
      throw new WorkerApiError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        { statusCode: 0 }
      );
    }

    if (!res.ok) {
      let body: string | undefined;
      try {
        body = await res.text();
      } catch {
        // ignore
      }
      throw new WorkerApiError(
        `HTTP ${res.status}: ${res.statusText}`,
        {
          statusCode: res.status,
          details: body,
        }
      );
    }

    const envelope: ApiResponse<T> = await res.json();

    if (!envelope.success || !envelope.data) {
      const err = envelope.error;
      throw new WorkerApiError(
        err?.message ?? "Unknown error",
        {
          statusCode: res.status,
          requestId: envelope.requestId,
          userMessage: err?.userMessage,
          retryable: err?.retryable,
          details: err?.details,
        }
      );
    }

    return envelope.data;
  }

  private buildQuery(params: Record<string, string | number | boolean | undefined>): string {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        sp.set(key, String(value));
      }
    }
    const qs = sp.toString();
    return qs.length > 0 ? `?${qs}` : "";
  }

  private jsonBody(data: unknown): RequestInit {
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  }

  // ── Bootstrap ───────────────────────────────────────

  getBootstrap(): Promise<GetBootstrapResponse> {
    return this.request("/api/app/bootstrap");
  }

  // ── Libraries ───────────────────────────────────────

  getLibraries(): Promise<GetLibrariesResponse> {
    return this.request("/api/libraries");
  }

  createLibrary(req: CreateLibraryRequest): Promise<CreateLibraryResponse> {
    return this.request("/api/libraries", this.jsonBody(req));
  }

  updateLibrary(libraryId: string, req: UpdateLibraryRequest): Promise<UpdateLibraryResponse> {
    return this.request(
      `/api/libraries/${encodeURIComponent(libraryId)}`,
      { ...this.jsonBody(req), method: "PUT" }
    );
  }

  deleteLibrary(libraryId: string): Promise<DeleteLibraryResponse> {
    return this.request(
      `/api/libraries/${encodeURIComponent(libraryId)}`,
      { method: "DELETE" }
    );
  }

  startLibraryScan(libraryId: string, req?: StartLibraryScanRequest): Promise<StartLibraryScanResponse> {
    return this.request(
      `/api/libraries/${encodeURIComponent(libraryId)}/scan`,
      this.jsonBody(req ?? {})
    );
  }

  startLibraryScrape(libraryId: string, req?: StartLibraryScrapeRequest): Promise<StartLibraryScrapeResponse> {
    return this.request(
      `/api/libraries/${encodeURIComponent(libraryId)}/scrape`,
      this.jsonBody(req ?? {})
    );
  }

  // ── Library Videos ──────────────────────────────────

  getLibraryVideos(libraryId: string, req: GetLibraryVideosRequest): Promise<GetLibraryVideosResponse> {
    const qs = this.buildQuery({
      keyword: req.keyword?.trim(),
      sortBy: req.sortBy,
      sortOrder: req.sortOrder,
      pageIndex: req.pageIndex,
      pageSize: req.pageSize,
      missingSidecarOnly: req.missingSidecarOnly || undefined,
    });
    return this.request(`/api/libraries/${encodeURIComponent(libraryId)}/videos${qs}`);
  }

  // ── Favorite Videos ─────────────────────────────────

  getFavoriteVideos(req: GetFavoriteVideosRequest): Promise<GetFavoriteVideosResponse> {
    const qs = this.buildQuery({
      keyword: req.keyword?.trim(),
      sortBy: req.sortBy,
      sortOrder: req.sortOrder,
      pageIndex: req.pageIndex,
      pageSize: req.pageSize,
      missingSidecarOnly: req.missingSidecarOnly || undefined,
    });
    return this.request(`/api/videos/favorites${qs}`);
  }

  // ── Video Detail ────────────────────────────────────

  getVideoDetail(videoId: string): Promise<GetVideoDetailResponse> {
    return this.request(`/api/videos/${encodeURIComponent(videoId)}`);
  }

  playVideo(videoId: string, req?: PlayVideoRequest): Promise<PlayVideoResponse> {
    return this.request(
      `/api/videos/${encodeURIComponent(videoId)}/play`,
      this.jsonBody(req ?? {})
    );
  }

  // ── Video Groups (Categories / Series) ──────────────

  getCategoryGroups(): Promise<GetVideoGroupsResponse> {
    return this.request("/api/videos/categories");
  }

  getCategoryVideos(categoryName: string, req: GetVideoGroupVideosRequest): Promise<GetVideoGroupVideosResponse> {
    const qs = this.buildQuery({
      keyword: req.keyword?.trim(),
      sortBy: req.sortBy,
      sortOrder: req.sortOrder,
      pageIndex: req.pageIndex,
      pageSize: req.pageSize,
      missingSidecarOnly: req.missingSidecarOnly || undefined,
    });
    return this.request(`/api/videos/categories/${encodeURIComponent(categoryName)}/videos${qs}`);
  }

  getSeriesGroups(): Promise<GetVideoGroupsResponse> {
    return this.request("/api/videos/series");
  }

  getSeriesVideos(seriesName: string, req: GetVideoGroupVideosRequest): Promise<GetVideoGroupVideosResponse> {
    const qs = this.buildQuery({
      keyword: req.keyword?.trim(),
      sortBy: req.sortBy,
      sortOrder: req.sortOrder,
      pageIndex: req.pageIndex,
      pageSize: req.pageSize,
      missingSidecarOnly: req.missingSidecarOnly || undefined,
    });
    return this.request(`/api/videos/series/${encodeURIComponent(seriesName)}/videos${qs}`);
  }

  // ── Actors ──────────────────────────────────────────

  getActors(req: GetActorsRequest): Promise<GetActorsResponse> {
    const qs = this.buildQuery({
      keyword: req.keyword?.trim(),
      sortBy: req.sortBy,
      sortOrder: req.sortOrder,
      pageIndex: req.pageIndex,
      pageSize: req.pageSize,
    });
    return this.request(`/api/actors${qs}`);
  }

  getActorDetail(actorId: string): Promise<GetActorDetailResponse> {
    return this.request(`/api/actors/${encodeURIComponent(actorId)}`);
  }

  getActorVideos(actorId: string, req: GetActorVideosRequest): Promise<GetActorVideosResponse> {
    const qs = this.buildQuery({
      keyword: req.keyword?.trim(),
      sortBy: req.sortBy,
      sortOrder: req.sortOrder,
      pageIndex: req.pageIndex,
      pageSize: req.pageSize,
    });
    return this.request(`/api/actors/${encodeURIComponent(actorId)}/videos${qs}`);
  }

  // ── Tasks ───────────────────────────────────────────

  getTasks(): Promise<GetTasksResponse> {
    return this.request("/api/tasks");
  }

  retryTask(taskId: string): Promise<RetryTaskResponse> {
    return this.request(
      `/api/tasks/${encodeURIComponent(taskId)}/retry`,
      { method: "POST" }
    );
  }

  // ── Settings ────────────────────────────────────────

  getSettings(): Promise<GetSettingsResponse> {
    return this.request("/api/settings");
  }

  updateSettings(req: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
    return this.request("/api/settings", {
      ...this.jsonBody(req),
      method: "PUT",
    });
  }

  resetSettings(): Promise<UpdateSettingsResponse> {
    return this.request("/api/settings", {
      ...this.jsonBody({ resetToDefaults: true }),
      method: "PUT",
    });
  }

  runMetaTubeDiagnostics(req?: RunMetaTubeDiagnosticsRequest): Promise<RunMetaTubeDiagnosticsResponse> {
    return this.request(
      "/api/settings/meta-tube/diagnostics",
      this.jsonBody(req ?? {})
    );
  }

  // ── SSE URL ─────────────────────────────────────────

  getEventStreamUrl(path?: string): string {
    const p = path?.startsWith("/") ? path : `/${path ?? "api/events"}`;
    return `${this.baseUrl}${p}`;
  }
}

// ── Singleton convenience ───────────────────────────────

let _client: ApiClient | null = null;

export function getApiClient(): ApiClient | null {
  return _client;
}

export function createApiClient(baseUrl: string): ApiClient {
  _client = new ApiClient(baseUrl);
  return _client;
}

// ── Legacy standalone function (backward compat) ────────

export async function fetchBootstrap(
  baseUrl: string
): Promise<GetBootstrapResponse> {
  const client = new ApiClient(baseUrl);
  return client.getBootstrap();
}
