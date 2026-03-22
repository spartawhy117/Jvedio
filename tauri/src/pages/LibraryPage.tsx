/**
 * Library Page — Phase 3 full implementation + Phase 7.2 multi-select & batch ops.
 *
 * Spec: doc/UI/new/pages/library-page.md
 * - Video card grid from API
 * - QueryToolbar with search, refresh, sort
 * - Pagination
 * - Back navigation with state restoration
 * - SSE library.changed auto-refresh
 * - Multi-select with batch favorite / rescrape / delete
 * - Right-click: detail, play, openFolder, toggleFavorite, delete, copyVid
 */

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery, invalidateQueries } from "../hooks/useApiQuery";
import { useOnLibraryChanged } from "../hooks/useSSESubscription";
import { VideoCard } from "../components/shared/VideoCard";
import { QueryToolbar } from "../components/shared/QueryToolbar";
import { Pagination } from "../components/shared/Pagination";
import { ResultState } from "../components/shared/ResultState";
import { ResultSummary } from "../components/shared/ResultSummary";
import { VideoContextMenu, type ContextMenuAction } from "../components/shared/VideoContextMenu";
import { showToast } from "../components/GlobalToast";
import type { GetLibraryVideosResponse, VideoListItemDto } from "../api/types";
import "./pages.css";

const PAGE_SIZE = 30;

export function LibraryPage() {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { params, query, canGoBack, goBack, navigate, setQuery } = useRouter();
  const { libraries, bootstrap, refreshLibraries } = useBootstrap();

  const libraryId = params.libraryId ?? "";
  const library = libraries.find((l) => l.libraryId === libraryId);
  const baseUrl = bootstrap?.worker.baseUrl ?? "";

  // Localize sort options
  const sortOptions = useMemo(() => [
    { value: "vid_asc", label: t("page.sortVidAsc") },
    { value: "vid_desc", label: t("page.sortVidDesc") },
    { value: "releaseDate_asc", label: t("page.sortDateAsc") },
    { value: "releaseDate_desc", label: t("page.sortDateDesc") },
    { value: "importTime_asc", label: t("page.sortImportAsc") },
    { value: "importTime_desc", label: t("page.sortImportDesc") },
  ], [t]);

  // Query state from router
  const keyword = query.keyword ?? "";
  const sortBy = query.sortBy ?? "importTime";
  const sortOrder = query.sortOrder ?? "desc";
  const pageIndex = query.pageIndex ?? 0;
  const currentSort = `${sortBy}_${sortOrder}`;

  // Build query key for caching
  const queryKey = `libraries:${libraryId}:videos:${keyword}:${sortBy}:${sortOrder}:${pageIndex}`;

  // Fetch videos
  const videosQuery = useApiQuery<GetLibraryVideosResponse>({
    queryKey,
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.getLibraryVideos(libraryId, {
        keyword,
        sortBy,
        sortOrder,
        pageIndex,
        pageSize: PAGE_SIZE,
      });
    },
    enabled: !!libraryId,
    keepPreviousData: true,
  });

  // SSE: auto-refresh on library changes
  useOnLibraryChanged(() => {
    invalidateQueries(`libraries:${libraryId}`);
  });

  // ── Derived state ──────────────────────────────
  const data = videosQuery.data;
  const totalCount = data?.totalCount ?? 0;

  // ── Handlers ──────────────────────────────────────
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

  // ── Multi-select state ────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleVideoClick = useCallback((videoId: string) => {
    // In select mode, clicking toggles selection instead of navigation
    if (selectedIds.size > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(videoId)) next.delete(videoId);
        else next.add(videoId);
        return next;
      });
      return;
    }
    navigate("video-detail", { videoId }, { label: library?.name ?? t("page.title") });
  }, [navigate, library, t, selectedIds]);

  const handleSelect = useCallback((videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!data) return;
    setSelectedIds(new Set(data.items.map((v) => v.videoId)));
  }, [data]);

  const handleCancelSelect = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Single video operations ────────────────────────
  const handleToggleFavorite = useCallback(async (video: VideoListItemDto) => {
    const client = getApiClient();
    if (!client) return;
    try {
      const res = await client.toggleFavorite(video.videoId);
      showToast({
        message: res.isFavorite ? tc("favoriteSuccess") : tc("unfavoriteSuccess"),
        type: "success",
      });
      invalidateQueries(`libraries:${libraryId}`);
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [tc, libraryId]);

  const handleDeleteVideo = useCallback(async (video: VideoListItemDto) => {
    if (!confirm(tc("deleteVideoConfirm"))) return;
    const client = getApiClient();
    if (!client) return;
    try {
      await client.deleteVideo(video.videoId);
      showToast({ message: tc("deleteSuccess"), type: "success" });
      invalidateQueries(`libraries:${libraryId}`);
      void refreshLibraries();
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [tc, libraryId, refreshLibraries]);

  // ── Batch operations ───────────────────────────────
  const handleBatchFavorite = useCallback(async (favorite: boolean) => {
    const client = getApiClient();
    if (!client || selectedIds.size === 0) return;
    try {
      const res = await client.batchFavorite({ videoIds: Array.from(selectedIds) }, favorite);
      showToast({
        message: tc("batchSuccess", { success: res.successCount, failed: res.failedCount }),
        type: res.failedCount > 0 ? "warning" : "success",
      });
      setSelectedIds(new Set());
      invalidateQueries(`libraries:${libraryId}`);
      void refreshLibraries();
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc, libraryId, refreshLibraries]);

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
      invalidateQueries(`libraries:${libraryId}`);
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc, libraryId]);

  const handleBatchRescrape = useCallback(async () => {
    const client = getApiClient();
    if (!client || selectedIds.size === 0 || !libraryId) return;
    try {
      await client.startLibraryScrape(libraryId, {
        videoIds: Array.from(selectedIds),
        mode: "all",
        forceRefreshMetadata: true,
        writeSidecars: true,
        downloadActorAvatars: true,
      });
      showToast({ message: tc("rescrapeMetadata"), type: "success" });
      setSelectedIds(new Set());
      invalidateQueries(`libraries:${libraryId}`);
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc, libraryId]);

  // ── Context menu ────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    video: VideoListItemDto;
  } | null>(null);

  const handleContextMenu = useCallback((videoId: string, event: React.MouseEvent) => {
    const video = data?.items.find((v) => v.videoId === videoId);
    if (!video) return;
    setContextMenu({ x: event.clientX, y: event.clientY, video });
  }, [data]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const getContextMenuActions = useCallback((video: VideoListItemDto): ContextMenuAction[] => [
    {
      key: "detail",
      label: tc("viewDetail") || "查看详情",
      icon: "📋",
      onClick: () => navigate("video-detail", { videoId: video.videoId }, { label: library?.name ?? t("page.title") }),
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
      label: video.isFavorite ? tc("unfavorite") : tc("toggleFavorite"),
      icon: video.isFavorite ? "💔" : "❤",
      onClick: () => handleToggleFavorite(video),
    },
    {
      key: "rescrape",
      label: tc("rescrapeMetadata"),
      icon: "🔄",
      onClick: async () => {
        const client = getApiClient();
        if (!client || !libraryId) return;
        try {
          await client.startLibraryScrape(libraryId, {
            videoIds: [video.videoId],
            mode: "all",
            forceRefreshMetadata: true,
            writeSidecars: true,
            downloadActorAvatars: true,
          });
        } catch {
          // SSE library.changed will refresh the list; errors are silently ignored
          // as the task feedback comes through inline summary refresh
        }
      },
    },
    {
      key: "copyVid",
      label: tc("copyVid") || "复制 VID",
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
  ], [navigate, library, t, tc, handleToggleFavorite, handleDeleteVideo]);

  // ── Render ────────────────────────────────────────

  return (
    <div className="page-content-section page-content-wide">
      {/* Header with back button */}
      <div className="page-header">
        {canGoBack && (
          <button className="btn btn-icon" onClick={goBack} title={tc("back")}>
            ←
          </button>
        )}
        <h2 className="page-title">{library?.name || t("page.title")}</h2>
        {data && <ResultSummary totalCount={totalCount} />}
      </div>

      {/* Query toolbar */}
      <QueryToolbar
        keyword={keyword}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        sortOptions={sortOptions}
        currentSort={currentSort}
        onSortChange={handleSortChange}
        disabled={!libraryId}
      />

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <span className="batch-action-count">{tc("selectedCount", { count: selectedIds.size })}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleSelectAll}>{tc("selectAll")}</button>
          <button className="btn btn-sm btn-secondary" onClick={() => handleBatchFavorite(true)}>❤ {tc("batchFavorite")}</button>
          <button className="btn btn-sm btn-secondary" onClick={() => handleBatchFavorite(false)}>💔 {tc("batchUnfavorite")}</button>
          <button className="btn btn-sm btn-secondary" onClick={handleBatchRescrape}>🔄 {tc("rescrapeMetadata")}</button>
          <button className="btn btn-sm btn-danger" onClick={handleBatchDelete}>🗑 {tc("batchDelete")}</button>
          <div className="toolbar-spacer" />
          <button className="btn btn-sm btn-secondary" onClick={handleCancelSelect}>{tc("cancelSelect")}</button>
        </div>
      )}

      {/* Content */}
      {!libraryId ? (
        <ResultState type="empty" icon="❓" message={t("page.noLibrarySelected")} />
      ) : videosQuery.isLoading && !data ? (
        <ResultState type="loading" />
      ) : videosQuery.isError ? (
        <ResultState type="error" message={videosQuery.error?.message} />
      ) : data && data.items.length === 0 ? (
        <ResultState
          type="empty"
          icon="🎬"
          message={tc("noResults")}
          hint={t("page.emptyScanHint")}
        />
      ) : data ? (
        <div className="video-grid">
          {data.items.map((video) => (
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
      ) : null}

      {/* Pagination */}
      {data && totalCount > PAGE_SIZE && (
        <Pagination
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}

      {/* Context menu */}
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
