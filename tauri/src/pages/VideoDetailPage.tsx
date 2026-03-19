/**
 * Video Detail Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/video-detail-page.md
 * - Left: poster, VID, sidecar status, play button
 * - Right: title, metadata, actors, synopsis, file path
 * - Back navigation via backTo
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery, useApiMutation } from "../hooks/useApiQuery";
import { showToast } from "../components/GlobalToast";
import { ResultState } from "../components/shared/ResultState";
import { ActionStrip } from "../components/shared/ActionStrip";
import { StatusBadge } from "../components/shared/StatusBadge";
import type { GetVideoDetailResponse, PlayVideoResponse } from "../api/types";
import "./pages.css";

export function VideoDetailPage() {
  const { t: tc } = useTranslation("common");
  const { params, canGoBack, goBack, navigate } = useRouter();
  const { bootstrap } = useBootstrap();

  const videoId = params.videoId ?? "";
  const baseUrl = bootstrap?.worker.baseUrl ?? "";

  // ── Fetch video detail ─────────────────────────────
  const detailQuery = useApiQuery<GetVideoDetailResponse>({
    queryKey: `video:${videoId}`,
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.getVideoDetail(videoId);
    },
    enabled: !!videoId,
  });

  // ── Play mutation ──────────────────────────────────
  const playMutation = useApiMutation<PlayVideoResponse, void>({
    mutationFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.playVideo(videoId);
    },
    onSuccess: () => {
      showToast({ message: tc("playSuccess"), type: "success" });
    },
    onError: (err) => {
      showToast({ message: `${tc("playFailed")}: ${err.message}`, type: "error" });
    },
  });

  // ── Derived state ──────────────────────────────
  const video = detailQuery.data?.video;
  const posterUrl = video && baseUrl
    ? `${baseUrl}/api/videos/${encodeURIComponent(videoId)}/poster`
    : null;

  // ── Handlers ──────────────────────────────────────
  const handlePlay = useCallback(() => {
    playMutation.mutate(undefined as never);
  }, [playMutation]);

  const handleOpenFolder = useCallback(async () => {
    if (!video?.path) return;
    try {
      await revealItemInDir(video.path);
    } catch (err) {
      showToast({ message: `${tc("openFolder")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [video?.path, tc]);

  const handleActorClick = useCallback((actorId: string) => {
    navigate("actor-detail", { actorId }, { label: video?.vid ?? "Video Detail" });
  }, [navigate]);

  // ── Render ────────────────────────────────────────

  if (detailQuery.isLoading && !video) {
    return (
      <div className="page-content-section">
        <ResultState type="loading" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="page-content-section">
        <div className="page-header">
          {canGoBack && (
            <button className="btn btn-icon" onClick={goBack} title={tc("back")}>←</button>
          )}
          <h2 className="page-title">Video Detail</h2>
        </div>
        <ResultState type="error" message={detailQuery.error?.message} />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="page-content-section">
        <div className="page-header">
          {canGoBack && (
            <button className="btn btn-icon" onClick={goBack} title={tc("back")}>←</button>
          )}
          <h2 className="page-title">Video Detail</h2>
        </div>
        <ResultState type="empty" message={tc("noData")} />
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="page-content-section">
      {/* Header */}
      <div className="page-header">
        {canGoBack && (
          <button className="btn btn-icon" onClick={goBack} title={tc("back")}>←</button>
        )}
        <h2 className="page-title">{video.displayTitle || video.vid}</h2>
      </div>

      {/* Main layout: left poster + right metadata */}
      <div className="video-detail-layout">
        {/* Left column */}
        <div className="video-detail-left">
          <div className="video-detail-poster">
            {posterUrl ? (
              <img src={posterUrl} alt={video.vid} loading="lazy" />
            ) : (
              <div className="video-card-no-image poster-fallback">
                <svg className="no-poster-placeholder" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 64 }}>
                  <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="24" cy="20" r="6" stroke="currentColor" strokeWidth="2" />
                  <path d="M14 38c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="no-poster-text">No Poster</span>
              </div>
            )}
          </div>

          {/* VID */}
          <div className="video-detail-vid">{video.vid}</div>

          {/* Sidecar status */}
          <div className="sidecar-status-grid">
            <StatusBadge
              variant={video.sidecars.hasNfo ? "synced" : "failed"}
              label={tc("nfo")}
            />
            <StatusBadge
              variant={video.sidecars.hasPoster ? "synced" : "failed"}
              label={tc("poster")}
            />
            <StatusBadge
              variant={video.sidecars.hasThumb ? "synced" : "failed"}
              label={tc("thumb")}
            />
            <StatusBadge
              variant={video.sidecars.hasFanart ? "synced" : "failed"}
              label={tc("fanart")}
            />
          </div>

          {/* Play button */}
          <ActionStrip
            actions={[
              {
                key: "play",
                label: `▶ ${tc("play")}`,
                variant: "execute",
                onClick: handlePlay,
                disabled: playMutation.isLoading || !video.playback.canPlay,
              },
              {
                key: "openFolder",
                label: `📂 ${tc("openFolder")}`,
                variant: "browse",
                onClick: handleOpenFolder,
                title: tc("openFolder"),
              },
            ]}
          />
        </div>

        {/* Right column: metadata */}
        <div className="video-detail-right">
          {/* Title */}
          {video.title && video.title !== video.vid && (
            <h3 className="video-detail-title">{video.title}</h3>
          )}

          {/* Metadata grid */}
          <div className="metadata-grid">
            {video.libraryName && (
              <MetadataRow label={tc("libraryName")} value={video.libraryName} />
            )}
            {video.releaseDate && (
              <MetadataRow
                label={tc("releaseDate")}
                value={new Date(video.releaseDate).toLocaleDateString()}
              />
            )}
            {video.durationSeconds > 0 && (
              <MetadataRow label={tc("duration")} value={formatDuration(video.durationSeconds)} />
            )}
            {video.director && (
              <MetadataRow label={tc("director")} value={video.director} />
            )}
            {video.studio && (
              <MetadataRow label={tc("studio")} value={video.studio} />
            )}
            {video.series && (
              <MetadataRow label={tc("series")} value={video.series} />
            )}
            {video.rating > 0 && (
              <MetadataRow label={tc("rating")} value={`${video.rating} / 10`} />
            )}
            {video.viewCount > 0 && (
              <MetadataRow label={tc("viewCount")} value={String(video.viewCount)} />
            )}
          </div>

          {/* Actors */}
          {video.actors && video.actors.length > 0 && (
            <div className="video-detail-actors">
              <span className="detail-label">{tc("associatedVideos").replace("影片", "演员")}</span>
              <div className="actor-tags">
                {video.actors.map((actor) => (
                  <button
                    key={actor.actorId}
                    className="actor-tag"
                    onClick={() => handleActorClick(actor.actorId)}
                  >
                    {actor.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis */}
          {(video.plot || video.outline) && (
            <div className="video-detail-synopsis">
              <span className="detail-label">{tc("outline")}</span>
              <p className="synopsis-text">{video.plot || video.outline}</p>
            </div>
          )}

          {/* File path */}
          <div className="video-detail-path">
            <span className="detail-label">{tc("filePath")}</span>
            <code className="path-text">{video.path}</code>
          </div>

          {/* Web URL */}
          {video.webUrl && (
            <div className="video-detail-weburl">
              <span className="detail-label">{tc("webUrl")}</span>
              <a
                className="weburl-link"
                href={video.webUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {video.webUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ───────────────────────────────────

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-row">
      <span className="metadata-label">{label}</span>
      <span className="metadata-value">{value}</span>
    </div>
  );
}
