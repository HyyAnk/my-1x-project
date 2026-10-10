import { describe, expect, it } from "vitest";
import type { BankQuestion, TopicCandidate } from "@studio/shared";
import { allocateSourceBackedTopicSlots } from "../src/context/bankTopicAllocation.js";
import { validateTopicCandidateResponse } from "../src/context/topicCandidateValidator.js";
import { selectRecentTopicTitles } from "../src/context/existingTopicTitles.js";
import { DEFAULT_ESTIMATED_POTENTIAL } from "../src/context/candidate/slotSupportingCopy.js";

function makeQuestion(id: string): BankQuestion {
  const choices = [
    { id: "a", text: "Choice A" },
    { id: "b", text: "Choice B" },
    { id: "c", text: "Choice C" },
  ];
  return {
    id,
    archetype_id: "deep_trivia",
    domain_id: "space_earth",
    subtopic_id: "solar_system",
    language: "en",
    question: `What is the fact about ${id}?`,
    format: "multiple_choice",
    choices,
    correct_choice_id: "a",
    explanation: `Because ${id} is true.`,
    fun_fact: "Fun fact!",
    age_band: "7-9",
    difficulty: 2,
    tags: ["space"],
    status: "approved",
    created_at: "2026-09-08T00:00:00Z",
    updated_at: "2026-09-08T00:00:00Z",
  } as BankQuestion;
}

function topic(title: string, generatedAt: string): TopicCandidate {
  return { title, generated_at: generatedAt } as TopicCandidate;
}

describe("selectRecentTopicTitles", () => {
  it("returns unique titles newest first and caps the list", () => {
    const topics = [
      topic("Oldest", "2026-09-01T00:00:00Z"),
      topic("Newest", "2026-10-01T00:00:00Z"),
      topic("Middle", "2026-09-15T00:00:00Z"),
      topic("Newest", "2026-08-01T00:00:00Z"),
      topic("  ", "2026-10-02T00:00:00Z"),
    ];
    expect(selectRecentTopicTitles(topics)).toEqual(["Newest", "Middle", "Oldest"]);
    expect(selectRecentTopicTitles(topics, 2)).toEqual(["Newest", "Middle"]);
  });
});

describe("source-backed topic candidates without supporting copy", () => {
  const allocation = allocateSourceBackedTopicSlots({
    questions: Array.from({ length: 8 }, (_, i) => makeQuestion(`q_${i + 1}`)),
    scanStatus: "complete_nonempty",
    channelId: "channel_1",
  });
  const slot = allocation.allocatedSlots[0];

  it("derives why_it_fits and estimated_potential from the allocated slot", () => {
    const run = validateTopicCandidateResponse({
      rawOutput: [{ slot_id: slot.slotId, title: "Journey Into The Cosmos", premise: "A trip through space.", hook: "Ready?" }],
      allocatedSlots: allocation.allocatedSlots,
      channelId: "channel_1",
      shortages: allocation.shortages,
    });
    const candidate = run.candidates[0];
    expect(candidate.why_it_fits).toBe(`Built from ${slot.questionCount} approved ${slot.domainTitle} questions in the Question Bank.`);
    expect(candidate.estimated_potential).toBe(DEFAULT_ESTIMATED_POTENTIAL);
  });

  it("keeps supporting copy the model chose to provide", () => {
    const run = validateTopicCandidateResponse({
      rawOutput: [
        {
          slot_id: slot.slotId,
          title: "Journey Into The Cosmos",
          premise: "A trip through space.",
          hook: "Ready?",
          why_it_fits: "Space fans love it",
          estimated_potential: "High",
        },
      ],
      allocatedSlots: allocation.allocatedSlots,
      channelId: "channel_1",
      shortages: allocation.shortages,
    });
    expect(run.candidates[0].why_it_fits).toBe("Space fans love it");
    expect(run.candidates[0].estimated_potential).toBe("High");
  });

  it("still rejects candidates missing creative copy", () => {
    expect(() =>
      validateTopicCandidateResponse({
        rawOutput: [{ slot_id: slot.slotId, title: "Journey Into The Cosmos", premise: "A trip through space." }],
        allocatedSlots: allocation.allocatedSlots,
        channelId: "channel_1",
        shortages: allocation.shortages,
      }),
    ).toThrow(/missing required text fields/);
  });
});
