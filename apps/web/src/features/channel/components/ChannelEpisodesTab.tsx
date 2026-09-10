import { useMemo, useState } from "react";
import { FilmSlate, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { EpisodeCard } from "./EpisodeCard";
import { buildHash, getNavProps } from "../../../hooks/useRouter";
import { PaginationControl } from "../../../components/PaginationControl";

export type ChannelEpisodesTabProps = {
  channel: Channel;
  episodes: Episode[];
  tasks: Task[];
  onOpenEpisode: (channelId: string, episodeId: string) => void;
  onDeleteEpisode: (episode: Episode) => void;
  onGoToTopics: () => void;
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
};

export function ChannelEpisodesTab({
  channel,
  episodes,
  tasks,
  onOpenEpisode,
  onDeleteEpisode,
  onGoToTopics,
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
}: ChannelEpisodesTabProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<"all" | "in_progress" | "video_ready">("all");
  const [localSort, setLocalSort] = useState("updated_desc");
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(20);

  const isControlled = onPageChange !== undefined;

  const currentSearch = isControlled ? (search ?? "") : localSearch;
  const currentFilter = isControlled ? (status ?? "all") : localFilter;
  const currentSort = isControlled ? (sort ?? "updated_desc") : localSort;
  const currentPage = isControlled ? (page ?? 1) : localPage;
  const currentLimit = isControlled ? (limit ?? 20) : localLimit;

  const topicsUrl = buildHash({ page: "channels", channelId: channel.channel_id, tab: "topics" });

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
      setLocalPage(1);
    }
  };

  const handleFilterChange = (newFilter: "all" | "in_progress" | "video_ready") => {
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

  return (
    <div className="channel-episodes-tab" data-testid="channel-episodes-tab">
      <div className="section-heading episode-section-heading">
        <h2>Confirmed Episodes</h2>
        <div className="episode-section-actions">
          <span className="count-note">
            {currentTotalItems} {currentTotalItems === 1 ? "episode" : "episodes"}
          </span>
          <a className="primary-button compact" {...getNavProps(topicsUrl, onGoToTopics)}>
            <Plus size={15} />
            <span>New Episode</span>
          </a>
        </div>
      </div>

      {hasNoEpisodesEver ? (
        <EmptyState
          compact
          icon={<FilmSlate size={24} />}
          title="No episodes confirmed yet"
          copy="Explore and confirm ideas in the Idea Lab to start generating video episodes."
          action="Explore Idea Lab"
          actionHref={topicsUrl}
          onAction={onGoToTopics}
        />
      ) : (
        <>
          <div className="episode-toolbar">
            <div className="episode-search-wrap">
              <MagnifyingGlass size={15} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search episodes by title or topic..."
                value={currentSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="episode-search-input"
                aria-label="Search episodes"
              />
              {currentSearch ? (
                <button type="button" className="search-clear-btn" onClick={() => handleSearchChange("")} aria-label="Clear search">
                  <X size={13} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="episode-filter-chips">
              <button
                type="button"
                className={`filter-chip ${currentFilter === "all" ? "is-active" : ""}`}
                onClick={() => handleFilterChange("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-chip ${currentFilter === "in_progress" ? "is-active" : ""}`}
                onClick={() => handleFilterChange("in_progress")}
              >
                In Production
              </button>
              <button
                type="button"
                className={`filter-chip ${currentFilter === "video_ready" ? "is-active" : ""}`}
                onClick={() => handleFilterChange("video_ready")}
              >
                Video Ready
              </button>
            </div>

            <div className="episode-sort-wrap">
              <select
                id="episode-sort-select"
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="episode-sort-select"
                aria-label="Sort episodes"
              >
                <option value="updated_desc">Recently updated</option>
                <option value="updated_asc">Oldest updated</option>
                <option value="created_desc">Newest first</option>
                <option value="created_asc">Oldest first</option>
                <option value="title_asc">Title (A–Z)</option>
                <option value="title_desc">Title (Z–A)</option>
              </select>
            </div>
          </div>

          {displayedEpisodes.length === 0 ? (
            <div className="episode-empty-search" data-testid="episode-empty-search">
              <MagnifyingGlass size={28} aria-hidden="true" />
              <p>
                No episodes matching <strong>"{currentSearch}"</strong> in this filter.
              </p>
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => {
                  handleSearchChange("");
                  handleFilterChange("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="episode-card-grid" data-testid="episode-card-grid">
                {displayedEpisodes.map((episode) => (
                  <EpisodeCard
                    key={episode.episode_id}
                    episode={episode}
                    tasks={tasks}
                    onOpen={() => onOpenEpisode(channel.channel_id, episode.episode_id)}
                    onDelete={onDeleteEpisode}
                  />
                ))}
              </div>

              <PaginationControl
                page={currentPage}
                totalPages={currentTotalPages}
                totalItems={currentTotalItems}
                limit={currentLimit}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
