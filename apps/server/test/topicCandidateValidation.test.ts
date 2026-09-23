import { describe, expect, it } from "vitest";
import { planTopicSuggestionMatrix, type TopicMatrixPlan } from "../src/context/topicMatrixPlanner.js";
import { ARCHETYPE_SLOT_DEFINITIONS } from "../src/context/topicMatrix.constants.js";
import { validateTopicCandidateSlots } from "../src/context/topicCandidateValidator.js";

function createValidMixedOutput(plan: TopicMatrixPlan) {
  const candidates = [
    {
      title: "Ancient Predators",
      premise: "Prehistoric apex hunters",
      why_it_fits: "High intrigue",
      hook: "What hunted before dinosaurs?",
      estimated_potential: "High",
      content_kind: "episode",
    },
    {
      title: "Shadow Beasts",
      premise: "Silhouette guessing",
      why_it_fits: "Visual curiosity",
      hook: "Can you guess the creature?",
      estimated_potential: "Viral",
      content_kind: "episode",
    },
    {
      title: "Ocean Myths",
      premise: "True or false deep sea myths",
      why_it_fits: "Myth busting",
      hook: "Is the kraken real?",
      estimated_potential: "High",
      content_kind: "episode",
    },
    {
      title: "Speed Blitz Titans",
      premise: "Rapid fire apex predators",
      why_it_fits: "Quick thrill",
      hook: "Name these beasts before time runs out!",
      estimated_potential: "High",
      content_kind: "episode",
    },
    {
      title: "Tiger vs Lion",
      premise: "Apex feline clash",
      why_it_fits: "Classic 1v1",
      hook: "Who is the true king?",
      estimated_potential: "Viral",
      content_kind: "short_reel",
    },
    {
      title: "Cosmic Mysteries",
      premise: "Mind-bending space questions",
      why_it_fits: "Curiosity snack",
      hook: "How fast is expansion?",
      estimated_potential: "High",
      content_kind: "short_reel",
    },
    {
      title: "Fact or Fiction: Deep Space",
      premise: "True or false about black holes",
      why_it_fits: "Engaging myth busting",
      hook: "Can sound travel in the void?",
      estimated_potential: "High",
      content_kind: "short_reel",
    },
    {
      title: "Grizzly vs Gorilla",
      premise: "Heavyweight animal showdown",
      why_it_fits: "High intensity match",
      hook: "Who wins this brute force clash?",
      estimated_potential: "Viral",
      content_kind: "short_reel",
    },
  ];
  return candidates.map((candidate, index) => ({
    ...candidate,
    archetype: plan.slots[index].archetype,
    topic_id: `topic-${index + 1}`,
    domain_id: plan.slots[index].domainId,
  }));
}

describe("validateTopicCandidateSlots", () => {
  const channelId = "ch_test_123";

  it("accepts a valid 4:4 mixed plan and assigns server-owned origins correctly with keyword", () => {
    const plan = planTopicSuggestionMatrix({ topicHint: "predators" });
    const raw = createValidMixedOutput(plan);

    const accepted = validateTopicCandidateSlots(raw, plan, channelId);

    expect(accepted).toHaveLength(8);
    expect(accepted.filter((t) => t.content_kind === "episode")).toHaveLength(4);
    expect(accepted.filter((t) => t.content_kind === "short_reel")).toHaveLength(4);

    const keywordTopics = accepted.filter((t) => t.origin === "keyword");
    expect(keywordTopics).toHaveLength(2);
    expect(keywordTopics.map((t) => t.content_kind)).toEqual(["episode", "short_reel"]);
    expect(keywordTopics[0].theme_hint).toBe("predators");
    expect(keywordTopics[1].theme_hint).toBe("predators");

    const discoveryTopics = accepted.filter((t) => t.origin === "discovery");
    expect(discoveryTopics).toHaveLength(6);
    for (const dt of discoveryTopics) {
      expect(dt.theme_hint).toBeUndefined();
    }
  });

  it("sets all 8 slots to discovery when no keyword hint is present", () => {
    const plan = planTopicSuggestionMatrix({});
    const raw = createValidMixedOutput(plan);

    const accepted = validateTopicCandidateSlots(raw, plan, channelId);
    expect(accepted.every((t) => t.origin === "discovery")).toBe(true);
    expect(accepted.every((t) => t.theme_hint === undefined)).toBe(true);
  });

  it("fails when candidate count is not 8 (e.g. 4, 6, 7, 9)", () => {
    const plan = planTopicSuggestionMatrix({});
    const valid = createValidMixedOutput(plan);

    expect(() => validateTopicCandidateSlots(valid.slice(0, 4), plan, channelId)).toThrow(/Expected exactly 8 topic candidates, got 4/);
    expect(() => validateTopicCandidateSlots(valid.slice(0, 6), plan, channelId)).toThrow(/Expected exactly 8 topic candidates, got 6/);
    expect(() => validateTopicCandidateSlots(valid.slice(0, 7), plan, channelId)).toThrow(/Expected exactly 8 topic candidates, got 7/);
    expect(() => validateTopicCandidateSlots([...valid, valid[0]], plan, channelId)).toThrow(/Expected exactly 8 topic candidates, got 9/);
  });

  it("fails when model returns all Episode concepts (relabeled outputs rejected)", () => {
    const plan = planTopicSuggestionMatrix({});
    const allEpisodes = createValidMixedOutput(plan).map((item) => ({
      ...item,
      content_kind: "episode",
    }));

    expect(() => validateTopicCandidateSlots(allEpisodes, plan, channelId)).toThrow(/expected assigned "short_reel"/);
  });

  it("fails when candidate archetype does not match slot plan", () => {
    const plan = planTopicSuggestionMatrix({ slotDefinitions: ARCHETYPE_SLOT_DEFINITIONS });
    const wrongArchetype = createValidMixedOutput(plan);
    // Slot 5 is versus_faceoff, set to mystery_reveal
    wrongArchetype[4] = { ...wrongArchetype[4], archetype: "mystery_reveal" };

    expect(() => validateTopicCandidateSlots(wrongArchetype, plan, channelId)).toThrow(
      /Slot 5 Short-Reel candidate has archetype "mystery_reveal", expected assigned "versus_faceoff"/,
    );
  });

  it("rejects missing required slot metadata instead of relabeling it", () => {
    const plan = planTopicSuggestionMatrix({});
    for (const field of ["content_kind", "archetype", "domain_id"] as const) {
      const output = createValidMixedOutput(plan);
      delete (output[4] as Record<string, unknown>)[field];
      expect(() => validateTopicCandidateSlots(output, plan, channelId)).toThrow(new RegExp(`Slot 5.*${field}`));
    }
  });

  it("rejects a domain that differs from the assigned slot", () => {
    const plan = planTopicSuggestionMatrix({});
    const output = createValidMixedOutput(plan);
    output[0] = { ...output[0], domain_id: "foreign-domain" };
    expect(() => validateTopicCandidateSlots(output, plan, channelId)).toThrow(/domain_id.*expected assigned/);
  });

  it("rejects duplicate model topic IDs", () => {
    const plan = planTopicSuggestionMatrix({});
    const output = createValidMixedOutput(plan);
    output[1] = { ...output[1], topic_id: output[0].topic_id };
    expect(() => validateTopicCandidateSlots(output, plan, channelId)).toThrow(/duplicate topic_id/);
  });

  it("fails when any candidate has blank or missing required text fields", () => {
    const plan = planTopicSuggestionMatrix({});

    const blankTitle = createValidMixedOutput(plan);
    blankTitle[0] = { ...blankTitle[0], title: "   " };
    expect(() => validateTopicCandidateSlots(blankTitle, plan, channelId)).toThrow(/empty or missing required text fields/);

    const missingHook = createValidMixedOutput(plan);
    delete (missingHook[2] as Record<string, unknown>).hook;
    expect(() => validateTopicCandidateSlots(missingHook, plan, channelId)).toThrow(/empty or missing required text fields/);
  });

  it("parses raw string with markdown JSON fences", () => {
    const plan = planTopicSuggestionMatrix({});
    const jsonString = "```json\n" + JSON.stringify({ candidates: createValidMixedOutput(plan) }) + "\n```";

    const accepted = validateTopicCandidateSlots(jsonString, plan, channelId);
    expect(accepted).toHaveLength(8);
  });
});
