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

  const createShortReelTopic = (id: string, runId?: string, generatedAt = "2026-09-08T12:00:00.000Z"): TopicCandidate => ({
    topic_id: id,
    channel_id: mockChannel.channel_id,
    content_kind: "short_reel",
    aspect_ratio: "9:16",
    origin: "discovery",
    archetype: "deep_trivia",
    title: `Title for ${id}`,
    premise: `Premise for ${id}`,
    why_it_fits: "Good audience fit",
    hook: `Hook for ${id}`,
    estimated_potential: "High",
    generated_at: generatedAt,
    selected: false,
    question_count: 1,
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
    // Both cards should be disabled because confirmingTopicId is active
    for (const btn of buttons) {
      expect(btn.getAttribute("aria-disabled")).toBe("true");
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

  it("filters history topics by format when filter tabs are clicked", () => {
    const latestRun: TopicRun = {
      run_id: "run_current",
      generated_at: "2026-09-08T12:00:00.000Z",
      target_episode_count: 1,
      target_short_reel_count: 0,
      shortages: [],
      candidates: [],
    };

    const latestTopic = createTopic("top_latest", "run_current");
    const epHistory1 = { ...createTopic("top_ep_1", "run_prev"), title: "Episode History 1" };
    const epHistory2 = { ...createTopic("top_ep_2", "run_prev"), title: "Episode History 2" };
    const shortHistory1 = { ...createShortReelTopic("top_short_1", "run_prev"), title: "Short History 1" };
    const shortHistory2 = { ...createShortReelTopic("top_short_2", "run_prev"), title: "Short History 2" };

    const { getByRole, getByText, queryByText } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[latestTopic, epHistory1, epHistory2, shortHistory1, shortHistory2]}
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

    expect(getByText(/Older Ideas History \(4\)/)).toBeDefined();
    expect(getByText("Episode History 1")).toBeDefined();
    expect(getByText("Short History 1")).toBeDefined();

    // Click 16:9 Episodes tab
    const epTab = getByRole("tab", { name: /16:9 Episodes/i });
    fireEvent.click(epTab);

    expect(getByText("Episode History 1")).toBeDefined();
    expect(getByText("Episode History 2")).toBeDefined();
    expect(queryByText("Short History 1")).toBeNull();
    expect(queryByText("Short History 2")).toBeNull();

    // Click 9:16 Shorts tab
    const shortTab = getByRole("tab", { name: /9:16 Shorts/i });
    fireEvent.click(shortTab);

    expect(queryByText("Episode History 1")).toBeNull();
    expect(queryByText("Episode History 2")).toBeNull();
    expect(getByText("Short History 1")).toBeDefined();
    expect(getByText("Short History 2")).toBeDefined();

    // Click All tab
    const allTab = getByRole("tab", { name: /All/i });
    fireEvent.click(allTab);

    expect(getByText("Episode History 1")).toBeDefined();
    expect(getByText("Short History 1")).toBeDefined();
  });

  it("applies progressive disclosure defaulting to 6 items and toggles show all/less", () => {
    const latestRun: TopicRun = {
      run_id: "run_current",
      generated_at: "2026-09-08T12:00:00.000Z",
      target_episode_count: 1,
      target_short_reel_count: 0,
      shortages: [],
      candidates: [],
    };

    const latestTopic = createTopic("top_latest", "run_current");
    const historyTopics = Array.from({ length: 8 }, (_, i) => createTopic(`top_hist_${i + 1}`, "run_old", `2026-09-01T12:00:0${i}.000Z`));

    const { getByRole, getByText, queryByText } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[latestTopic, ...historyTopics]}
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

    expect(getByText(/Older Ideas History \(8\)/)).toBeDefined();

    // First 6 items should be visible
    expect(getByText("Title for top_hist_1")).toBeDefined();
    expect(getByText("Title for top_hist_6")).toBeDefined();
    // 7th and 8th items should NOT be visible initially
    expect(queryByText("Title for top_hist_7")).toBeNull();
    expect(queryByText("Title for top_hist_8")).toBeNull();

    // Click Show all (8) older ideas
    const showAllBtn = getByRole("button", { name: /Show all \(8\) older ideas/i });
    expect(showAllBtn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(showAllBtn);

    expect(showAllBtn.getAttribute("aria-expanded")).toBe("true");
    expect(getByText("Title for top_hist_7")).toBeDefined();
    expect(getByText("Title for top_hist_8")).toBeDefined();

    // Click Show less
    const showLessBtn = getByRole("button", { name: /Show less/i });
    fireEvent.click(showLessBtn);

    expect(queryByText("Title for top_hist_7")).toBeNull();
    expect(queryByText("Title for top_hist_8")).toBeNull();
  });

  it("toggles collapse and expand on entire history section header", () => {
    const latestRun: TopicRun = {
      run_id: "run_current",
      generated_at: "2026-09-08T12:00:00.000Z",
      target_episode_count: 1,
      target_short_reel_count: 0,
      shortages: [],
      candidates: [],
    };

    const latestTopic = createTopic("top_latest", "run_current");
    const historyTopic = createTopic("top_hist_col", "run_old");

    const { getByRole, getByText, queryByText } = render(
      <ChannelTopicsTab
        channel={mockChannel}
        topics={[latestTopic, historyTopic]}
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

    const collapseBtn = getByRole("button", { name: /Collapse older ideas history/i });
    expect(collapseBtn.getAttribute("aria-expanded")).toBe("true");
    expect(getByText("Title for top_hist_col")).toBeDefined();

    // Click collapse
    fireEvent.click(collapseBtn);

    expect(collapseBtn.getAttribute("aria-expanded")).toBe("false");
    expect(queryByText("Title for top_hist_col")).toBeNull();
    expect(getByText(/Section collapsed/i)).toBeDefined();

    // Click expand
    fireEvent.click(collapseBtn);

    expect(collapseBtn.getAttribute("aria-expanded")).toBe("true");
    expect(getByText("Title for top_hist_col")).toBeDefined();
  });
});
