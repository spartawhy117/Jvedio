/**
 * Favorites Page — Phase 3 full implementation + Phase 7.2 multi-select & batch ops.
 *
 * Spec: doc/UI/new/pages/favorites-page.md
 * - Favorite video card grid from API
 * - QueryToolbar with search, refresh, sort
 * - Pagination
 * - Click to video detail with backTo state
 * - Multi-select with batch unfavorite / delete
 * - Right-click: detail, play, openFolder, unfavorite, delete, copyVid
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
import type { GetFavoriteVideosResponse, VideoListItemDto } from "../api/types";
import "./pages.css";

const PAGE_SIZE = 30;

export function FavoritesPage() {
  const { t } = useTranslation("navigation");
  const { t: tl } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { query, navigate, setQuery } = useRouter();
  const { bootstrap } = useBootstrap();

  const baseUrl = bootstrap?.worker.baseUrl ?? "";

  // Sort options
  const sortOptions = useMemo(() => [
    { value: "vid_asc", label: tl("page.sortVidAsc") },
    { value: "vid_desc", label: tl("page.sortVidDesc") },
    { value: "releaseDate_asc", label: tl("page.sortDateAsc") },
    { value: "releaseDate_desc", label: tl("page.sortDateDesc") },
    { value: "importTime_asc", label: tl("page.sortImportAsc") },
    { value: "importTime_desc", label: tl("page.sortImportDesc") },
  ], [tl]);

  // Query state from router
  const keyword = query.keyword ?? "";
  const sortBy = query.sortBy ?? "vid";
  const sortOrder = query.sortOrder ?? "asc";
  const pageIndex = query.pageIndex ?? 0;
  const currentSort = `${sortBy}_${sortOrder}`;

  // Fetch favorites
  const queryKey = `favorites:${keyword}:${sortBy}:${sortOrder}:${pageIndex}`;
  const favQuery = useApiQuery<GetFavoriteVideosResponse>({
    queryKey,
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.getFavoriteVideos({
        keyword,
        sortBy,
        sortOrder,
        pageIndex,
        pageSize: PAGE_SIZE,
      });
    },
    keepPreviousData: true,
  });

  // ── Derived state ──────────────────────────────
  const data = favQuery.data;
  const totalCount = data?.totalCount ?? 0;

  // ── Handlers ──────────────────────────────────────
  const handleSearch = useCallback((kw: string) => {
    setQuery({ keyword: kw, pageIndex: 0 });
  }, [setQuery]);

  const handleRefresh = useCallback(() => {
    favQuery.refetch();
  }, [favQuery]);

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
    navigate("video-detail", { videoId }, { label: t("favorites") });
  }, [navigate, t, selectedIds]);

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
      invalidateQueries("favorites");
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [tc]);

  const handleDeleteVideo = useCallback(async (video: VideoListItemDto) => {
    if (!confirm(tc("deleteVideoConfirm"))) return;
    const client = getApiClient();
    if (!client) return;
    try {
      await client.deleteVideo(video.videoId);
      showToast({ message: tc("deleteSuccess"), type: "success" });
      invalidateQueries("favorites");
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [tc]);

  // ── Batch operations ───────────────────────────────
  const handleBatchUnfavorite = useCallback(async () => {
    const client = getApiClient();
    if (!client || selectedIds.size === 0) return;
    try {
      const res = await client.batchFavorite({ videoIds: Array.from(selectedIds) }, false);
      showToast({
        message: tc("batchSuccess", { success: res.successCount, failed: res.failedCount }),
        type: res.failedCount > 0 ? "warning" : "success",
      });
      setSelectedIds(new Set());
      invalidateQueries("favorites");
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc]);

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
      invalidateQueries("favorites");
    } catch (err) {
      showToast({ message: `${tc("operationFailed")}: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    }
  }, [selectedIds, tc]);

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
      onClick: () => navigate("video-detail", { videoId: video.videoId }, { label: t("favorites") }),
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
      key: "unfavorite",
      label: tc("unfavorite"),
      icon: "💔",
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
          // SSE library.changed will refresh the list
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
  ], [navigate, t, tc, handleToggleFavorite, handleDeleteVideo]);

  // ── Render ────────────────────────────────────────

  return (
    <div className="page-content-section page-content-wide">
      <div className="page-header">
        <h2 className="page-title">{t("favorites")}</h2>
        {data && <ResultSummary totalCount={totalCount} />}
      </div>

      <QueryToolbar
        keyword={keyword}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        sortOptions={sortOptions}
        currentSort={currentSort}
        onSortChange={handleSortChange}
      />

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <span className="batch-action-count">{tc("selectedCount", { count: selectedIds.size })}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleSelectAll}>{tc("selectAll")}</button>
          <button className="btn btn-sm btn-secondary" onClick={handleBatchUnfavorite}>💔 {tc("batchUnfavorite")}</button>
          <button className="btn btn-sm btn-danger" onClick={handleBatchDelete}>🗑 {tc("batchDelete")}</button>
          <div className="toolbar-spacer" />
          <button className="btn btn-sm btn-secondary" onClick={handleCancelSelect}>{tc("cancelSelect")}</button>
        </div>
      )}

      {favQuery.isLoading && !data ? (
        <ResultState type="loading" />
      ) : favQuery.isError ? (
        <ResultState type="error" message={favQuery.error?.message} />
      ) : data && data.items.length === 0 ? (
        <ResultState type="empty" icon="❤" message={tc("noResults")} />
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
