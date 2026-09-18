import { describe, expect, it } from "vitest";
import type { TopicAvailability, TopicCandidate } from "@studio/shared";
import {
  calculateTopicHistoryMetrics,
  filterHistoryTopics,
  getTopicAvailabilityPresentation,
  getTopicFormatBadge,
} from "./topicHistoryHelpers";

describe("topicHistoryHelpers", () => {
  const sampleEpisodeTopic: TopicCandidate = {
    topic_id: "topic_ep_1",
    channel_id: "ch_1",
    content_kind: "episode",
    title: "Ancient Pyramids Secrets",
    premise: "Exploring the hidden chambers and engineering marvels of Giza",
    why_it_fits: "High engagement for historical archaeology fans",
    hook: "What did archaeologists find behind the blocked corridor?",
    estimated_potential: "High",
    generated_at: "2026-09-10T10:00:00.000Z",
    selected: false,
    origin: "discovery",
    theme_hint: "ancient civilizations",
    quiz_format: "multiple_choice",
    question_count: 8,
    age_band: "family",
    visual_style: "pixar_3d",
  };

  const sampleShortReelTopic: TopicCandidate = {
    topic_id: "topic_reel_1",
    channel_id: "ch_1",
    content_kind: "short_reel",
    title: "Cheetah vs Peregrine Falcon Speed Showdown",
    premise: "Comparing top speeds of land and aerial apex predators",
    why_it_fits: "Perfect short-form versus format",
    hook: "Who reaches 60 mph faster?",
    estimated_potential: "Very High",
    generated_at: "2026-09-11T12:00:00.000Z",
    selected: false,
    origin: "keyword",
    theme_hint: "wildlife records",
    question_count: 1,
    aspect_ratio: "9:16",
    archetype: "versus_faceoff",
  };

  describe("getTopicFormatBadge", () => {
    it("returns 16:9 landscape badge for episode topic", () => {
      const badge = getTopicFormatBadge(sampleEpisodeTopic);
      expect(badge).toEqual({
        format: "16:9",
        badgeText: "16:9",
        label: "Episode",
        kind: "episode",
        indicatorClass: "is-landscape",
      });
    });

    it("returns 9:16 vertical badge for short reel topic", () => {
      const badge = getTopicFormatBadge(sampleShortReelTopic);
      expect(badge).toEqual({
        format: "9:16",
        badgeText: "9:16",
        label: "Short-Reel",
        kind: "short_reel",
        indicatorClass: "is-vertical",
      });
    });

    it("accepts string content kind directly", () => {
      expect(getTopicFormatBadge("episode").format).toBe("16:9");
      expect(getTopicFormatBadge("short_reel").format).toBe("9:16");
    });
  });

  describe("getTopicAvailabilityPresentation", () => {
    it("returns unknown status when availability is undefined or null", () => {
      const resultUndefined = getTopicAvailabilityPresentation(undefined);
      expect(resultUndefined).toEqual({
        status: "unknown",
        label: "Unknown",
        variant: "neutral",
        canConfirm: false,
        tooltip: "Availability status has not been verified.",
      });

      const resultNull = getTopicAvailabilityPresentation(null);
      expect(resultNull.status).toBe("unknown");
    });

    it("returns ready status with count when topic can be confirmed", () => {
      const availability: TopicAvailability = {
        topic_id: "topic_ep_1",
        content_kind: "episode",
        can_confirm: true,
        reason_code: "AVAILABLE",
        retryable: false,
        recovery_action: "All questions ready",
        source_capacity: 12,
      };

      const result = getTopicAvailabilityPresentation(availability);
      expect(result).toEqual({
        status: "ready",
        label: "12 Ready",
        variant: "success",
        canConfirm: true,
        tooltip: "All questions ready",
      });
    });

    it("returns unbound status for legacy unbound topic", () => {
      const availability: TopicAvailability = {
        topic_id: "topic_ep_legacy",
        content_kind: "episode",
        can_confirm: false,
        reason_code: "UNBOUND_LEGACY_TOPIC",
        retryable: false,
        recovery_action: "Regenerate topic with active bindings",
        source_capacity: 0,
      };

      const result = getTopicAvailabilityPresentation(availability);
      expect(result).toEqual({
        status: "unbound",
        label: "Legacy Unbound",
        variant: "warning",
        canConfirm: false,
        tooltip: "Regenerate topic with active bindings",
      });
    });

    it("returns unavailable status when shortage prevents confirmation", () => {
      const availability: TopicAvailability = {
        topic_id: "topic_reel_shortage",
        content_kind: "short_reel",
        can_confirm: false,
        reason_code: "NO_ELIGIBLE_SOURCES",
        retryable: true,
        recovery_action: "Add 1 question in Question Bank",
        source_capacity: 0,
      };

      const result = getTopicAvailabilityPresentation(availability);
      expect(result).toEqual({
        status: "unavailable",
        label: "Unavailable",
        variant: "danger",
        canConfirm: false,
        tooltip: "Add 1 question in Question Bank",
      });
    });
  });

  describe("filterHistoryTopics", () => {
    const list = [sampleEpisodeTopic, sampleShortReelTopic];

    it("returns all topics when filter is 'all' and query is empty", () => {
      const result = filterHistoryTopics(list, "all");
      expect(result).toHaveLength(2);
    });

    it("filters strictly by episode kind", () => {
      const result = filterHistoryTopics(list, "episode");
      expect(result).toHaveLength(1);
      expect(result[0].topic_id).toBe("topic_ep_1");
    });

    it("filters strictly by short_reel kind", () => {
      const result = filterHistoryTopics(list, "short_reel");
      expect(result).toHaveLength(1);
      expect(result[0].topic_id).toBe("topic_reel_1");
    });

    it("filters by search query matching title", () => {
      const result = filterHistoryTopics(list, "all", "pyramids");
      expect(result).toHaveLength(1);
      expect(result[0].topic_id).toBe("topic_ep_1");
    });

    it("filters by search query matching premise or hook", () => {
      const premiseResult = filterHistoryTopics(list, "all", "predators");
      expect(premiseResult).toHaveLength(1);
      expect(premiseResult[0].topic_id).toBe("topic_reel_1");

      const hookResult = filterHistoryTopics(list, "all", "blocked corridor");
      expect(hookResult).toHaveLength(1);
      expect(hookResult[0].topic_id).toBe("topic_ep_1");
    });

    it("filters by search query matching theme_hint", () => {
      const hintResult = filterHistoryTopics(list, "all", "wildlife");
      expect(hintResult).toHaveLength(1);
      expect(hintResult[0].topic_id).toBe("topic_reel_1");
    });

    it("returns empty array when query does not match any items", () => {
      const result = filterHistoryTopics(list, "all", "nonexistent topic query");
      expect(result).toEqual([]);
    });

    it("does not mutate original topic array", () => {
      const originalCopy = [...list];
      filterHistoryTopics(list, "episode", "ancient");
      expect(list).toEqual(originalCopy);
    });
  });

  describe("calculateTopicHistoryMetrics", () => {
    it("computes accurate counts across formats and availability states", () => {
      const topics = [sampleEpisodeTopic, sampleShortReelTopic];
      const map = new Map<string, TopicAvailability>([
        [
          sampleEpisodeTopic.topic_id,
          {
            topic_id: sampleEpisodeTopic.topic_id,
            content_kind: "episode",
            can_confirm: true,
            reason_code: "AVAILABLE",
            retryable: false,
            recovery_action: "Ready",
            source_capacity: 8,
          },
        ],
        [
          sampleShortReelTopic.topic_id,
          {
            topic_id: sampleShortReelTopic.topic_id,
            content_kind: "short_reel",
            can_confirm: false,
            reason_code: "UNBOUND_LEGACY_TOPIC",
            retryable: false,
            recovery_action: "Unbound",
            source_capacity: 0,
          },
        ],
      ]);

      const metrics = calculateTopicHistoryMetrics(topics, map);
      expect(metrics).toEqual({
        totalCount: 2,
        episodeCount: 1,
        shortReelCount: 1,
        readyCount: 1,
        unboundCount: 1,
        unavailableCount: 0,
      });
    });

    it("handles empty topics without error", () => {
      const metrics = calculateTopicHistoryMetrics([]);
      expect(metrics).toEqual({
        totalCount: 0,
        episodeCount: 0,
        shortReelCount: 0,
        readyCount: 0,
        unboundCount: 0,
        unavailableCount: 0,
      });
    });
  });
});
