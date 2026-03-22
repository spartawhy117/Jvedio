/**
 * Actor Detail Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/actor-detail-page.md
 * - Actor profile header with avatar, name, metadata
 * - Associated videos grid from API
 * - QueryToolbar with search, sort, refresh
 * - Pagination
 * - Click to video-detail with backTo state
 * - Single-card context menu + multi-select batch actions for associated videos
 */

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery, invalidateQueries } from "../hooks/useApiQuery";
import { useVideoCardDisplaySettings } from "../hooks/useVideoCardDisplaySettings";
import { VideoCard } from "../components/shared/VideoCard";
import { BackNavigation } from "../components/shared/BackNavigation";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { QueryToolbar } from "../components/shared/QueryToolbar";
import { Pagination } from "../components/shared/Pagination";
import { ResultState } from "../components/shared/ResultState";
import { AppIcon } from "../components/shared/AppIcon";
import { VideoContextMenu, type ContextMenuAction } from "../components/shared/VideoContextMenu";
import { showToast } from "../components/GlobalToast";
import type {
  GetActorDetailResponse,
  GetActorVideosResponse,
  VideoListItemDto,
} from "../api/types";
import "./pages.css";

const PAGE_SIZE = 30;

export function ActorDetailPage() {
  const { t: tc } = useTranslation("common");
  const { t: tl } = useTranslation("library");
  const { params, query, navigate, setQuery } = useRouter();
  const { bootstrap, refreshLibraries } = useBootstrap();
  const { videoGridClassName } = useVideoCardDisplaySettings();

  const actorId = params.actorId ?? "";
  const baseUrl = bootstrap?.worker.baseUrl ?? "";

  // ── Fetch actor detail ──────────────────────────────
  const detailQuery = useApiQuery<GetActorDetailResponse>({
    queryKey: `actor:${actorId}`,
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.getActorDetail(actorId);
    },
    enabled: !!actorId,
  });

  // ── Query state from router (for associated videos) ─
  const keyword = query.keyword ?? "";
  const sortBy = query.sortBy ?? "vid";
  const sortOrder = query.sortOrder ?? "asc";
  const pageIndex = query.pageIndex ?? 0;
  const currentSort = `${sortBy}_${sortOrder}`;

  // Sort options — reuse library page sort options
  const sortOptions = useMemo(() => [
    { value: "vid_asc", label: tl("page.sortVidAsc") },
    { value: "vid_desc", label: tl("page.sortVidDesc") },
    { value: "releaseDate_asc", label: tl("page.sortDateAsc") },
    { value: "releaseDate_desc", label: tl("page.sortDateDesc") },
    { value: "importTime_asc", label: tl("page.sortImportAsc") },
    { value: "importTime_desc", label: tl("page.sortImportDesc") },
  ], [tl]);

  // ── Fetch associated videos ─────────────────────────
  const videosQueryKey = `actor:${actorId}:videos:${keyword}:${sortBy}:${sortOrder}:${pageIndex}`;
  const videosQuery = useApiQuery<GetActorVideosResponse>({
    queryKey: videosQueryKey,
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.getActorVideos(actorId, {
        keyword,
        sortBy,
        sortOrder,
        pageIndex,
        pageSize: PAGE_SIZE,
      });
    },
    enabled: !!actorId,
    keepPreviousData: true,
  });

  // ── Handlers ────────────────────────────────────────
  const handleSearch = useCallback((kw: string) => {
    setQuery({ keyword: kw, pageIndex: 0 });
  }, [setQuery]);

  const handleSortChange = useCallback((value: string) => {
    const [sb, so] = value.split("_");
    setQuery({ sortBy: sb, sortOrder: so, pageIndex: 0 });
  }, [setQuery]);

  const handlePageChange = useCallback((pi: number) => {
    setQuery({ pageIndex: pi });
  }, [setQuery]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<VideoListItemDto | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    video: VideoListItemDto;
  } | null>(null);

  const actor = detailQuery.data?.actor;
  const videosData = videosQuery.data;
  const videoItems: VideoListItemDto[] = (videosData?.items ?? []).map((video) => ({
    videoId: video.videoId,
    vid: video.vid,
    title: video.title,
    displayTitle: video.displayTitle,
    path: video.path,
    libraryId: video.libraryId,
    firstAddedAt: video.firstAddedAt,
    scrapeStatus: "none",
    releaseDate: video.releaseDate,
    durationSeconds: video.durationSeconds,
    rating: video.rating,
    viewCount: video.viewCount,
    isFavorite: false,
    lastPlayedAt: video.lastPlayedAt,
    lastScanAt: video.lastScanAt,
    hasPoster: video.hasPoster,
    hasThumb: video.hasThumb,
    hasFanart: video.hasFanart,
    hasNfo: video.hasNfo,
    hasMissingAssets: video.hasMissingAssets,
  }));

  const avatarUrl = actor?.avatarPath && baseUrl
    ? `${baseUrl}/api/actors/${encodeURIComponent(actorId)}/avatar`
    : null;

  const handleVideoClick = useCallback((videoId: string) => {
    if (selectedIds.size > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(videoId)) next.delete(videoId);
        else next.add(videoId);
        return next;
      });
      return;
    }
    navigate("video-detail", { videoId }, { label: tc("actors") });
  }, [navigate, tc, selectedIds]);

  const handleSelect = useCallback((videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }, []);

  const handleCancelSelect = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(videoItems.map((video) => video.videoId)));
  }, [videoItems]);

  const refreshActorVideos = useCallback(() => {
    invalidateQueries(`actor:${actorId}`);
    invalidateQueries(`actor:${actorId}:videos`);
  }, [actorId]);

  const handleToggleFavorite = useCallback(async (video: VideoListItemDto) => {
    const client = getApiClient();
    if (!client) return;
    try {
      const res = await client.toggleFavorite(video.videoId);
      showToast({
        message: res.isFavorite ? tc("favoriteSuccess") : tc("unfavoriteSuccess"),
        type: "success",
      });
      refreshActorVideos();
      invalidateQueries("favorites");
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [tc, refreshActorVideos]);

  const handleDeleteVideo = useCallback(async (video: VideoListItemDto) => {
    setDeleteTarget(video);
  }, [tc]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const client = getApiClient();
    if (!client) return;
    try {
      await client.deleteVideo(deleteTarget.videoId, true);
      showToast({ message: tc("deleteSuccess"), type: "success" });
      refreshActorVideos();
      invalidateQueries("favorites");
      void refreshLibraries();
      setDeleteTarget(null);
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [deleteTarget, tc, refreshActorVideos, refreshLibraries]);

  const handleBatchFavorite = useCallback(async () => {
    const client = getApiClient();
    if (!client || selectedIds.size === 0) return;
    try {
      const res = await client.batchFavorite({ videoIds: Array.from(selectedIds) }, true);
      showToast({
        message: tc("batchSuccess", { success: res.successCount, failed: res.failedCount }),
        type: res.failedCount > 0 ? "warning" : "success",
      });
      setSelectedIds(new Set());
      refreshActorVideos();
      invalidateQueries("favorites");
      void refreshLibraries();
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc, refreshActorVideos, refreshLibraries]);

  const handleBatchRescrape = useCallback(async () => {
    const client = getApiClient();
    if (!client || selectedIds.size === 0) return;

    const selectedVideos = videoItems.filter((video) => selectedIds.has(video.videoId));
    const videoIdsByLibrary = new Map<string, string[]>();
    for (const video of selectedVideos) {
      const existing = videoIdsByLibrary.get(video.libraryId);
      if (existing) {
        existing.push(video.videoId);
      } else {
        videoIdsByLibrary.set(video.libraryId, [video.videoId]);
      }
    }

    try {
      await Promise.all(Array.from(videoIdsByLibrary.entries()).map(([libraryId, videoIds]) =>
        client.startLibraryScrape(libraryId, {
          videoIds,
          mode: "all",
          forceRefreshMetadata: true,
          writeSidecars: true,
          downloadActorAvatars: true,
        })
      ));
      showToast({ message: tc("rescrapeMetadata"), type: "success" });
      setSelectedIds(new Set());
      refreshActorVideos();
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, videoItems, tc, refreshActorVideos]);

  const handleBatchDelete = useCallback(async () => {
    setBatchDeleteOpen(true);
  }, [selectedIds.size]);

  const handleBatchDeleteConfirm = useCallback(async () => {
    const client = getApiClient();
    if (!client || selectedIds.size === 0) return;
    try {
      const res = await client.batchDelete({ videoIds: Array.from(selectedIds) }, true);
      showToast({
        message: tc("batchSuccess", { success: res.successCount, failed: res.failedCount }),
        type: res.failedCount > 0 ? "warning" : "success",
      });
      setSelectedIds(new Set());
      refreshActorVideos();
      invalidateQueries("favorites");
      void refreshLibraries();
      setBatchDeleteOpen(false);
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc, refreshActorVideos, refreshLibraries]);

  const handleContextMenu = useCallback((videoId: string, event: React.MouseEvent) => {
    const video = videoItems.find((item) => item.videoId === videoId);
    if (!video) return;
    setContextMenu({ x: event.clientX, y: event.clientY, video });
  }, [videoItems]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const getContextMenuActions = useCallback((video: VideoListItemDto): ContextMenuAction[] => [
    {
      key: "detail",
      label: tc("viewDetail"),
      icon: "detail",
      onClick: () => handleVideoClick(video.videoId),
    },
    {
      key: "play",
      label: tc("play"),
      icon: "play",
      onClick: async () => {
        const client = getApiClient();
        if (!client) return;
        try {
          await client.playVideo(video.videoId);
          showToast({ message: tc("playSuccess"), type: "success" });
        } catch (err) {
          showToast({ message: `${tc("playFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
      },
    },
    {
      key: "openFolder",
      label: tc("openFolder"),
      icon: "folder",
      onClick: async () => {
        if (!video.path) return;
        try {
          await revealItemInDir(video.path);
        } catch (err) {
          showToast({ message: `${tc("openFolder")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
      },
      disabled: !video.path,
    },
    {
      key: "toggleFavorite",
      label: tc("toggleFavorite"),
      icon: "favorite",
      onClick: () => handleToggleFavorite(video),
    },
    {
      key: "rescrape",
      label: tc("rescrapeMetadata"),
      icon: "rescrape",
      onClick: async () => {
        const client = getApiClient();
        if (!client || !video.libraryId) return;
        try {
          await client.startLibraryScrape(video.libraryId, {
            videoIds: [video.videoId],
            mode: "all",
            forceRefreshMetadata: true,
            writeSidecars: true,
            downloadActorAvatars: true,
          });
        } catch {
          // SSE / query refresh will carry the updated task state
        }
      },
    },
    {
      key: "copyVid",
      label: tc("copyVid"),
      icon: "copy",
      onClick: () => {
        navigator.clipboard.writeText(video.vid).catch(() => {});
        showToast({ message: `VID ${video.vid} 已复制`, type: "success" });
      },
    },
    {
      key: "delete",
      label: tc("deleteVideo"),
      icon: "delete",
      danger: true,
      onClick: () => handleDeleteVideo(video),
    },
  ], [tc, handleVideoClick, handleToggleFavorite, handleDeleteVideo]);

  // ── Render ──────────────────────────────────────────
  if (detailQuery.isLoading && !actor) {
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

  if (!actor) {
    return (
      <div className="page-content-section">
        <div className="page-readable-content page-activity-shell">
          <div className="page-back-row">
            <BackNavigation />
          </div>
          <ResultState type="empty" icon={<AppIcon name="actors" size={40} />} message={tc("noData")} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content-section page-content-wide">
      <div className="page-activity-shell">
        <div className="page-back-row">
          <BackNavigation />
        </div>

        <div className="page-activity-body">
          <div className="actor-detail-header">
            <div className="actor-detail-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={actor.name} loading="lazy" />
              ) : (
                <div className="actor-detail-no-avatar"><AppIcon name="actors" size={40} /></div>
              )}
            </div>
            <div className="actor-detail-info">
              <h3 className="actor-detail-name">{actor.name}</h3>
              <div className="metadata-grid">
                <MetadataRow label={tc("videoCount")} value={String(actor.videoCount)} />
                {actor.libraryNames.length > 0 && (
                  <MetadataRow label={tc("libraryName")} value={actor.libraryNames.join(", ")} />
                )}
              </div>
            </div>
          </div>

          <h3 className="section-heading">
            {tc("associatedVideos")}
          </h3>

          <QueryToolbar
            keyword={keyword}
            onSearch={handleSearch}
            sortOptions={sortOptions}
            currentSort={currentSort}
            onSortChange={handleSortChange}
          />

          {selectedIds.size > 0 && (
            <div className="batch-action-bar">
              <span className="batch-action-count">{tc("selectedCount", { count: selectedIds.size })}</span>
              <button className="btn btn-sm btn-secondary" onClick={handleSelectAll}>{tc("selectAll")}</button>
              <button className="btn btn-sm btn-secondary" onClick={handleBatchFavorite}><AppIcon name="favorite" size={14} /> {tc("batchFavorite")}</button>
              <button className="btn btn-sm btn-secondary" onClick={handleBatchRescrape}><AppIcon name="rescrape" size={14} /> {tc("rescrapeMetadata")}</button>
              <button className="btn btn-sm btn-danger" onClick={handleBatchDelete}><AppIcon name="delete" size={14} /> {tc("batchDelete")}</button>
              <div className="toolbar-spacer" />
              <button className="btn btn-sm btn-secondary" onClick={handleCancelSelect}>{tc("cancelSelect")}</button>
            </div>
          )}

          {videosQuery.isLoading && !videosData ? (
            <ResultState type="loading" />
          ) : videosQuery.isError ? (
            <ResultState type="error" message={videosQuery.error?.message} />
          ) : videoItems.length === 0 ? (
            <ResultState type="empty" icon={<AppIcon name="brand" size={40} />} message={tc("noResults")} />
          ) : (
            <div className={`video-grid ${videoGridClassName}`}>
              {videoItems.map((video) => (
                <VideoCard
                  key={video.videoId}
                  video={video}
                  selected={selectedIds.has(video.videoId)}
                  onSelect={handleSelect}
                  onClick={handleVideoClick}
                  onContextMenu={handleContextMenu}
                  baseUrl={baseUrl}
                />
              ))}
            </div>
          )}
        </div>

        <div className="page-activity-footer">
          {videosData && videosData.totalCount > 0 && (
            <Pagination
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
              totalCount={videosData.totalCount}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {contextMenu && (
          <VideoContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={getContextMenuActions(contextMenu.video)}
            onClose={closeContextMenu}
          />
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title={tc("deleteVideoConfirmTitle")}
          message={tc("deleteVideoConfirm")}
          details={deleteTarget ? (
            <>
              <div className="dialog-detail-row">
                <span className="dialog-detail-label">{tc("vid")}</span>
                <span className="dialog-detail-value">{deleteTarget.vid}</span>
              </div>
              <div className="dialog-detail-row">
                <span className="dialog-detail-label">{tc("filePath")}</span>
                <span className="dialog-detail-value">{deleteTarget.path}</span>
              </div>
            </>
          ) : null}
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />

        <ConfirmDialog
          open={batchDeleteOpen}
          title={tc("deleteVideoConfirmTitle")}
          message={tc("batchDeleteConfirm", { count: selectedIds.size })}
          details={
            <div className="dialog-detail-row">
              <span className="dialog-detail-label">{tc("selectedCount", { count: selectedIds.size })}</span>
              <span className="dialog-detail-value">{tc("deleteOriginalAndMetadata")}</span>
            </div>
          }
          danger
          onConfirm={handleBatchDeleteConfirm}
          onCancel={() => setBatchDeleteOpen(false)}
        />
      </div>
    </div>
  );
}

// ── Helper component ────────────────────────────────────

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-row">
      <span className="metadata-label">{label}</span>
      <span className="metadata-value">{value}</span>
    </div>
  );
}
