import { useMemo, useState } from "react";
import type { Episode } from "@studio/shared";

export type EpisodeFilterStatus = "all" | "in_progress" | "video_ready";

export interface UseChannelEpisodesFilterOptions {
  episodes: Episode[];
  page?: number;
  totalPages?: number;
  totalItems?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  status?: string;
  onStatusChange?: (status: string) => void;
  loading?: boolean;
}

export function useChannelEpisodesFilter({
  episodes,
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  status,
  onStatusChange,
  loading = false,
}: UseChannelEpisodesFilterOptions) {
  const [localSearch, setLocalSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<EpisodeFilterStatus>("all");
  const [localSort, setLocalSort] = useState("updated_desc");
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(20);

  const isControlled = onPageChange !== undefined;

  const currentSearch = isControlled ? (search ?? "") : localSearch;
  const currentFilter = isControlled ? ((status as EpisodeFilterStatus) ?? "all") : localFilter;
  const currentSort = isControlled ? (sort ?? "updated_desc") : localSort;
  const currentPage = isControlled ? (page ?? 1) : localPage;
  const currentLimit = isControlled ? (limit ?? 20) : localLimit;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
      setLocalPage(1);
    }
  };

  const handleFilterChange = (newFilter: EpisodeFilterStatus) => {
    if (onStatusChange) {
      onStatusChange(newFilter);
    } else {
      setLocalFilter(newFilter);
      setLocalPage(1);
    }
  };

  const handleSortChange = (newSort: string) => {
    if (onSortChange) {
      onSortChange(newSort);
    } else {
      setLocalSort(newSort);
      setLocalPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    if (onLimitChange) {
      onLimitChange(newLimit);
    } else {
      setLocalLimit(newLimit);
      setLocalPage(1);
    }
  };

  const { displayedEpisodes, currentTotalItems, currentTotalPages } = useMemo(() => {
    if (isControlled) {
      const tot = totalItems ?? episodes.length;
      const tPages = totalPages ?? Math.max(1, Math.ceil(tot / currentLimit));
      return {
        displayedEpisodes: episodes,
        currentTotalItems: tot,
        currentTotalPages: tPages,
      };
    }

    const filtered = episodes.filter((ep) => {
      if (currentFilter === "video_ready" && !ep.video_asset_path) return false;
      if (currentFilter === "in_progress" && ep.video_asset_path) return false;
      if (currentSearch.trim()) {
        const q = currentSearch.toLowerCase();
        const matchTitle = ep.topic.title.toLowerCase().includes(q);
        const matchPremise = ep.topic.premise.toLowerCase().includes(q);
        const matchHook = ep.topic.hook?.toLowerCase().includes(q);
        if (!matchTitle && !matchPremise && !matchHook) return false;
      }
      return true;
    });

    const tot = filtered.length;
    const tPages = Math.max(1, Math.ceil(tot / currentLimit));
    const offset = (currentPage - 1) * currentLimit;
    const paged = filtered.slice(offset, offset + currentLimit);

    return {
      displayedEpisodes: paged,
      currentTotalItems: tot,
      currentTotalPages: tPages,
    };
  }, [isControlled, episodes, totalItems, totalPages, currentLimit, currentFilter, currentSearch, currentPage]);

  const hasNoEpisodesEver = !currentSearch && currentFilter === "all" && currentTotalItems === 0 && !loading;

  return {
    isControlled,
    currentSearch,
    currentFilter,
    currentSort,
    currentPage,
    currentLimit,
    displayedEpisodes,
    currentTotalItems,
    currentTotalPages,
    hasNoEpisodesEver,
    handleSearchChange,
    handleFilterChange,
    handleSortChange,
    handlePageChange,
    handleLimitChange,
  };
}

export type UseChannelEpisodesFilterReturn = ReturnType<typeof useChannelEpisodesFilter>;
