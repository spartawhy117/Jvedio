/**
 * useApiQuery / useApiMutation — lightweight query-cache hooks.
 *
 * Provides:
 *  - Key-based caching + deduplication
 *  - Loading / error / data states
 *  - Manual refetch & invalidation
 *  - Stale-while-revalidate pattern
 *
 * No external dependency (react-query); keeps the footprint minimal
 * for a single-window desktop app where cache scope = single session.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ───────────────────────────────────────────────

export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface UseApiQueryResult<T> {
  data: T | null;
  status: QueryStatus;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseApiQueryOptions<T> {
  /** Unique cache key — when it changes the query re-runs */
  queryKey: string;
  /** The async fetcher function */
  queryFn: () => Promise<T>;
  /** Whether the query is enabled (default true) */
  enabled?: boolean;
  /** Keep previous data while refetching (stale-while-revalidate) */
  keepPreviousData?: boolean;
}

export interface UseApiMutationResult<TData, TVariables> {
  data: TData | null;
  status: QueryStatus;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  mutate: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

export interface UseApiMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

// ── Global query cache ──────────────────────────────────

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const queryListeners = new Map<string, Set<() => void>>();

/** Invalidate cache for a specific key or prefix */
export function invalidateQueries(keyOrPrefix: string): void {
  const keysToInvalidate: string[] = [];
  for (const key of queryCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix + ":")) {
      keysToInvalidate.push(key);
    }
  }
  for (const key of keysToInvalidate) {
    queryCache.delete(key);
    // Notify listeners to refetch
    const listeners = queryListeners.get(key);
    if (listeners) {
      listeners.forEach((cb) => cb());
    }
  }
}

/** Clear the entire query cache */
export function clearQueryCache(): void {
  queryCache.clear();
}

// ── useApiQuery ─────────────────────────────────────────

export function useApiQuery<T>(options: UseApiQueryOptions<T>): UseApiQueryResult<T> {
  const { queryKey, queryFn, enabled = true, keepPreviousData = false } = options;

  const [data, setData] = useState<T | null>(() => {
    const cached = queryCache.get(queryKey) as CacheEntry<T> | undefined;
    return cached?.data ?? null;
  });
  const [status, setStatus] = useState<QueryStatus>(() => {
    return queryCache.has(queryKey) ? "success" : "idle";
  });
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const latestKeyRef = useRef(queryKey);
  latestKeyRef.current = queryKey;

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;

    setStatus("loading");
    if (!keepPreviousData) {
      // Don't clear data — allow stale data to remain visible
    }
    setError(null);

    try {
      const result = await queryFn();
      if (!mountedRef.current || latestKeyRef.current !== queryKey) return;

      // Store in cache
      queryCache.set(queryKey, { data: result, timestamp: Date.now() });
      setData(result);
      setStatus("success");
    } catch (err) {
      if (!mountedRef.current || latestKeyRef.current !== queryKey) return;

      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus("error");
    }
  }, [queryKey, queryFn, keepPreviousData]);

  // Subscribe to cache invalidation
  useEffect(() => {
    if (!queryListeners.has(queryKey)) {
      queryListeners.set(queryKey, new Set());
    }
    const listeners = queryListeners.get(queryKey)!;
    listeners.add(fetchData);

    return () => {
      listeners.delete(fetchData);
      if (listeners.size === 0) {
        queryListeners.delete(queryKey);
      }
    };
  }, [queryKey, fetchData]);

  // Fetch on mount / key change / enabled change
  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    // If cached data exists for the new key, use it immediately
    const cached = queryCache.get(queryKey) as CacheEntry<T> | undefined;
    if (cached) {
      setData(cached.data);
      setStatus("success");
    } else if (!keepPreviousData) {
      setData(null);
    }

    fetchData();
  }, [queryKey, enabled, fetchData, keepPreviousData]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    status,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    error,
    refetch,
  };
}

// ── useApiMutation ──────────────────────────────────────

export function useApiMutation<TData, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>
): UseApiMutationResult<TData, TVariables> {
  const { mutationFn, onSuccess, onError } = options;

  const [data, setData] = useState<TData | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setStatus("loading");
      setError(null);

      try {
        const result = await mutationFn(variables);
        if (mountedRef.current) {
          setData(result);
          setStatus("success");
          onSuccess?.(result, variables);
        }
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setError(e);
          setStatus("error");
          onError?.(e, variables);
        }
        throw e;
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    data,
    status,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
    error,
    mutate,
    reset,
  };
}
