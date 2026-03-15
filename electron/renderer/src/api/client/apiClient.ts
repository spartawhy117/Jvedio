import type {
  ApiErrorDto,
  ApiResponse,
  CreateLibraryRequest,
  CreateLibraryResponse,
  DeleteLibraryResponse,
  GetBootstrapResponse,
  GetLibrariesResponse,
  GetTasksResponse
} from "../../types/api";

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

  public getTasks(): Promise<GetTasksResponse> {
    return this.request<GetTasksResponse>("/api/tasks");
  }

  private async request<TData>(path: string, init?: RequestInit): Promise<TData> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    const payload = await response.json() as ApiResponse<TData>;

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
}
