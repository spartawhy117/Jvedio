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
import { VideoCard } from "../components/shared/VideoCard";
import { QueryToolbar } from "../components/shared/QueryToolbar";
import { Pagination } from "../components/shared/Pagination";
import { ResultState } from "../components/shared/ResultState";
import { ResultSummary } from "../components/shared/ResultSummary";
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
  const { params, query, canGoBack, goBack, navigate, setQuery } = useRouter();
  const { bootstrap, refreshLibraries } = useBootstrap();

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
    { value: "lastScanAt_asc", label: tl("page.sortImportAsc") },
    { value: "lastScanAt_desc", label: tl("page.sortImportDesc") },
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

  const handleRefresh = useCallback(() => {
    videosQuery.refetch();
  }, [videosQuery]);

  const handleSortChange = useCallback((value: string) => {
    const [sb, so] = value.split("_");
    setQuery({ sortBy: sb, sortOrder: so, pageIndex: 0 });
  }, [setQuery]);

  const handlePageChange = useCallback((pi: number) => {
    setQuery({ pageIndex: pi });
  }, [setQuery]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    video: VideoListItemDto;
  } | null>(null);

  const actor = detailQuery.data?.actor;
  const videosData = videosQuery.data;
  const totalCount = videosData?.totalCount ?? 0;
  const videoItems: VideoListItemDto[] = (videosData?.items ?? []).map((video) => ({
    videoId: video.videoId,
    vid: video.vid,
    title: video.title,
    displayTitle: video.displayTitle,
    path: video.path,
    libraryId: video.libraryId,
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
    navigate("video-detail", { videoId }, { label: actor?.name ?? "Actor" });
  }, [navigate, actor?.name, selectedIds]);

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
    if (!confirm(tc("deleteVideoConfirm"))) return;
    const client = getApiClient();
    if (!client) return;
    try {
      await client.deleteVideo(video.videoId);
      showToast({ message: tc("deleteSuccess"), type: "success" });
      refreshActorVideos();
      invalidateQueries("favorites");
      void refreshLibraries();
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [tc, refreshActorVideos, refreshLibraries]);

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
    if (!confirm(tc("batchDeleteConfirm", { count: selectedIds.size }))) return;
    const client = getApiClient();
    if (!client || selectedIds.size === 0) return;
    try {
      const res = await client.batchDelete({ videoIds: Array.from(selectedIds) });
      showToast({
        message: tc("batchSuccess", { success: res.successCount, failed: res.failedCount }),
        type: res.failedCount > 0 ? "warning" : "success",
      });
      setSelectedIds(new Set());
      refreshActorVideos();
      invalidateQueries("favorites");
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc, refreshActorVideos]);

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
      icon: "📋",
      onClick: () => handleVideoClick(video.videoId),
    },
    {
      key: "play",
      label: tc("play"),
      icon: "▶",
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
      icon: "📂",
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
      icon: "❤",
      onClick: () => handleToggleFavorite(video),
    },
    {
      key: "rescrape",
      label: tc("rescrapeMetadata"),
      icon: "🔄",
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
      icon: "📎",
      onClick: () => {
        navigator.clipboard.writeText(video.vid).catch(() => {});
        showToast({ message: `VID ${video.vid} 已复制`, type: "success" });
      },
    },
    {
      key: "delete",
      label: tc("deleteVideo"),
      icon: "🗑",
      danger: true,
      onClick: () => handleDeleteVideo(video),
    },
  ], [tc, handleVideoClick, handleToggleFavorite, handleDeleteVideo]);

  // ── Render ──────────────────────────────────────────
  if (detailQuery.isLoading && !actor) {
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
          <h2 className="page-title">{tc("actorId")}</h2>
        </div>
        <ResultState type="error" message={detailQuery.error?.message} />
      </div>
    );
  }

  if (!actor) {
    return (
      <div className="page-content-section">
        <div className="page-header">
          {canGoBack && (
            <button className="btn btn-icon" onClick={goBack} title={tc("back")}>←</button>
          )}
          <h2 className="page-title">{tc("actorId")}</h2>
        </div>
        <ResultState type="empty" icon="👤" message={tc("noData")} />
      </div>
    );
  }

  return (
    <div className="page-content-section page-content-wide">
      {/* Header with back button */}
      <div className="page-header">
        {canGoBack && (
          <button className="btn btn-icon" onClick={goBack} title={tc("back")}>←</button>
        )}
        <h2 className="page-title">{actor.name}</h2>
      </div>

      {/* Actor profile header */}
      <div className="actor-detail-header">
        <div className="actor-detail-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={actor.name} loading="lazy" />
          ) : (
            <div className="actor-detail-no-avatar">👤</div>
          )}
        </div>
        <div className="actor-detail-info">
          <h3 className="actor-detail-name">{actor.name}</h3>
          <div className="metadata-grid">
            <MetadataRow label={tc("actorId")} value={actor.actorId} />
            <MetadataRow label={tc("videoCount")} value={String(actor.videoCount)} />
            {actor.libraryNames.length > 0 && (
              <MetadataRow label={tc("libraryName")} value={actor.libraryNames.join(", ")} />
            )}
            {actor.webUrl && (
              <div className="metadata-row">
                <span className="metadata-label">{tc("webUrl")}</span>
                <a
                  className="weburl-link metadata-value"
                  href={actor.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {actor.webUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Associated videos section */}
      <h3 className="section-heading">
        {tc("associatedVideos")}
        {videosData && <ResultSummary totalCount={totalCount} />}
      </h3>

      <QueryToolbar
        keyword={keyword}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        sortOptions={sortOptions}
        currentSort={currentSort}
        onSortChange={handleSortChange}
      />

      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <span className="batch-action-count">{tc("selectedCount", { count: selectedIds.size })}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleSelectAll}>{tc("selectAll")}</button>
          <button className="btn btn-sm btn-secondary" onClick={handleBatchFavorite}>❤ {tc("batchFavorite")}</button>
          <button className="btn btn-sm btn-secondary" onClick={handleBatchRescrape}>🔄 {tc("rescrapeMetadata")}</button>
          <button className="btn btn-sm btn-danger" onClick={handleBatchDelete}>🗑 {tc("batchDelete")}</button>
          <div className="toolbar-spacer" />
          <button className="btn btn-sm btn-secondary" onClick={handleCancelSelect}>{tc("cancelSelect")}</button>
        </div>
      )}

      {videosQuery.isLoading && !videosData ? (
        <ResultState type="loading" />
      ) : videosQuery.isError ? (
        <ResultState type="error" message={videosQuery.error?.message} />
      ) : videoItems.length === 0 ? (
        <ResultState type="empty" icon="🎬" message={tc("noResults")} />
      ) : (
        <div className="video-grid">
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

      {videosData && totalCount > PAGE_SIZE && (
        <Pagination
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}

      {contextMenu && (
        <VideoContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={getContextMenuActions(contextMenu.video)}
          onClose={closeContextMenu}
        />
      )}
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
