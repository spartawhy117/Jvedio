/**
 * Favorites Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/favorites-page.md
 * - Favorite video card grid from API
 * - QueryToolbar with search, refresh, sort
 * - Pagination
 * - Click to video detail with backTo state
 */

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { VideoCard } from "../components/shared/VideoCard";
import { QueryToolbar } from "../components/shared/QueryToolbar";
import { Pagination } from "../components/shared/Pagination";
import { ResultState } from "../components/shared/ResultState";
import type { GetFavoriteVideosResponse } from "../api/types";
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

  // ── Render ────────────────────────────────────────
  const data = favQuery.data;
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="page-content-section page-content-wide">
      <div className="page-header">
        <h2 className="page-title">{t("favorites")}</h2>
        {data && (
          <span className="page-count">{tc("totalCount", { count: totalCount })}</span>
        )}
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
    </div>
  );
}
