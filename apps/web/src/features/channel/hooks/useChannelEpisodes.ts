import { useCallback, useEffect, useRef, useState } from "react";
import type { Episode, PaginationMeta, PaginationQuery } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export interface UseChannelEpisodesOptions {
  channelId: string;
  initialPage?: number;
  initialLimit?: number;
  initialSearch?: string;
  initialSort?: string;
  initialStatus?: string;
  onNotice?: (notice: NonNullable<Notice>) => void;
  debounceMs?: number;
}

export function useChannelEpisodes({
  channelId,
  initialPage = 1,
  initialLimit = 20,
  initialSearch = "",
  initialSort = "updated_desc",
  initialStatus = "all",
  onNotice,
  debounceMs = 300,
}: UseChannelEpisodesOptions) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [status, setStatus] = useState(initialStatus);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    page: initialPage,
    limit: initialLimit,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVersion = useRef(0);
  const isInitialMount = useRef(true);

  // Debounce search input and reset page to 1
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [search, debounceMs]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  }, []);

  const fetchEpisodes = useCallback(
    async (showLoading = true) => {
      const version = ++fetchVersion.current;
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const queryParams: PaginationQuery = {
          page,
          limit,
          search: debouncedSearch.trim() || undefined,
          sort: sort || undefined,
          status: status !== "all" ? status : undefined,
        };

        const response = await api.episodes(channelId, queryParams);
        if (version !== fetchVersion.current) return;

        setEpisodes(response.episodes);
        const meta: PaginationMeta = response.pagination ?? {
          total: response.total ?? response.episodes.length,
          page: response.page ?? page,
          limit: response.limit ?? limit,
          total_pages:
            response.total_pages ??
            (response.total !== undefined ? Math.ceil(response.total / limit) : response.episodes.length > 0 ? 1 : 0),
        };
        setPaginationMeta(meta);
      } catch (err) {
        if (version !== fetchVersion.current) return;
        const errObj = err instanceof Error ? err : new Error(String(err));
        setError(errObj);
        onNotice?.({ tone: "bad", message: errObj.message });
      } finally {
        if (version === fetchVersion.current && showLoading) {
          setLoading(false);
        }
      }
    },
    [channelId, page, limit, debouncedSearch, sort, status, onNotice],
  );

  useEffect(() => {
    void fetchEpisodes(true);
  }, [fetchEpisodes]);

  const reload = useCallback(async () => {
    await fetchEpisodes(false);
  }, [fetchEpisodes]);

  const handleEpisodeDeleted = useCallback(
    async (deletedEpisode: Episode) => {
      setEpisodes((current) => current.filter((item) => item.episode_id !== deletedEpisode.episode_id));
      setPaginationMeta((prev) => {
        const newTotal = Math.max(0, prev.total - 1);
        const newTotalPages = Math.max(0, Math.ceil(newTotal / limit));
        return {
          ...prev,
          total: newTotal,
          total_pages: newTotalPages,
        };
      });
      if (episodes.length <= 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await reload();
      }
    },
    [episodes.length, page, limit, reload],
  );

  return {
    episodes,
    setEpisodes,
    page,
    setPage,
    limit,
    setLimit: handleLimitChange,
    search,
    setSearch,
    sort,
    setSort: handleSortChange,
    status,
    setStatus: handleStatusChange,
    paginationMeta,
    loading,
    error,
    reload,
    handleEpisodeDeleted,
  };
}

export type UseChannelEpisodesReturn = ReturnType<typeof useChannelEpisodes>;
