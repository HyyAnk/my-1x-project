import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import type { TopicCandidate } from "@studio/shared";
import { TopicCard } from "./TopicCard";

describe("TopicCard", () => {
  afterEach(() => {
    cleanup();
  });

  const baseTopic: TopicCandidate = {
    topic_id: "topic_science_001",
    channel_id: "channel_123",
    content_kind: "episode",
    origin: "discovery",
    title: "Ancient Space Mysteries",
    premise: "Exploring forgotten cosmic events",
    why_it_fits: "High viewer retention in astronomy",
    hook: "Did you know planets can wander across interstellar space?",
    estimated_potential: "9.5/10 Viral Score",
    generated_at: "2026-09-05T12:00:00.000Z",
    selected: false,
    quiz_format: "multiple_choice",
    question_count: 5,
    age_band: "7-9",
    visual_style: "pixar_3d",
    domain_id: "astronomy_and_cosmos",
    archetype: "deep_trivia",
    suggested_layout: "media_left_choices_right",
  };

  it("renders Domain badge with formatted domain name when domain_id is provided", () => {
    const { container, getByText } = render(<TopicCard topic={baseTopic} onConfirm={vi.fn()} busy={false} disabled={false} />);

    const badge = container.querySelector(".topic-domain-badge");
    expect(badge).not.toBeNull();
    expect(getByText(/Astronomy And Cosmos/)).toBeDefined();
  });

  it("does not render Domain badge when domain_id is omitted", () => {
    const topicWithoutDomain: TopicCandidate = {
      ...baseTopic,
      domain_id: undefined,
    };

    const { container } = render(<TopicCard topic={topicWithoutDomain} onConfirm={vi.fn()} busy={false} disabled={false} />);

    const badge = container.querySelector(".topic-domain-badge");
    expect(badge).toBeNull();
  });

  it("acts as a clickable card and calls onConfirm with question count and visual style on click", () => {
    const onConfirmMock = vi.fn();
    const { getByRole } = render(<TopicCard topic={baseTopic} onConfirm={onConfirmMock} busy={false} disabled={false} />);

    const cardButton = getByRole("button", { name: /Select topic: Ancient Space Mysteries/i });
    expect(cardButton).toBeDefined();
    expect(cardButton.className).toContain("topic-card");
    expect(cardButton.className).toContain("is-clickable");

    fireEvent.click(cardButton);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(onConfirmMock).toHaveBeenCalledWith(5, "pixar_3d");
  });

  it("omits why-it-fits, premise text, question pickers, and potential rating from streamlined card", () => {
    const { queryByText, queryByLabelText } = render(
      <TopicCard topic={baseTopic} onConfirm={vi.fn()} busy={false} disabled={false} />,
    );

    expect(queryByText("High viewer retention in astronomy")).toBeNull();
    expect(queryByText("Exploring forgotten cosmic events")).toBeNull();
    expect(queryByText("9.5/10 Viral Score")).toBeNull();
    expect(queryByLabelText(/Question count/i)).toBeNull();
  });

  it("displays spinner and 'Selecting Topic…' when busy is true", () => {
    const onConfirmMock = vi.fn();
    const { getByRole, getByText } = render(<TopicCard topic={baseTopic} onConfirm={onConfirmMock} busy={true} disabled={false} />);

    const busyCard = getByRole("button", { name: /Select topic: Ancient Space Mysteries/i });
    expect(busyCard).toBeDefined();
    expect(busyCard.className).toContain("is-busy");
    expect(getByText(/Selecting Topic…/i)).toBeDefined();

    fireEvent.click(busyCard);
    expect(onConfirmMock).not.toHaveBeenCalled();
  });
});
