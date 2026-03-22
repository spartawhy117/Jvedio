/**
 * Video Detail Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/video-detail-page.md
 * - Left: poster, VID, sidecar status
 * - Right: title, metadata, primary action, actors, synopsis, file path
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
import { ActorCard } from "../components/shared/ActorCard";
import { AppIcon } from "../components/shared/AppIcon";
import { BackNavigation } from "../components/shared/BackNavigation";
import { StatusBadge } from "../components/shared/StatusBadge";
import type { GetVideoDetailResponse, PlayVideoResponse } from "../api/types";
import "./pages.css";

export function VideoDetailPage() {
  const { t: tc } = useTranslation("common");
  const { params, navigate } = useRouter();
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
  const thumbUrl = video?.sidecars.thumb.exists && baseUrl
    ? `${baseUrl}/api/videos/${encodeURIComponent(videoId)}/thumb`
    : null;
  const posterUrl = video?.sidecars.poster.exists && baseUrl
    ? `${baseUrl}/api/videos/${encodeURIComponent(videoId)}/poster`
    : null;
  const previewUrl = thumbUrl ?? posterUrl;

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
    if (!actorId) return;
    navigate("actor-detail", { actorId }, { label: tc("videoDetail") });
  }, [navigate, tc]);

  // ── Render ────────────────────────────────────────

  if (detailQuery.isLoading && !video) {
    return (
      <div className="page-content-section">
        <div className="page-readable-content">
          <ResultState type="loading" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="page-content-section">
        <div className="page-readable-content page-activity-shell">
          <div className="page-back-row">
            <BackNavigation />
          </div>
          <ResultState type="error" message={detailQuery.error?.message} />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="page-content-section">
        <div className="page-readable-content page-activity-shell">
          <div className="page-back-row">
            <BackNavigation />
          </div>
          <ResultState type="empty" message={tc("noData")} />
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "—";
    return value.replace("T", " ").slice(0, 16);
  };

  const formatReleaseDate = (value: string | null | undefined) => {
    if (!value) return "—";
    return value.length >= 10 ? value.slice(0, 10) : value;
  };

  return (
    <div className="page-content-section">
      <div className="page-readable-content page-activity-shell">
        <div className="page-back-row">
          <BackNavigation />
        </div>

        <div className="video-detail-layout">
          <div className="video-detail-left">
            <div className="video-detail-poster">
              {previewUrl ? (
                <img src={previewUrl} alt={video.vid} loading="lazy" />
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

            <div className="video-detail-vid">{video.vid}</div>

            <div className="sidecar-status-grid">
              <StatusBadge
                variant={video.sidecars.nfo.exists ? "synced" : "failed"}
                label={tc("nfo")}
              />
              <StatusBadge
                variant={video.sidecars.poster.exists ? "synced" : "failed"}
                label={tc("poster")}
              />
              <StatusBadge
                variant={video.sidecars.thumb.exists ? "synced" : "failed"}
                label={tc("thumb")}
              />
              <StatusBadge
                variant={video.sidecars.fanart.exists ? "synced" : "failed"}
                label={tc("fanart")}
              />
            </div>
          </div>

          <div className="video-detail-right">
            {video.title && video.title !== video.vid && (
              <h3 className="video-detail-title">{video.title}</h3>
            )}

            <div className="metadata-grid">
              {video.libraryName && (
                <MetadataRow label={tc("libraryName")} value={video.libraryName} />
              )}
              {video.releaseDate && (
                <MetadataRow
                  label={tc("releaseDate")}
                  value={formatReleaseDate(video.releaseDate)}
                />
              )}
              {video.firstAddedAt && (
                <MetadataRow label={tc("firstAddedAt")} value={formatDateTime(video.firstAddedAt)} />
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

            <div className="video-detail-cta">
              <button
                className="btn btn-primary video-detail-play-button"
                onClick={handlePlay}
                disabled={playMutation.isLoading || !video.playback.canPlay}
                type="button"
              >
                {playMutation.isLoading ? tc("loading") : <><AppIcon name="play" size={16} /> {tc("play")}</>}
              </button>
              {!video.playback.canPlay && video.playback.reason ? (
                <span className="video-detail-cta-hint">{video.playback.reason}</span>
              ) : null}
            </div>

            {(video.plot || video.outline) && (
              <div className="video-detail-synopsis">
                <span className="detail-label">{tc("outline")}</span>
                <p className="synopsis-text">{video.plot || video.outline}</p>
              </div>
            )}

            {video.actors && video.actors.length > 0 && (
              <div className="video-detail-actors">
                <span className="detail-label">{tc("actors")}</span>
                <div className="video-detail-actor-grid">
                  {video.actors
                    .filter((actor) => !!actor.actorId)
                    .map((actor) => (
                      <ActorCard
                        key={actor.actorId}
                        actor={{
                          actorId: actor.actorId ?? "",
                          avatarPath: actor.avatarPath,
                          name: actor.name,
                        }}
                        baseUrl={baseUrl}
                        compact
                        subtitle={null}
                        onClick={handleActorClick}
                      />
                    ))}
                </div>
              </div>
            )}

            <div className="video-detail-path">
              <div className="video-detail-path-header">
                <span className="detail-label">{tc("filePath")}</span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleOpenFolder}
                  title={tc("openFolder")}
                  type="button"
                >
                  {tc("openFolder")}
                </button>
              </div>
              <code className="path-text">{video.path}</code>
            </div>

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
