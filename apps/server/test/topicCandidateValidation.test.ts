import { describe, expect, it } from "vitest";
import { planTopicSuggestionMatrix } from "../src/context/topicMatrixPlanner.js";
import { validateTopicCandidateSlots } from "../src/context/topicCandidateValidator.js";

function createValidMixedOutput(themeHint?: string) {
  const candidates = [
    {
      title: "Ancient Predators",
      premise: "Prehistoric apex hunters",
      why_it_fits: "High intrigue",
      hook: "What hunted before dinosaurs?",
      estimated_potential: "High",
      content_kind: "episode",
      archetype: "deep_trivia",
    },
    {
      title: "Shadow Beasts",
      premise: "Silhouette guessing",
      why_it_fits: "Visual curiosity",
      hook: "Can you guess the creature?",
      estimated_potential: "Viral",
      content_kind: "episode",
      archetype: "mystery_reveal",
    },
    {
      title: "Ocean Myths",
      premise: "True or false deep sea myths",
      why_it_fits: "Myth busting",
      hook: "Is the kraken real?",
      estimated_potential: "High",
      content_kind: "episode",
      archetype: "verdict_true_false",
    },
    {
      title: "Tiger vs Lion",
      premise: "Apex feline clash",
      why_it_fits: "Classic 1v1",
      hook: "Who is the true king?",
      estimated_potential: "Viral",
      content_kind: "short_reel",
      archetype: "versus_faceoff",
    },
    {
      title: "Cosmic Mysteries",
      premise: "Mind-bending space questions",
      why_it_fits: "Curiosity snack",
      hook: "How fast is expansion?",
      estimated_potential: "High",
      content_kind: "short_reel",
      archetype: "deep_trivia",
    },
  ];
  const plan = planTopicSuggestionMatrix({ topicHint: themeHint });
  return candidates.map((candidate, index) => ({
    ...candidate,
    topic_id: `topic-${index + 1}`,
    domain_id: plan.slots[index].domainId,
  }));
}

describe("validateTopicCandidateSlots", () => {
  const channelId = "ch_test_123";

  it("accepts a valid 3:2 mixed plan and assigns server-owned origins correctly with keyword", () => {
    const plan = planTopicSuggestionMatrix({ topicHint: "predators" });
    const raw = createValidMixedOutput("predators");

    const accepted = validateTopicCandidateSlots(raw, plan, channelId);

    expect(accepted).toHaveLength(5);
    expect(accepted.filter((t) => t.content_kind === "episode")).toHaveLength(3);
    expect(accepted.filter((t) => t.content_kind === "short_reel")).toHaveLength(2);

    const keywordTopics = accepted.filter((t) => t.origin === "keyword");
    expect(keywordTopics).toHaveLength(2);
    expect(keywordTopics.map((t) => t.content_kind)).toEqual(["episode", "short_reel"]);
    expect(keywordTopics[0].theme_hint).toBe("predators");
    expect(keywordTopics[1].theme_hint).toBe("predators");

    const discoveryTopics = accepted.filter((t) => t.origin === "discovery");
    expect(discoveryTopics).toHaveLength(3);
    for (const dt of discoveryTopics) {
      expect(dt.theme_hint).toBeUndefined();
    }
  });

  it("sets all 5 slots to discovery when no keyword hint is present", () => {
    const plan = planTopicSuggestionMatrix({});
    const raw = createValidMixedOutput();

    const accepted = validateTopicCandidateSlots(raw, plan, channelId);
    expect(accepted.every((t) => t.origin === "discovery")).toBe(true);
    expect(accepted.every((t) => t.theme_hint === undefined)).toBe(true);
  });

  it("fails when candidate count is not 5 (e.g. 3, 4, 6, 7)", () => {
    const plan = planTopicSuggestionMatrix({});
    const valid = createValidMixedOutput();

    expect(() => validateTopicCandidateSlots(valid.slice(0, 3), plan, channelId)).toThrow(/Expected exactly 5 topic candidates, got 3/);
    expect(() => validateTopicCandidateSlots(valid.slice(0, 4), plan, channelId)).toThrow(/Expected exactly 5 topic candidates, got 4/);
    expect(() => validateTopicCandidateSlots([...valid, valid[0]], plan, channelId)).toThrow(/Expected exactly 5 topic candidates, got 6/);
    expect(() => validateTopicCandidateSlots([...valid, valid[0], valid[1]], plan, channelId)).toThrow(
      /Expected exactly 5 topic candidates, got 7/,
    );
  });

  it("fails when model returns all 5 Episode concepts (relabeled outputs rejected)", () => {
    const plan = planTopicSuggestionMatrix({});
    const allEpisodes = createValidMixedOutput().map((item) => ({
      ...item,
      content_kind: "episode",
    }));

    expect(() => validateTopicCandidateSlots(allEpisodes, plan, channelId)).toThrow(/expected assigned "short_reel"/);
  });

  it("fails when candidate archetype does not match slot plan", () => {
    const plan = planTopicSuggestionMatrix({});
    const wrongArchetype = createValidMixedOutput();
    // Slot 4 is versus_faceoff, set to mystery_reveal
    wrongArchetype[3] = { ...wrongArchetype[3], archetype: "mystery_reveal" };

    expect(() => validateTopicCandidateSlots(wrongArchetype, plan, channelId)).toThrow(
      /Slot 4 Short-Reel candidate has archetype "mystery_reveal", expected assigned "versus_faceoff"/,
    );
  });

  it("rejects missing required slot metadata instead of relabeling it", () => {
    const plan = planTopicSuggestionMatrix({});
    for (const field of ["content_kind", "archetype", "domain_id"] as const) {
      const output = createValidMixedOutput();
      delete (output[3] as Record<string, unknown>)[field];
      expect(() => validateTopicCandidateSlots(output, plan, channelId)).toThrow(new RegExp(`Slot 4.*${field}`));
    }
  });

  it("rejects a domain that differs from the assigned slot", () => {
    const plan = planTopicSuggestionMatrix({});
    const output = createValidMixedOutput();
    output[0] = { ...output[0], domain_id: "foreign-domain" };
    expect(() => validateTopicCandidateSlots(output, plan, channelId)).toThrow(/domain_id.*expected assigned/);
  });

  it("rejects duplicate model topic IDs", () => {
    const plan = planTopicSuggestionMatrix({});
    const output = createValidMixedOutput();
    output[1] = { ...output[1], topic_id: output[0].topic_id };
    expect(() => validateTopicCandidateSlots(output, plan, channelId)).toThrow(/duplicate topic_id/);
  });

  it("fails when any candidate has blank or missing required text fields", () => {
    const plan = planTopicSuggestionMatrix({});

    const blankTitle = createValidMixedOutput();
    blankTitle[0] = { ...blankTitle[0], title: "   " };
    expect(() => validateTopicCandidateSlots(blankTitle, plan, channelId)).toThrow(/empty or missing required text fields/);

    const missingHook = createValidMixedOutput();
    delete (missingHook[2] as Record<string, unknown>).hook;
    expect(() => validateTopicCandidateSlots(missingHook, plan, channelId)).toThrow(/empty or missing required text fields/);
  });

  it("parses raw string with markdown JSON fences", () => {
    const plan = planTopicSuggestionMatrix({});
    const jsonString = "```json\n" + JSON.stringify({ candidates: createValidMixedOutput() }) + "\n```";

    const accepted = validateTopicCandidateSlots(jsonString, plan, channelId);
    expect(accepted).toHaveLength(5);
  });
});
