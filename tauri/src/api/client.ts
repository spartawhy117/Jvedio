import type { ApiResponse, GetBootstrapResponse } from "./types";

/**
 * Fetch GET /api/app/bootstrap from the Worker.
 */
export async function fetchBootstrap(
  baseUrl: string
): Promise<GetBootstrapResponse> {
  const url = `${baseUrl}/api/app/bootstrap`;
  console.log("[api-client] fetchBootstrap:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Bootstrap request failed: ${res.status} ${res.statusText}`);
  }

  const envelope: ApiResponse<GetBootstrapResponse> = await res.json();

  if (!envelope.success || !envelope.data) {
    const errMsg = envelope.error?.userMessage || envelope.error?.message || "Unknown error";
    throw new Error(`Bootstrap error: ${errMsg}`);
  }

  return envelope.data;
}
