/**
 * Favorites Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/favorites-page.md
 * - Favorite video card grid from API
 * - QueryToolbar with search, refresh, sort
 * - Pagination
 * - Click to video detail with backTo state
 */

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
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

  const handleVideoClick = useCallback((videoId: string) => {
    navigate("video-detail", { videoId }, { label: t("favorites") });
  }, [navigate, t]);

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
      key: "copyVid",
      label: tc("copyVid") || "复制 VID",
      icon: "📎",
      onClick: () => {
        navigator.clipboard.writeText(video.vid).catch(() => {});
        showToast({ message: `VID ${video.vid} 已复制`, type: "success" });
      },
    },
  ], [navigate, t, tc]);

  // ── Render ────────────────────────────────────────
  const data = favQuery.data;
  const totalCount = data?.totalCount ?? 0;

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
