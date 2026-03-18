/**
 * Actor Detail Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/actor-detail-page.md
 * - Actor profile header with avatar, name, metadata
 * - Associated videos grid from API
 * - QueryToolbar with search, sort, refresh
 * - Pagination
 * - Click to video-detail with backTo state
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
import { ResultSummary } from "../components/shared/ResultSummary";
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
  const { bootstrap } = useBootstrap();

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

  const handleVideoClick = useCallback((videoId: string) => {
    const actor = detailQuery.data?.actor;
    navigate("video-detail", { videoId }, { label: actor?.name ?? "Actor" });
  }, [navigate, detailQuery.data]);

  // ── Render ──────────────────────────────────────────
  const actor = detailQuery.data?.actor;
  const videosData = videosQuery.data;
  const totalCount = videosData?.totalCount ?? 0;

  const avatarUrl = actor?.avatarPath && baseUrl
    ? `${baseUrl}/api/actors/${encodeURIComponent(actorId)}/avatar`
    : null;

  // Loading state — show only on initial load
  if (detailQuery.isLoading && !actor) {
    return (
      <div className="page-content-section">
        <ResultState type="loading" />
      </div>
    );
  }

  // Error state
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

  // No actor found
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

  // Map ActorVideoListItemDto → VideoListItemDto for VideoCard
  const videoItems: VideoListItemDto[] = (videosData?.items ?? []).map((v) => ({
    videoId: v.videoId,
    vid: v.vid,
    title: v.title,
    displayTitle: v.displayTitle,
    path: v.path,
    libraryId: v.libraryId,
    releaseDate: v.releaseDate,
    durationSeconds: v.durationSeconds,
    rating: v.rating,
    viewCount: v.viewCount,
    lastPlayedAt: v.lastPlayedAt,
    lastScanAt: v.lastScanAt,
    hasPoster: v.hasPoster,
    hasThumb: v.hasThumb,
    hasFanart: v.hasFanart,
    hasNfo: v.hasNfo,
    hasMissingAssets: v.hasMissingAssets,
  }));

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
              onClick={handleVideoClick}
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
