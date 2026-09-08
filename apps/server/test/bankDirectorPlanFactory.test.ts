import { describe, expect, it } from "vitest";
import type { TopicCandidate } from "@studio/shared";
import { mapToDirectorArchetype, resolveTargetLayoutForTopic } from "../src/quiz/bank/bridge/bankDirectorPlanFactory.js";

function topic(archetype: string): TopicCandidate {
  return {
    content_kind: "episode",
    topic_id: `topic-${archetype}`,
    channel_id: "channel-test",
    title: archetype,
    premise: "Premise",
    why_it_fits: "Fit",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: "2026-01-01T00:00:00Z",
    selected: false,
    question_count: 3,
    quiz_format: "knowledge",
    age_band: "family",
    visual_style: "flat_vector",
    archetype,
  } as TopicCandidate;
}

describe("bankDirectorPlanFactory portrait retirement", () => {
  it("rejects every 9:16 Episode layout resolution before archetype mapping", () => {
    expect(() => resolveTargetLayoutForTopic(topic("deep_trivia"), "9:16")).toThrow("Episode layouts support 16:9 landscape only");
  });

  it.each([
    ["verdict_true_false", "verdict_true_false"],
    ["versus_faceoff", "split_versus_two"],
    ["visual_spotting", "visual_choices_three_pure"],
    ["visual_identification", "visual_choices_three"],
    ["deep_trivia", "media_left_choices_right"],
    ["speed_blitz", "full_stack_list"],
  ])("maps %s to landscape layout %s", (archetype, layout) => {
    expect(resolveTargetLayoutForTopic(topic(archetype), "16:9")).toBe(layout);
  });

  it("keeps director archetype mapping independent of retired layouts", () => {
    expect(mapToDirectorArchetype("mystery_reveal")).toBe("mystery_reveal");
    expect(mapToDirectorArchetype("versus_faceoff")).toBe("visual_multiple_choice");
    expect(mapToDirectorArchetype("verdict_true_false")).toBe("true_false");
    expect(mapToDirectorArchetype("speed_blitz")).toBe("speed_round");
  });
});
