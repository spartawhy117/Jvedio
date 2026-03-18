/**
 * Router — lightweight client-side router for the Tauri shell.
 *
 * No external dependency (react-router); uses a simple state-based approach
 * since the app is a single-window desktop application, not a browser SPA.
 *
 * Supports:
 * - Page navigation with params
 * - Back navigation with state restoration (backTo)
 * - Navigation history for breadcrumb-style returns
 */

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";

// ── Route definitions ───────────────────────────────────
// 1:1 with doc/UI/new/page-index.md

export type PageKey =
  | "settings"
  | "library-management"
  | "library"
  | "favorites"
  | "actors"
  | "actor-detail"
  | "video-detail";

export interface RouteParams {
  /** Active library ID (for library page) */
  libraryId?: string;
  /** Active video ID (for video-detail page) */
  videoId?: string;
  /** Active actor ID (for actor-detail page) */
  actorId?: string;
}

/** Saved query state for result pages (filter, sort, pagination) */
export interface QueryState {
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
  pageIndex?: number;
  pageSize?: number;
}

/** A navigation entry in the history stack */
export interface NavEntry {
  page: PageKey;
  params: RouteParams;
  query?: QueryState;
  /** Label for display in breadcrumbs or back button */
  label?: string;
}

// ── Router context ──────────────────────────────────────

export interface RouterContextValue {
  /** Current active page */
  currentPage: PageKey;
  /** Current route params */
  params: RouteParams;
  /** Current query state for the active page */
  query: QueryState;
  /** Navigation history (most recent = last) */
  history: NavEntry[];

  /** Navigate to a page (pushes current to history) */
  navigate: (page: PageKey, params?: RouteParams, opts?: NavigateOptions) => void;
  /** Go back to previous page (pops history) */
  goBack: () => void;
  /** Check if there's a previous page to go back to */
  canGoBack: boolean;
  /** Update query state for current page without navigating */
  setQuery: (query: Partial<QueryState>) => void;
  /** Replace current page (no history push) */
  replace: (page: PageKey, params?: RouteParams) => void;
}

export interface NavigateOptions {
  /** Replace current entry instead of pushing */
  replace?: boolean;
  /** Label for display in back button */
  label?: string;
  /** Initial query state for the target page */
  query?: QueryState;
}

const RouterContext = createContext<RouterContextValue>({
  currentPage: "library-management",
  params: {},
  query: {},
  history: [],
  navigate: () => {},
  goBack: () => {},
  canGoBack: false,
  setQuery: () => {},
  replace: () => {},
});

export function useRouter(): RouterContextValue {
  return useContext(RouterContext);
}

// ── Provider ────────────────────────────────────────────

const MAX_HISTORY = 20;

export function RouterProvider({
  defaultPage = "library-management",
  children,
}: {
  defaultPage?: PageKey;
  children: ReactNode;
}) {
  const [currentPage, setCurrentPage] = useState<PageKey>(defaultPage);
  const [params, setParams] = useState<RouteParams>({});
  const [query, setQueryState] = useState<QueryState>({});
  const [history, setHistory] = useState<NavEntry[]>([]);

  const navigate = useCallback(
    (page: PageKey, newParams?: RouteParams, opts?: NavigateOptions) => {
      if (opts?.replace) {
        // Replace without pushing to history
        setCurrentPage(page);
        setParams(newParams ?? {});
        setQueryState(opts?.query ?? {});
        return;
      }

      // Push current page to history before navigating
      setHistory((prev) => {
        const entry: NavEntry = {
          page: currentPage,
          params: { ...params },
          query: { ...query },
          label: opts?.label,
        };
        const next = [...prev, entry];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });

      setCurrentPage(page);
      setParams(newParams ?? {});
      setQueryState(opts?.query ?? {});
    },
    [currentPage, params, query]
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCurrentPage(last.page);
      setParams(last.params);
      setQueryState(last.query ?? {});
      return prev.slice(0, -1);
    });
  }, []);

  const setQuery = useCallback((partial: Partial<QueryState>) => {
    setQueryState((prev) => ({ ...prev, ...partial }));
  }, []);

  const replace = useCallback((page: PageKey, newParams?: RouteParams) => {
    setCurrentPage(page);
    setParams(newParams ?? {});
    setQueryState({});
  }, []);

  return (
    <RouterContext.Provider
      value={{
        currentPage,
        params,
        query,
        history,
        navigate,
        goBack,
        canGoBack: history.length > 0,
        setQuery,
        replace,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}
