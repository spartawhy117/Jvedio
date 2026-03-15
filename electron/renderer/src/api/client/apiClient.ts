import type {
  ApiErrorDto,
  ApiResponse,
  CreateLibraryRequest,
  CreateLibraryResponse,
  DeleteLibraryResponse,
  GetActorDetailResponse,
  GetActorsRequest,
  GetActorsResponse,
  GetActorVideosRequest,
  GetActorVideosResponse,
  GetBootstrapResponse,
  GetLibrariesResponse,
  GetLibraryVideosRequest,
  GetLibraryVideosResponse,
  GetSettingsResponse,
  GetTasksResponse,
  GetVideoDetailResponse,
  PlayVideoRequest,
  PlayVideoResponse,
  RunMetaTubeDiagnosticsRequest,
  RunMetaTubeDiagnosticsResponse,
  StartLibraryScanRequest,
  StartLibraryScanResponse,
  StartLibraryScrapeRequest,
  StartLibraryScrapeResponse,
  UpdateLibraryRequest,
  UpdateLibraryResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse
} from "../../types/api.js";

export class WorkerApiError extends Error {
  public readonly details: unknown;
  public readonly requestId: string;
  public readonly statusCode: number;
  public readonly userMessage: string;

  public constructor(message: string, options: {
    details?: unknown;
    requestId?: string;
    statusCode: number;
    userMessage?: string;
  }) {
    super(message);
    this.name = "WorkerApiError";
    this.details = options.details;
    this.requestId = options.requestId ?? "";
    this.statusCode = options.statusCode;
    this.userMessage = options.userMessage ?? message;
  }
}

export class ApiClient {
  private readonly baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  public getBootstrap(): Promise<GetBootstrapResponse> {
    return this.request<GetBootstrapResponse>("/api/app/bootstrap");
  }

  public getLibraries(): Promise<GetLibrariesResponse> {
    return this.request<GetLibrariesResponse>("/api/libraries");
  }

  public createLibrary(request: CreateLibraryRequest): Promise<CreateLibraryResponse> {
    return this.request<CreateLibraryResponse>("/api/libraries", {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }

  public deleteLibrary(libraryId: string): Promise<DeleteLibraryResponse> {
    return this.request<DeleteLibraryResponse>(`/api/libraries/${encodeURIComponent(libraryId)}`, {
      method: "DELETE"
    });
  }

  public updateLibrary(libraryId: string, request: UpdateLibraryRequest): Promise<UpdateLibraryResponse> {
    return this.request<UpdateLibraryResponse>(`/api/libraries/${encodeURIComponent(libraryId)}`, {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PUT"
    });
  }

  public getLibraryVideos(libraryId: string, request: GetLibraryVideosRequest): Promise<GetLibraryVideosResponse> {
    const searchParams = new URLSearchParams();
    if (request.keyword.trim().length > 0) {
      searchParams.set("keyword", request.keyword.trim());
    }
    searchParams.set("sortBy", request.sortBy);
    searchParams.set("sortOrder", request.sortOrder);
    searchParams.set("pageIndex", String(request.pageIndex));
    searchParams.set("pageSize", String(request.pageSize));
    if (request.missingSidecarOnly) {
      searchParams.set("missingSidecarOnly", "true");
    }

    const queryString = searchParams.toString();
    const path = `/api/libraries/${encodeURIComponent(libraryId)}/videos${queryString.length > 0 ? `?${queryString}` : ""}`;
    return this.request<GetLibraryVideosResponse>(path);
  }

  public getActors(request: GetActorsRequest): Promise<GetActorsResponse> {
    const searchParams = new URLSearchParams();
    if (request.keyword.trim().length > 0) {
      searchParams.set("keyword", request.keyword.trim());
    }
    searchParams.set("sortBy", request.sortBy);
    searchParams.set("sortOrder", request.sortOrder);
    searchParams.set("pageIndex", String(request.pageIndex));
    searchParams.set("pageSize", String(request.pageSize));

    const queryString = searchParams.toString();
    return this.request<GetActorsResponse>(`/api/actors${queryString.length > 0 ? `?${queryString}` : ""}`);
  }

  public getActorDetail(actorId: string): Promise<GetActorDetailResponse> {
    return this.request<GetActorDetailResponse>(`/api/actors/${encodeURIComponent(actorId)}`);
  }

  public getActorVideos(actorId: string, request: GetActorVideosRequest): Promise<GetActorVideosResponse> {
    const searchParams = new URLSearchParams();
    if (request.keyword.trim().length > 0) {
      searchParams.set("keyword", request.keyword.trim());
    }
    searchParams.set("sortBy", request.sortBy);
    searchParams.set("sortOrder", request.sortOrder);
    searchParams.set("pageIndex", String(request.pageIndex));
    searchParams.set("pageSize", String(request.pageSize));

    const queryString = searchParams.toString();
    const path = `/api/actors/${encodeURIComponent(actorId)}/videos${queryString.length > 0 ? `?${queryString}` : ""}`;
    return this.request<GetActorVideosResponse>(path);
  }

  public startLibraryScan(libraryId: string, request: StartLibraryScanRequest): Promise<StartLibraryScanResponse> {
    return this.request<StartLibraryScanResponse>(`/api/libraries/${encodeURIComponent(libraryId)}/scan`, {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }

  public startLibraryScrape(libraryId: string, request: StartLibraryScrapeRequest): Promise<StartLibraryScrapeResponse> {
    return this.request<StartLibraryScrapeResponse>(`/api/libraries/${encodeURIComponent(libraryId)}/scrape`, {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }

  public getTasks(): Promise<GetTasksResponse> {
    return this.request<GetTasksResponse>("/api/tasks");
  }

  public getSettings(): Promise<GetSettingsResponse> {
    return this.request<GetSettingsResponse>("/api/settings");
  }

  public updateSettings(request: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
    return this.request<UpdateSettingsResponse>("/api/settings", {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PUT"
    });
  }

  public runMetaTubeDiagnostics(request: RunMetaTubeDiagnosticsRequest): Promise<RunMetaTubeDiagnosticsResponse> {
    return this.request<RunMetaTubeDiagnosticsResponse>("/api/settings/meta-tube/diagnostics", {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }

  public getVideoDetail(videoId: string): Promise<GetVideoDetailResponse> {
    return this.request<GetVideoDetailResponse>(`/api/videos/${encodeURIComponent(videoId)}`);
  }

  public playVideo(videoId: string, request: PlayVideoRequest): Promise<PlayVideoResponse> {
    return this.request<PlayVideoResponse>(`/api/videos/${encodeURIComponent(videoId)}/play`, {
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }

  public getEventStreamUrl(eventStreamPath: string): string {
    const normalizedPath = eventStreamPath.startsWith("/") ? eventStreamPath : `/${eventStreamPath}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private async request<TData>(path: string, init?: RequestInit): Promise<TData> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      throw this.createTransportError(error);
    }

    let payload: ApiResponse<TData>;
    try {
      payload = await response.json() as ApiResponse<TData>;
    } catch (error) {
      throw this.createInvalidPayloadError(response.status, error);
    }

    if (!response.ok || !payload.success || !payload.data) {
      throw this.createError(response.status, payload.error, payload.requestId);
    }

    return payload.data;
  }

  private createError(statusCode: number, error: ApiErrorDto | null, requestId: string): WorkerApiError {
    if (error) {
      return new WorkerApiError(error.message, {
        details: error.details,
        requestId,
        statusCode,
        userMessage: error.userMessage
      });
    }

    return new WorkerApiError("Worker request failed.", {
      requestId,
      statusCode,
      userMessage: "Worker 请求失败，请稍后重试。"
    });
  }

  private createInvalidPayloadError(statusCode: number, error: unknown): WorkerApiError {
    return new WorkerApiError("Worker returned an invalid response payload.", {
      details: normalizeErrorDetails(error),
      statusCode: statusCode || 500,
      userMessage: statusCode === 503
        ? "本地 Worker 尚未就绪，请稍后重试。"
        : "Worker 返回了无法识别的响应，请查看日志。"
    });
  }

  private createTransportError(error: unknown): WorkerApiError {
    return new WorkerApiError("Worker request could not reach the local service.", {
      details: normalizeErrorDetails(error),
      statusCode: 503,
      userMessage: "无法连接本地 Worker，请确认 Worker 已启动。"
    });
  }
}

function normalizeErrorDetails(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return error;
}
