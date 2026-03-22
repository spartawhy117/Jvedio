/**
 * Actors Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/actors-page.md
 * - Actor card grid from API
 * - QueryToolbar with search, refresh, sort
 * - Pagination
 * - Click to actor detail with backTo state
 */

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { ActorCard } from "../components/shared/ActorCard";
import { QueryToolbar } from "../components/shared/QueryToolbar";
import { Pagination } from "../components/shared/Pagination";
import { ResultState } from "../components/shared/ResultState";
import { AppIcon } from "../components/shared/AppIcon";
import type { GetActorsResponse } from "../api/types";
import "./pages.css";

const PAGE_SIZE = 40;

export function ActorsPage() {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const { query, navigate, setQuery } = useRouter();
  const { bootstrap } = useBootstrap();

  const baseUrl = bootstrap?.worker.baseUrl ?? "";

  // Sort options
  const sortOptions = useMemo(() => [
    { value: "name_asc", label: `${tc("actorName")} ${tc("asc")}` },
    { value: "name_desc", label: `${tc("actorName")} ${tc("desc")}` },
    { value: "videoCount_asc", label: `${tc("videoCount")} ${tc("asc")}` },
    { value: "videoCount_desc", label: `${tc("videoCount")} ${tc("desc")}` },
  ], [tc]);

  // Query state from router
  const keyword = query.keyword ?? "";
  const sortBy = query.sortBy ?? "name";
  const sortOrder = query.sortOrder ?? "asc";
  const pageIndex = query.pageIndex ?? 0;
  const currentSort = `${sortBy}_${sortOrder}`;

  // Fetch actors
  const queryKey = `actors:${keyword}:${sortBy}:${sortOrder}:${pageIndex}`;
  const actorsQuery = useApiQuery<GetActorsResponse>({
    queryKey,
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.getActors({
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

  const handleSortChange = useCallback((value: string) => {
    const [sb, so] = value.split("_");
    setQuery({ sortBy: sb, sortOrder: so, pageIndex: 0 });
  }, [setQuery]);

  const handlePageChange = useCallback((pi: number) => {
    setQuery({ pageIndex: pi });
  }, [setQuery]);

  const handleActorClick = useCallback((actorId: string) => {
    navigate("actor-detail", { actorId }, { label: t("actors") });
  }, [navigate, t]);

  // ── Render ────────────────────────────────────────
  const data = actorsQuery.data;

  return (
    <div className="page-content-section page-content-wide">
      <div className="page-activity-shell">
        <div className="page-header-stack">
          <div className="page-title-row">
            <h2 className="page-title">{t("actors")}</h2>
          </div>

          <QueryToolbar
            keyword={keyword}
            onSearch={handleSearch}
            sortOptions={sortOptions}
            currentSort={currentSort}
            onSortChange={handleSortChange}
          />
        </div>

        <div className="page-activity-body">
          {actorsQuery.isLoading && !data ? (
            <ResultState type="loading" />
          ) : actorsQuery.isError ? (
            <ResultState type="error" message={actorsQuery.error?.message} />
          ) : data && data.items.length === 0 ? (
            <ResultState type="empty" icon={<AppIcon name="actors" size={40} />} message={tc("noResults")} />
          ) : data ? (
            <div className="actor-grid">
              {data.items.map((actor) => (
                <ActorCard
                  key={actor.actorId}
                  actor={actor}
                  onClick={handleActorClick}
                  baseUrl={baseUrl}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="page-activity-footer">
          {data && data.totalCount > 0 && (
            <Pagination
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
              totalCount={data.totalCount}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
