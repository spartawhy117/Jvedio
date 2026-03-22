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
  const fanartUrl = video?.sidecars.fanart.exists && baseUrl
    ? `${baseUrl}/api/videos/${encodeURIComponent(videoId)}/fanart`
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

  const headline = video.displayTitle?.trim() || video.title?.trim() || video.vid;

  return (
    <div className="page-content-section page-content-wide">
      <div className="page-readable-content page-activity-shell video-detail-shell">
        <div className="page-back-row">
          <BackNavigation />
        </div>

        <div className="video-detail-stage">
          <section className="video-detail-hero">
            <div className="video-detail-hero-backdrop" aria-hidden="true">
              {fanartUrl ? <img src={fanartUrl} alt="" loading="lazy" /> : null}
            </div>
            <div className="video-detail-hero-scrim" aria-hidden="true" />

            <div className="video-detail-hero-content">
              <div className="video-detail-hero-header">
                <div className="video-detail-heading">
                  <h1 className="video-detail-title">{headline}</h1>
                </div>

                <div className="video-detail-sidecars">
                  <StatusBadge variant={video.sidecars.nfo.exists ? "synced" : "failed"} label={tc("nfo")} />
                  <StatusBadge variant={video.sidecars.poster.exists ? "synced" : "failed"} label={tc("poster")} />
                  <StatusBadge variant={video.sidecars.thumb.exists ? "synced" : "failed"} label={tc("thumb")} />
                  <StatusBadge variant={video.sidecars.fanart.exists ? "synced" : "failed"} label={tc("fanart")} />
                </div>

                <div className="video-detail-cta">
                  <button
                    className="btn btn-primary video-detail-play-button"
                    onClick={handlePlay}
                    disabled={playMutation.isLoading || !video.playback.canPlay}
                    type="button"
                  >
                    {playMutation.isLoading ? tc("loading") : <><AppIcon name="play" size={18} /> {tc("play")}</>}
                  </button>
                  {!video.playback.canPlay && video.playback.reason ? (
                    <span className="video-detail-cta-hint">{video.playback.reason}</span>
                  ) : null}
                </div>
              </div>

              <div className="video-detail-meta-panel">
                <div className="metadata-grid">
                  <MetadataRow label="VID" value={video.vid} />
                  <MetadataRow label={tc("libraryName")} value={video.libraryName || "—"} />
                  <MetadataRow label={tc("studio")} value={video.studio || "—"} />
                  <MetadataRow label={tc("series")} value={video.series || "—"} />
                  <MetadataRow label={tc("releaseDate")} value={formatReleaseDate(video.releaseDate)} />
                  <MetadataRow label={tc("firstAddedAt")} value={formatDateTime(video.firstAddedAt)} />
                  <MetadataRow label={tc("duration")} value={formatDuration(video.durationSeconds)} />
                  <MetadataRow label={tc("director")} value={video.director || "—"} />
                  <MetadataRow label={tc("viewCount")} value={String(video.viewCount ?? 0)} />
                  <MetadataRow label={tc("lastPlayedAt")} value={formatDateTime(video.lastPlayedAt)} />
                  <MetadataRow label={tc("lastScanAt")} value={formatDateTime(video.lastScanAt)} />
                </div>
              </div>
            </div>
          </section>

          {video.actors && video.actors.length > 0 && (
            <section className="video-detail-actors-section">
              <div className="video-detail-section-heading">
                <span className="detail-label">{tc("actors")}</span>
              </div>
              <div className="video-detail-actor-strip">
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
            </section>
          )}

          <section className="video-detail-info-stack">
            <div className="video-detail-surface video-detail-path">
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
              <div className="video-detail-surface video-detail-weburl">
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
          </section>
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
