import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { TopicAvailability, TopicCandidate } from "@studio/shared";
import { TopicHistoryRow } from "./TopicHistoryRow";

describe("TopicHistoryRow", () => {
  afterEach(() => {
    cleanup();
  });

  const baseTopic: TopicCandidate = {
    topic_id: "top_test_01",
    channel_id: "ch_test",
    content_kind: "episode",
    origin: "discovery",
    age_band: "family",
    archetype: "deep_trivia",
    title: "The Mystery of Black Holes",
    premise: "Exploring event horizons and space-time curvature",
    why_it_fits: "Engages curious science audiences",
    hook: "What really happens if you cross the event horizon?",
    estimated_potential: "High",
    generated_at: "2026-09-08T12:00:00.000Z",
    selected: false,
    quiz_format: "multiple_choice",
    question_count: 5,
    visual_style: "pixar_3d",
    theme_hint: "Astrophysics",
  };

  it("renders 16:9 landscape format pill and index for episode topics", () => {
    const { container, getByText } = render(
      <TopicHistoryRow topic={baseTopic} index={1} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    expect(getByText("#01")).toBeDefined();
    const formatPill = container.querySelector(".topic-format-pill");
    expect(formatPill).not.toBeNull();
    expect(formatPill?.textContent).toBe("16:9");
    expect(formatPill?.classList.contains("is-landscape")).toBe(true);
    expect(getByText("The Mystery of Black Holes")).toBeDefined();
    expect(getByText("🎯 Astrophysics")).toBeDefined();
  });

  it("renders 9:16 vertical format pill for short_reel topics without layout preview button", () => {
    const shortReelTopic: TopicCandidate = {
      ...baseTopic,
      content_kind: "short_reel",
      aspect_ratio: "9:16",
      question_count: 1,
      archetype: "deep_trivia",
    };

    const { container, getByText } = render(
      <TopicHistoryRow topic={shortReelTopic} index={2} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    expect(getByText("#02")).toBeDefined();
    const formatPill = container.querySelector(".topic-format-pill");
    expect(formatPill).not.toBeNull();
    expect(formatPill?.textContent).toBe("9:16");
    expect(formatPill?.classList.contains("is-vertical")).toBe(true);

    const previewButton = container.querySelector(".topic-layout-badge-btn");
    expect(previewButton).toBeNull();
  });

  it("renders ready availability pill with is-ready class when confirmation is available", () => {
    const availability: TopicAvailability = {
      topic_id: "top_test_01",
      content_kind: "episode",
      can_confirm: true,
      reason_code: "AVAILABLE",
      retryable: false,
      recovery_action: "Ready to confirm",
      source_capacity: 10,
    };

    const { container, getByText } = render(
      <TopicHistoryRow topic={baseTopic} index={1} availability={availability} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    const statusPill = container.querySelector(".topic-history-status");
    expect(statusPill).not.toBeNull();
    expect(statusPill?.textContent).toBe("10 Ready");
    expect(statusPill?.classList.contains("is-ready")).toBe(true);
    expect(getByText("10 Ready")).toBeDefined();
  });

  it("renders unbound availability pill with is-unbound class for legacy topics", () => {
    const availability: TopicAvailability = {
      topic_id: "top_test_01",
      content_kind: "episode",
      can_confirm: false,
      reason_code: "UNBOUND_LEGACY_TOPIC",
      retryable: false,
      recovery_action: "Requires manual questions binding",
      source_capacity: 0,
    };

    const { container, getByText } = render(
      <TopicHistoryRow topic={baseTopic} index={1} availability={availability} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    const statusPill = container.querySelector(".topic-history-status");
    expect(statusPill).not.toBeNull();
    expect(statusPill?.textContent).toBe("Legacy Unbound");
    expect(statusPill?.classList.contains("is-unbound")).toBe(true);
    expect(getByText("Legacy Unbound")).toBeDefined();
  });

  it("disables select button when topic cannot be confirmed", () => {
    const availability: TopicAvailability = {
      topic_id: "top_test_01",
      content_kind: "episode",
      can_confirm: false,
      reason_code: "NO_ELIGIBLE_SOURCES",
      retryable: false,
      recovery_action: "Generate more questions",
      source_capacity: 0,
    };

    const onConfirmMock = vi.fn();

    const { getByRole } = render(
      <TopicHistoryRow topic={baseTopic} index={1} availability={availability} busy={false} disabled={false} onConfirm={onConfirmMock} />,
    );

    const selectBtn = getByRole("button", { name: /Select topic/i }) as HTMLButtonElement;
    expect(selectBtn.disabled).toBe(true);

    fireEvent.click(selectBtn);
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it("invokes onConfirm when select button is clicked for confirmable topics", () => {
    const availability: TopicAvailability = {
      topic_id: "top_test_01",
      content_kind: "episode",
      can_confirm: true,
      reason_code: "AVAILABLE",
      retryable: false,
      recovery_action: "Ready to confirm",
      source_capacity: 5,
    };

    const onConfirmMock = vi.fn();

    const { getByRole } = render(
      <TopicHistoryRow topic={baseTopic} index={3} availability={availability} busy={false} disabled={false} onConfirm={onConfirmMock} />,
    );

    const selectBtn = getByRole("button", { name: /Select topic/i });
    fireEvent.click(selectBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(onConfirmMock).toHaveBeenCalledWith(5, "pixar_3d");
  });

  it("displays busy state correctly during topic selection", () => {
    const { getByText, container } = render(
      <TopicHistoryRow topic={baseTopic} index={1} busy={true} disabled={false} onConfirm={vi.fn()} />,
    );

    expect(getByText("Selecting…")).toBeDefined();
    expect(container.querySelector(".spin")).not.toBeNull();
  });

  it("toggles expandable premise preview when expand button is clicked", () => {
    const { container, getByRole, getByText } = render(
      <TopicHistoryRow topic={baseTopic} index={1} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    const expandBtn = getByRole("button", { name: /Expand premise preview/i });
    expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".topic-history-premise-expanded")).toBeNull();

    // Click to expand
    fireEvent.click(expandBtn);

    expect(expandBtn.getAttribute("aria-expanded")).toBe("true");
    const expandedPanel = container.querySelector(".topic-history-premise-expanded");
    expect(expandedPanel).not.toBeNull();
    expect(getByText(baseTopic.premise)).toBeDefined();
    expect(getByText(`"${baseTopic.hook}"`)).toBeDefined();
    expect(getByText("deep trivia")).toBeDefined();

    // Click to collapse
    fireEvent.click(expandBtn);
    expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".topic-history-premise-expanded")).toBeNull();
  });

  it("expands premise preview when clicking on premise snippet", () => {
    const { container, getByText } = render(
      <TopicHistoryRow topic={baseTopic} index={1} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    const snippet = container.querySelector(".topic-history-premise-snippet");
    expect(snippet).not.toBeNull();
    if (snippet) {
      fireEvent.click(snippet);
    }

    expect(container.querySelector(".topic-history-premise-expanded")).not.toBeNull();
    expect(getByText(baseTopic.premise)).toBeDefined();
  });
});
