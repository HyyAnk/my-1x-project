import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { TopicCandidate } from "@studio/shared";
import { TopicHistorySection } from "./TopicHistorySection";

describe("TopicHistorySection", () => {
  afterEach(() => {
    cleanup();
  });

  const createEpisodeTopic = (id: string): TopicCandidate => ({
    topic_id: id,
    channel_id: "ch_test",
    content_kind: "episode",
    origin: "discovery",
    age_band: "family",
    archetype: "deep_trivia",
    title: `Title ${id}`,
    premise: `Premise ${id}`,
    why_it_fits: "Fits audience",
    hook: `Hook ${id}`,
    estimated_potential: "High",
    generated_at: "2026-09-08T12:00:00.000Z",
    selected: false,
    quiz_format: "multiple_choice",
    question_count: 5,
    visual_style: "pixar_3d",
  });

  const createShortTopic = (id: string): TopicCandidate => ({
    topic_id: id,
    channel_id: "ch_test",
    content_kind: "short_reel",
    aspect_ratio: "9:16",
    origin: "discovery",
    archetype: "deep_trivia",
    title: `Title ${id}`,
    premise: `Premise ${id}`,
    why_it_fits: "Fits audience",
    hook: `Hook ${id}`,
    estimated_potential: "High",
    generated_at: "2026-09-08T12:00:00.000Z",
    selected: false,
    question_count: 1,
  });

  it("renders format filter tabs with correct metrics and switches filters", () => {
    const topics = [createEpisodeTopic("ep_1"), createEpisodeTopic("ep_2"), createShortTopic("short_1")];

    const { getByRole, getByText, queryByText } = render(
      <TopicHistorySection
        historyTopics={topics}
        latestRunTopicsCount={2}
        availabilityMap={new Map()}
        confirmingTopicId={null}
        onConfirmTopic={vi.fn()}
      />,
    );

    // Filter tabs
    const allTab = getByRole("tab", { name: /All/i });
    const epTab = getByRole("tab", { name: /16:9 Episodes/i });
    const shortTab = getByRole("tab", { name: /9:16 Shorts/i });

    expect(allTab.textContent).toContain("(3)");
    expect(epTab.textContent).toContain("(2)");
    expect(shortTab.textContent).toContain("(1)");

    expect(getByText("Title ep_1")).toBeDefined();
    expect(getByText("Title short_1")).toBeDefined();

    // Select Short tab
    fireEvent.click(shortTab);
    expect(shortTab.classList.contains("is-active")).toBe(true);
    expect(queryByText("Title ep_1")).toBeNull();
    expect(getByText("Title short_1")).toBeDefined();
  });

  it("renders empty filter state when no topics match the chosen format", () => {
    const topics = [createEpisodeTopic("ep_1")];

    const { getByRole, getByText, queryByText } = render(
      <TopicHistorySection
        historyTopics={topics}
        latestRunTopicsCount={0}
        availabilityMap={new Map()}
        confirmingTopicId={null}
        onConfirmTopic={vi.fn()}
      />,
    );

    const shortTab = getByRole("tab", { name: /9:16 Shorts/i });
    fireEvent.click(shortTab);

    expect(queryByText("Title ep_1")).toBeNull();
    expect(getByText(/No 9:16 Shorts in history archive\./i)).toBeDefined();
  });

  it("toggles whole section expansion when header collapse button is clicked", () => {
    const topics = [createEpisodeTopic("ep_1")];

    const { getByRole, getByText, queryByText } = render(
      <TopicHistorySection
        historyTopics={topics}
        latestRunTopicsCount={0}
        availabilityMap={new Map()}
        confirmingTopicId={null}
        onConfirmTopic={vi.fn()}
      />,
    );

    const collapseBtn = getByRole("button", { name: /Collapse older ideas history/i });
    expect(collapseBtn.getAttribute("aria-expanded")).toBe("true");

    // Collapse
    fireEvent.click(collapseBtn);
    expect(collapseBtn.getAttribute("aria-expanded")).toBe("false");
    expect(queryByText("Title ep_1")).toBeNull();
    expect(getByText(/Section collapsed/i)).toBeDefined();

    // Re-expand
    fireEvent.click(collapseBtn);
    expect(collapseBtn.getAttribute("aria-expanded")).toBe("true");
    expect(getByText("Title ep_1")).toBeDefined();
  });
});
