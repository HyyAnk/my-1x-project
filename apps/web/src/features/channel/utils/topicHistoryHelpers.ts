import type { TopicAvailability, TopicCandidate } from "@studio/shared";
import type { TopicAvailabilityPresentation, TopicFormatBadge, TopicHistoryFilter, TopicHistoryMetrics } from "../types/history.types";

/**
 * Returns visual format descriptor for a topic candidate or content kind.
 */
export function getTopicFormatBadge(topicOrKind: Pick<TopicCandidate, "content_kind"> | "episode" | "short_reel"): TopicFormatBadge {
  const kind = typeof topicOrKind === "string" ? topicOrKind : topicOrKind.content_kind;

  if (kind === "short_reel") {
    return {
      format: "9:16",
      badgeText: "9:16",
      label: "Short-Reel",
      kind: "short_reel",
      indicatorClass: "is-vertical",
    };
  }

  return {
    format: "16:9",
    badgeText: "16:9",
    label: "Episode",
    kind: "episode",
    indicatorClass: "is-landscape",
  };
}

/**
 * Normalizes availability status into presentation text, semantic variant, and action status.
 */
export function getTopicAvailabilityPresentation(availability?: TopicAvailability | null): TopicAvailabilityPresentation {
  if (!availability) {
    return {
      status: "unknown",
      label: "Unknown",
      variant: "neutral",
      canConfirm: false,
      tooltip: "Availability status has not been verified.",
    };
  }

  if (availability.can_confirm) {
    const readyCount = availability.source_capacity ?? 0;
    return {
      status: "ready",
      label: `${readyCount} Ready`,
      variant: "success",
      canConfirm: true,
      tooltip: availability.recovery_action || `${readyCount} source questions ready.`,
    };
  }

  if (availability.reason_code === "UNBOUND_LEGACY_TOPIC") {
    return {
      status: "unbound",
      label: "Legacy Unbound",
      variant: "warning",
      canConfirm: false,
      tooltip: availability.recovery_action || "Legacy topic generated without question bindings.",
    };
  }

  return {
    status: "unavailable",
    label: "Unavailable",
    variant: "danger",
    canConfirm: false,
    tooltip: availability.recovery_action || "Required questions are currently unavailable.",
  };
}

/**
 * Pure filter helper returning topic candidates matching format and optional search query.
 */
export function filterHistoryTopics(topics: TopicCandidate[], filter: TopicHistoryFilter = "all", searchQuery?: string): TopicCandidate[] {
  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? "";

  return topics.filter((topic) => {
    if (filter === "episode" && topic.content_kind !== "episode") {
      return false;
    }
    if (filter === "short_reel" && topic.content_kind !== "short_reel") {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const titleMatch = topic.title.toLowerCase().includes(normalizedQuery);
    const premiseMatch = topic.premise.toLowerCase().includes(normalizedQuery);
    const hookMatch = topic.hook.toLowerCase().includes(normalizedQuery);
    const hintMatch = Boolean(topic.theme_hint?.toLowerCase().includes(normalizedQuery));

    return titleMatch || premiseMatch || hookMatch || hintMatch;
  });
}

/**
 * Computes aggregated counts for format categories and availability statuses.
 */
export function calculateTopicHistoryMetrics(
  topics: TopicCandidate[],
  availabilityMap?: Map<string, TopicAvailability>,
): TopicHistoryMetrics {
  let episodeCount = 0;
  let shortReelCount = 0;
  let readyCount = 0;
  let unboundCount = 0;
  let unavailableCount = 0;

  for (const topic of topics) {
    if (topic.content_kind === "short_reel") {
      shortReelCount += 1;
    } else {
      episodeCount += 1;
    }

    if (availabilityMap) {
      const avail = availabilityMap.get(topic.topic_id);
      if (avail) {
        if (avail.can_confirm) {
          readyCount += 1;
        } else if (avail.reason_code === "UNBOUND_LEGACY_TOPIC") {
          unboundCount += 1;
        } else {
          unavailableCount += 1;
        }
      }
    }
  }

  return {
    totalCount: topics.length,
    episodeCount,
    shortReelCount,
    readyCount,
    unboundCount,
    unavailableCount,
  };
}
