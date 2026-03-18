/**
 * Library Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/library-page.md
 * - Video card grid from API
 * - QueryToolbar with search, refresh, sort
 * - Pagination
 * - Back navigation with state restoration
 * - SSE library.changed auto-refresh
 */

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { useOnLibraryChanged } from "../hooks/useSSESubscription";
import { invalidateQueries } from "../hooks/useApiQuery";
import { VideoCard } from "../components/shared/VideoCard";
import { QueryToolbar } from "../components/shared/QueryToolbar";
import { Pagination } from "../components/shared/Pagination";
import { ResultState } from "../components/shared/ResultState";
import type { GetLibraryVideosResponse } from "../api/types";
import "./pages.css";

const PAGE_SIZE = 30;

const SORT_OPTIONS = [
  { value: "vid_asc", label: "" },
  { value: "vid_desc", label: "" },
  { value: "releaseDate_asc", label: "" },
  { value: "releaseDate_desc", label: "" },
  { value: "importTime_asc", label: "" },
  { value: "importTime_desc", label: "" },
];

export function LibraryPage() {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { params, query, canGoBack, goBack, navigate, setQuery } = useRouter();
  const { libraries, bootstrap } = useBootstrap();

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

  // Suppress unused
  void SORT_OPTIONS;

  // Query state from router
  const keyword = query.keyword ?? "";
  const sortBy = query.sortBy ?? "vid";
  const sortOrder = query.sortOrder ?? "asc";
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

  const handleVideoClick = useCallback((videoId: string) => {
    navigate("video-detail", { videoId }, { label: library?.name ?? t("page.title") });
  }, [navigate, library, t]);

  // ── Render ────────────────────────────────────────
  const data = videosQuery.data;
  const totalCount = data?.totalCount ?? 0;

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
        {data && (
          <span className="page-count">{tc("totalCount", { count: totalCount })}</span>
        )}
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
              onClick={handleVideoClick}
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
    </div>
  );
}
