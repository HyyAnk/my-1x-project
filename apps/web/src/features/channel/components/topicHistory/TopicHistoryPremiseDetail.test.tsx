import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { TopicCandidate } from "@studio/shared";
import { TopicHistoryPremiseDetail } from "./TopicHistoryPremiseDetail";

describe("TopicHistoryPremiseDetail", () => {
  afterEach(() => {
    cleanup();
  });
  const sampleTopic: TopicCandidate = {
    topic_id: "top_sample_01",
    channel_id: "ch_test",
    content_kind: "episode",
    origin: "discovery",
    age_band: "family",
    archetype: "deep_trivia",
    title: "Space Exploration",
    premise: "Detailed overview of Mars missions and beyond",
    why_it_fits: "High audience interest",
    hook: "Can we colonize Mars in our lifetime?",
    estimated_potential: "High",
    generated_at: "2026-09-08T12:00:00.000Z",
    selected: false,
    quiz_format: "multiple_choice",
    question_count: 5,
    visual_style: "pixar_3d",
  };

  it("renders full premise, archetype, hook, audience fit, and format details in an accessible region", () => {
    const { getByRole, getByText } = render(<TopicHistoryPremiseDetail topic={sampleTopic} formatLabel="16:9 Landscape" format="16:9" />);

    const region = getByRole("region", { name: /Premise details for Space Exploration/i });
    expect(region).toBeDefined();
    expect(region.getAttribute("id")).toBe("topic-premise-top_sample_01");

    expect(getByText("Detailed overview of Mars missions and beyond")).toBeDefined();
    expect(getByText("deep trivia")).toBeDefined();
    expect(getByText('"Can we colonize Mars in our lifetime?"')).toBeDefined();
    expect(getByText("High audience interest")).toBeDefined();
    expect(getByText("16:9 Landscape (16:9) • 5 Questions")).toBeDefined();
  });
});
