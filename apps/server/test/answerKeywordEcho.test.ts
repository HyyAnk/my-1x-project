import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import { findAnswerKeywordEchoes, stemKeyword } from "../src/quiz/bank/autoQa/answerKeywordEcho.js";
import { detectStemAnswerLeak } from "../src/quiz/bank/autoQa/stemLeakDetector.js";
import { evaluateEpisodeQuestionEligibility } from "../src/quiz/bank/bankEligibility.js";

function bankQuestion(overrides: Partial<BankQuestion>): BankQuestion {
  return {
    id: "ECHO-Q-001",
    archetype_id: "visual_spotting",
    domain_id: "vehicles_technology",
    subtopic_id: "aircraft",
    language: "en",
    format: "multiple_choice",
    question: "Placeholder question?",
    choices: [
      { id: "A", text: "Option A", is_correct: true },
      { id: "B", text: "Option B", is_correct: false },
      { id: "C", text: "Option C", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "A detailed explanation of the answer.",
    fun_fact: "",
    age_band: "family",
    difficulty: 2,
    tags: [],
    status: "approved",
    ...overrides,
  };
}

describe("answer keyword echo detection", () => {
  it("stems inflected forms to a shared root", () => {
    expect(stemKeyword("glides")).toBe(stemKeyword("glider"));
    expect(stemKeyword("forests")).toBe("forest");
  });

  it("finds inflected and compound echoes of the correct answer", () => {
    expect(
      findAnswerKeywordEchoes("Two burn heavy fuel to fly, but which one glides engine-free?", "Hang Glider", ["Jet", "Airliner"]),
    ).toEqual(["glid"]);
    expect(findAnswerKeywordEchoes("Name the timepiece worn strapped to wrists!", "Wristwatch", [])).toEqual(["wristwatch"]);
  });

  it("ignores words shared with a distractor because they do not single out the answer", () => {
    expect(
      findAnswerKeywordEchoes("Which biologist studies life in the deep sea?", "Marine Biologist", ["Field Biologist", "Botanist"]),
    ).toEqual([]);
  });

  it("allows a category head noun when the answer is revealed without distractors", () => {
    const stem = "Thriving in freshwater rivers, what blunt-nosed shark is hiding here?";
    expect(findAnswerKeywordEchoes(stem, "Bull Shark", [], { allowCategoryHeadNoun: true })).toEqual([]);
    expect(findAnswerKeywordEchoes(stem, "Bull Shark", [])).toEqual(["shark"]);
  });

  it("flags a semantic giveaway in a multiple-choice stem", () => {
    const issue = detectStemAnswerLeak(
      bankQuestion({
        question: "Two battle city fires, but which one protects vast wild forests?",
        choices: [
          { id: "A", text: "Firefighter", is_correct: false },
          { id: "B", text: "Forest Ranger", is_correct: true },
          { id: "C", text: "Smokejumper", is_correct: false },
        ],
        correct_choice_id: "B",
      }),
    );
    expect(issue?.details?.leakType).toBe("keyword_echo_leak");
    expect(issue?.details?.echoedKeywords).toEqual(["forest"]);
  });

  it("does not flag speed blitz riddles that deliberately repeat the answer unit", () => {
    const issue = detectStemAnswerLeak(
      bankQuestion({
        archetype_id: "speed_blitz",
        question: "If 3 students fill 3 notebooks in 3 days, how many days for 9 to fill 9?",
        choices: [
          { id: "A", text: "3 days", is_correct: true },
          { id: "B", text: "9 days", is_correct: false },
          { id: "C", text: "27 days", is_correct: false },
        ],
      }),
    );
    expect(issue).toBeNull();
  });

  it("ignores a trailing disambiguation qualifier on the correct choice", () => {
    const issue = detectStemAnswerLeak(
      bankQuestion({
        archetype_id: "visual_identification",
        question: "In The Matrix, which cyber hero in a black coat can dodge bullets?",
        choices: [
          { id: "A", text: "Neo (The Matrix)", is_correct: true },
          { id: "B", text: "Morpheus", is_correct: false },
          { id: "C", text: "Trinity", is_correct: false },
        ],
      }),
    );
    expect(issue).toBeNull();
  });
});

describe("bank selection blocks answer leaks", () => {
  it("rejects a question whose stem names the correct answer", () => {
    const result = evaluateEpisodeQuestionEligibility(
      bankQuestion({
        archetype_id: "deep_trivia",
        question: "In Shrek, who famously explains to Donkey that ogres have layers?",
        choices: [
          { id: "A", text: "Shrek", is_correct: true },
          { id: "B", text: "Lord Farquaad", is_correct: false },
          { id: "C", text: "Puss in Boots", is_correct: false },
        ],
      }),
      { targetLanguage: "en" },
    );
    expect(result).toMatchObject({ eligible: false, reason: "ANSWER_LEAKED_IN_STEM" });
  });

  it("keeps a clean question eligible", () => {
    const result = evaluateEpisodeQuestionEligibility(
      bankQuestion({
        archetype_id: "deep_trivia",
        question: "In the DreamWorks fairy-tale swamp, who explains to Donkey that ogres have layers?",
        choices: [
          { id: "A", text: "Shrek", is_correct: true },
          { id: "B", text: "Lord Farquaad", is_correct: false },
          { id: "C", text: "Puss in Boots", is_correct: false },
        ],
      }),
      { targetLanguage: "en" },
    );
    expect(result.eligible).toBe(true);
  });
});

describe("topic sources bound before answer-leak screening", () => {
  it("stay eligible at confirmation when the caller grandfathers stem leaks", () => {
    const leaked = bankQuestion({
      archetype_id: "deep_trivia",
      question: "In Shrek, who famously explains to Donkey that ogres have layers?",
      choices: [
        { id: "A", text: "Shrek", is_correct: true },
        { id: "B", text: "Lord Farquaad", is_correct: false },
        { id: "C", text: "Puss in Boots", is_correct: false },
      ],
    });
    expect(evaluateEpisodeQuestionEligibility(leaked, { targetLanguage: "en", allowStemLeak: true }).eligible).toBe(true);
    expect(evaluateEpisodeQuestionEligibility(leaked, { targetLanguage: "en" })).toMatchObject({
      eligible: false,
      reason: "ANSWER_LEAKED_IN_STEM",
    });
  });
});
