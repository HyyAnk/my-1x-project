import type { TopicHistoryFilter, TopicHistoryMetrics } from "../../types/history.types";

export interface TopicHistoryFilterBarProps {
  activeFilter: TopicHistoryFilter;
  metrics: TopicHistoryMetrics;
  onFilterChange: (newFilter: TopicHistoryFilter) => void;
}

/**
 * TopicHistoryFilterBar renders format filter tabs with real-time topic counts
 * for quick segmentation between 16:9 episodes and 9:16 shorts.
 */
export function TopicHistoryFilterBar({ activeFilter, metrics, onFilterChange }: TopicHistoryFilterBarProps) {
  return (
    <div className="topic-history-filters" role="tablist" aria-label="Filter topic history by format">
      <button
        type="button"
        role="tab"
        id="topic-history-filter-all"
        aria-selected={activeFilter === "all"}
        aria-controls="topic-history-list"
        className={`topic-history-filter-btn${activeFilter === "all" ? " is-active" : ""}`}
        onClick={() => onFilterChange("all")}
      >
        <span>All</span>
        <span className="topic-history-filter-count">({metrics.totalCount})</span>
      </button>

      <button
        type="button"
        role="tab"
        id="topic-history-filter-episode"
        aria-selected={activeFilter === "episode"}
        aria-controls="topic-history-list"
        className={`topic-history-filter-btn${activeFilter === "episode" ? " is-active" : ""}`}
        onClick={() => onFilterChange("episode")}
      >
        <span className="topic-format-dot is-landscape" aria-hidden="true" />
        <span>16:9 Episodes</span>
        <span className="topic-history-filter-count">({metrics.episodeCount})</span>
      </button>

      <button
        type="button"
        role="tab"
        id="topic-history-filter-short-reel"
        aria-selected={activeFilter === "short_reel"}
        aria-controls="topic-history-list"
        className={`topic-history-filter-btn${activeFilter === "short_reel" ? " is-active" : ""}`}
        onClick={() => onFilterChange("short_reel")}
      >
        <span className="topic-format-dot is-vertical" aria-hidden="true" />
        <span>9:16 Shorts</span>
        <span className="topic-history-filter-count">({metrics.shortReelCount})</span>
      </button>
    </div>
  );
}
