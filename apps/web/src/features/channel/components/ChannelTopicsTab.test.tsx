import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import type { Channel, TopicCandidate, TopicRun } from "@studio/shared";
import { ChannelTopicsTab } from "./ChannelTopicsTab";

// Mock useTopicAvailability so internal hook does not perform real fetches
vi.mock("../hooks/useTopicAvailability", () => ({
  useTopicAvailability: vi.fn(() => ({
    availability: null,
    availabilityMap: new Map(),
    loading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

describe("ChannelTopicsTab", () => {
  afterEach(() => {
    cleanup();
  });

  const mockChannel: Channel = {
    channel_id: "ch_test_123",
    slug: "test-channel",
    display_name: "Test Channel",
    description: "Channel for testing topics tab",
    target_audience: "Everyone",
    language: "English",
    country: "US",
    market: "US",
    status: "ACTIVE",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  } as unknown as Channel;

  const createTopic = (id: string, runId?: string, generatedAt = "2026-09-08T12:00:00.000Z"): TopicCandidate => ({
    topic_id: id,
    channel_id: mockChannel.channel_id,
    content_kind: "episode",
    origin: "discovery",
    age_band: "family",
    archetype: "deep_trivia",
    title: `Title for ${id}`,
    premise: `Premise for ${id}`,
    why_it_fits: "Good audience fit",
    hook: `Hook for ${id}`,
    estimated_potential: "High",
    generated_at: generatedAt,
    selected: false,
    quiz_format: "multiple_choice",
    question_count: 5,
    visual_style: "pixar_3d",
    run_id: runId,
  });

  it("groups candidates strictly by latestRun.run_id, placing older runs into history", () => {
    const latestRun: TopicRun = {
      run_id: "run_latest_abc",
      generated_at: "2026-09-08T12:00:00.000Z",
      target_episode_count: 2,
      target_short_reel_count: 0,
      shortages: [],
      candidates: [],
    };

    const topicLatest1 = createTopic("top_latest_1", "run_latest_abc");
    const topicLatest2 = createTopic("top_latest_2", "run_latest_abc");
    const topicOlder1 = createTopic("top_older_1", "run_older_xyz");

    const { container, getByText, queryByText } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[topicLatest1, topicLatest2, topicOlder1]}
        latestRun={latestRun}
        topicTask={null}
        topicClock={0}
        topicHint=""
        setTopicHint={vi.fn()}
        topicTaskActive={false}
        busy={null}
        confirmingTopicId={null}
        onSuggest={vi.fn()}
        onConfirmTopic={vi.fn()}
      />,
    );

    // Latest run topics rendered in primary grid
    const grid = container.querySelector(".topic-grid");
    expect(grid).not.toBeNull();
    expect(getByText("Title for top_latest_1")).toBeDefined();
    expect(getByText("Title for top_latest_2")).toBeDefined();

    // Older run topic rendered in history section
    const historySection = container.querySelector(".topic-history-section");
    expect(historySection).not.toBeNull();
    expect(getByText(/Older Ideas History \(1\)/)).toBeDefined();
    expect(getByText("Title for top_older_1")).toBeDefined();

    // No shortage notice
    expect(queryByText(/Latest Suggestion Run Shortage Notice/)).toBeNull();
  });

  it("displays shortage notice and preserves history when latest run is empty with shortages", () => {
    const latestRun: TopicRun = {
      run_id: "run_empty_new",
      generated_at: "2026-09-08T12:00:00.000Z",
      target_episode_count: 2,
      target_short_reel_count: 0,
      shortages: [
        {
          slot_id: "slot_1",
          content_kind: "episode",
          requested_count: 5,
          available_count: 1,
          reason_code: "NO_ELIGIBLE_SOURCES",
          exclusion_counts: {},
        },
      ],
      candidates: [],
    };

    const olderTopic = createTopic("top_prior", "run_older_xyz");

    const { container, getByText } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[olderTopic]}
        latestRun={latestRun}
        topicTask={null}
        topicClock={0}
        topicHint=""
        setTopicHint={vi.fn()}
        topicTaskActive={false}
        busy={null}
        confirmingTopicId={null}
        onSuggest={vi.fn()}
        onConfirmTopic={vi.fn()}
      />,
    );

    // Shortage notice is visible
    expect(getByText(/Latest Suggestion Run Shortage Notice/)).toBeDefined();

    // Primary grid is omitted because latest run has 0 topics
    const grid = container.querySelector(".topic-grid");
    expect(grid).toBeNull();

    // Older topic stays in history
    const historySection = container.querySelector(".topic-history-section");
    expect(historySection).not.toBeNull();
    expect(getByText(/Older Ideas History \(1\)/)).toBeDefined();
    expect(getByText("Title for top_prior")).toBeDefined();
  });

  it("places legacy candidates without run_id into history rather than inferring latest run via timestamps", () => {
    // Both generated within 50ms of each other, but have no run_id
    const legacyTopic1 = createTopic("top_legacy_1", undefined, "2026-09-08T12:00:00.000Z");
    const legacyTopic2 = createTopic("top_legacy_2", undefined, "2026-09-08T12:00:00.040Z");

    const { container, getByText } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[legacyTopic1, legacyTopic2]}
        latestRun={null}
        topicTask={null}
        topicClock={0}
        topicHint=""
        setTopicHint={vi.fn()}
        topicTaskActive={false}
        busy={null}
        confirmingTopicId={null}
        onSuggest={vi.fn()}
        onConfirmTopic={vi.fn()}
      />,
    );

    // When all topics lack run_id, no latest grid is fabricated
    const grid = container.querySelector(".topic-grid");
    expect(grid).toBeNull();

    // Both are placed in history
    const historySection = container.querySelector(".topic-history-section");
    expect(historySection).not.toBeNull();
    expect(getByText(/Older Ideas History \(2\)/)).toBeDefined();
  });

  it("disables confirmation buttons when another topic confirmation is pending", () => {
    const latestRun: TopicRun = {
      run_id: "run_active",
      generated_at: "2026-09-08T12:00:00.000Z",
      target_episode_count: 2,
      target_short_reel_count: 0,
      shortages: [],
      candidates: [],
    };

    const topic1 = createTopic("top_active_1", "run_active");
    const topic2 = createTopic("top_active_2", "run_active");

    const { getAllByRole } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[topic1, topic2]}
        latestRun={latestRun}
        topicTask={null}
        topicClock={0}
        topicHint=""
        setTopicHint={vi.fn()}
        topicTaskActive={false}
        busy={null}
        confirmingTopicId="top_active_1"
        onSuggest={vi.fn()}
        onConfirmTopic={vi.fn()}
      />,
    );

    const buttons = getAllByRole("button", { name: /Select Topic/i });
    // Both buttons should be disabled because confirmingTopicId is active
    for (const btn of buttons) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("triggers onSuggest when suggest button is clicked", () => {
    const onSuggestMock = vi.fn();

    const { getAllByRole } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[]}
        latestRun={null}
        topicTask={null}
        topicClock={0}
        topicHint="Quantum physics"
        setTopicHint={vi.fn()}
        topicTaskActive={false}
        busy={null}
        confirmingTopicId={null}
        onSuggest={onSuggestMock}
        onConfirmTopic={vi.fn()}
      />,
    );

    const suggestButtons = getAllByRole("button", { name: /Suggest topics/i });
    fireEvent.click(suggestButtons[0]);

    expect(onSuggestMock).toHaveBeenCalledTimes(1);
  });
});
