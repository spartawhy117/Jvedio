import { getApiClient } from "../api/client";
import type { GetSettingsResponse, VideoCardSize } from "../api/types";
import { useApiQuery } from "./useApiQuery";

export function normalizeVideoCardSize(value?: string | null): VideoCardSize {
  if (value === "medium" || value === "large") {
    return value;
  }

  return "small";
}

export function getVideoGridClassName(size: VideoCardSize): string {
  return `video-grid-${size}`;
}

export function useVideoCardDisplaySettings() {
  const settingsQuery = useApiQuery<GetSettingsResponse>({
    queryKey: "settings",
    queryFn: () => {
      const client = getApiClient();
      if (!client) {
        throw new Error("ApiClient not initialized");
      }

      return client.getSettings();
    },
    keepPreviousData: true,
  });

  const videoCardSize = normalizeVideoCardSize(settingsQuery.data?.display?.videoCardSize);

  return {
    videoCardSize,
    videoGridClassName: getVideoGridClassName(videoCardSize),
  };
}
