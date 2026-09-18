import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { EpisodeFilterStatus } from "../hooks/useChannelEpisodesFilter";

export interface ChannelEpisodesToolbarProps {
  search: string;
  filter: EpisodeFilterStatus;
  sort: string;
  onSearchChange: (search: string) => void;
  onFilterChange: (filter: EpisodeFilterStatus) => void;
  onSortChange: (sort: string) => void;
}

export function ChannelEpisodesToolbar({
  search,
  filter,
  sort,
  onSearchChange,
  onFilterChange,
  onSortChange,
}: ChannelEpisodesToolbarProps) {
  return (
    <div className="episode-toolbar">
      <div className="episode-search-wrap">
        <MagnifyingGlass size={15} className="search-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search episodes by title or topic..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="episode-search-input"
          aria-label="Search episodes"
        />
        {search ? (
          <button type="button" className="search-clear-btn" onClick={() => onSearchChange("")} aria-label="Clear search">
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="episode-filter-chips">
        <button type="button" className={`filter-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => onFilterChange("all")}>
          All
        </button>
        <button
          type="button"
          className={`filter-chip ${filter === "in_progress" ? "is-active" : ""}`}
          onClick={() => onFilterChange("in_progress")}
        >
          In Production
        </button>
        <button
          type="button"
          className={`filter-chip ${filter === "video_ready" ? "is-active" : ""}`}
          onClick={() => onFilterChange("video_ready")}
        >
          Video Ready
        </button>
      </div>

      <div className="episode-sort-wrap">
        <select
          id="episode-sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
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
  );
}
