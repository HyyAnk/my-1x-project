import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { TopicAvailability, TopicCandidate } from "@studio/shared";
import { TopicHistoryRow } from "./topicHistory/TopicHistoryRow";

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
    domain_id: "space_earth",
  };

  it("renders 16:9 landscape format pill, index, domain badge, and layout preview for episode topics", () => {
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

    const domainBadge = container.querySelector(".topic-domain-badge");
    expect(domainBadge).not.toBeNull();
    expect(domainBadge?.textContent).toContain("Space Earth");

    const layoutButton = container.querySelector(".topic-layout-badge-btn");
    expect(layoutButton).not.toBeNull();
  });

  it("renders 9:16 vertical format pill, short_reel archetype tag, and domain badge for short_reel topics", () => {
    const shortReelTopic: TopicCandidate = {
      ...baseTopic,
      content_kind: "short_reel",
      aspect_ratio: "9:16",
      question_count: 1,
      archetype: "versus_faceoff",
      domain_id: "nature_animals",
    };

    const { container, getByText } = render(
      <TopicHistoryRow topic={shortReelTopic} index={2} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    expect(getByText("#02")).toBeDefined();
    const formatPill = container.querySelector(".topic-format-pill");
    expect(formatPill).not.toBeNull();
    expect(formatPill?.textContent).toBe("9:16");
    expect(formatPill?.classList.contains("is-vertical")).toBe(true);

    const archetypeTag = container.querySelector(".topic-archetype-tag");
    expect(archetypeTag).not.toBeNull();
    expect(archetypeTag?.textContent).toBe("Versus Face-off");

    const domainBadge = container.querySelector(".topic-domain-badge");
    expect(domainBadge?.textContent).toContain("Nature Animals");

    // Layout preview button is not rendered for short_reel
    const previewButton = container.querySelector(".topic-layout-badge-btn");
    expect(previewButton).toBeNull();
  });

  it("renders empty domain placeholder when domain_id is not specified", () => {
    const noDomainTopic: TopicCandidate = {
      ...baseTopic,
      domain_id: undefined,
    };

    const { container } = render(
      <TopicHistoryRow topic={noDomainTopic} index={1} busy={false} disabled={false} onConfirm={vi.fn()} />,
    );

    const emptyDomain = container.querySelector(".topic-domain-empty");
    expect(emptyDomain).not.toBeNull();
    expect(emptyDomain?.textContent).toBe("—");
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
});
