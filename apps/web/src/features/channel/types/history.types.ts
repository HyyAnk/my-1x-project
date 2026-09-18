import type { TopicCandidate } from "@studio/shared";

/**
 * Filter mode for topic history: all, long-form episodes (16:9), or short-reels (9:16).
 */
export type TopicHistoryFilter = "all" | "episode" | "short_reel";

/**
 * Format badge metadata defining visual badge presentation.
 */
export interface TopicFormatBadge {
  format: "16:9" | "9:16";
  badgeText: string;
  label: string;
  kind: "episode" | "short_reel";
  indicatorClass: "is-landscape" | "is-vertical";
}

/**
 * Normalized availability state category for topic candidate source bindings.
 */
export type TopicAvailabilityStatus = "ready" | "unbound" | "unavailable" | "unknown";

/**
 * Visual semantic theme variant for availability presentation.
 */
export type TopicAvailabilityThemeVariant = "success" | "warning" | "danger" | "neutral";

/**
 * Normalized presentation data structure for availability status badge and action button.
 */
export interface TopicAvailabilityPresentation {
  status: TopicAvailabilityStatus;
  label: string;
  variant: TopicAvailabilityThemeVariant;
  canConfirm: boolean;
  tooltip: string;
}

/**
 * Aggregate statistics for a collection of topic candidates.
 */
export interface TopicHistoryMetrics {
  totalCount: number;
  episodeCount: number;
  shortReelCount: number;
  readyCount: number;
  unboundCount: number;
  unavailableCount: number;
}

/**
 * Query and filter options for filtering topic history items.
 */
export interface TopicHistoryFilterOptions {
  filter: TopicHistoryFilter;
  searchQuery?: string;
}

/**
 * Convenience alias for topic candidate in history views.
 */
export type HistoryTopicItem = TopicCandidate;
