import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import {
  evaluateBankQuestionEligibility,
  evaluateEpisodeQuestionEligibility,
  evaluateShortReelQuestionEligibility,
} from "../src/quiz/bank/bankEligibility.js";

function question(overrides: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id: "q-1",
    archetype_id: "deep_trivia",
    domain_id: "science",
    subtopic_id: "space",
    language: "en",
    question: "Which planet is known as the red planet?",
    format: "multiple_choice",
    choices: [
      { id: "a", text: "Mars" },
      { id: "b", text: "Venus" },
      { id: "c", text: "Jupiter" },
    ],
    correct_choice_id: "a",
    explanation: "Mars has iron oxide on its surface.",
    fun_fact: "",
    age_band: "family",
    difficulty: 2,
    tags: ["space"],
    status: "approved",
    ...overrides,
  };
}

describe("bank eligibility policies", () => {
  it("accepts native language matching the Episode target", () => {
    expect(evaluateEpisodeQuestionEligibility(question(), { targetLanguage: "English" }).eligible).toBe(true);
  });

  it("requires explicit English source metadata and ignores stored translations", () => {
    const translated = question({
      language: undefined,
      translations: {
        en: {
          language: "en",
          question: "Which planet is red?",
          explanation: "Mars is red because of iron oxide.",
          choices: [
            { id: "a", text: "Mars" },
            { id: "b", text: "Venus" },
            { id: "c", text: "Jupiter" },
          ],
          verified: true,
        },
      },
    });
    expect(evaluateEpisodeQuestionEligibility(translated, { targetLanguage: "en" })).toMatchObject({
      eligible: false,
      reason: "MISSING_ENGLISH_SOURCE",
    });
    expect(evaluateEpisodeQuestionEligibility(question({ language: undefined }), { targetLanguage: "en" }).eligible).toBe(false);
  });

  it("requires approved English or verified English translation for Short-Reel", () => {
    expect(evaluateShortReelQuestionEligibility(question()).eligible).toBe(true);
    expect(evaluateShortReelQuestionEligibility(question({ language: "fr" })).eligible).toBe(false);
  });

  it("rejects incompatible format and malformed choices without fabricating", () => {
    const incompatible = evaluateBankQuestionEligibility(
      question({
        format: "true_false",
        choices: [
          { id: "a", text: "True" },
          { id: "b", text: "False" },
        ],
      }),
      {
        policy: "episode",
        targetLanguage: "en",
        expectedFormat: "multiple_choice",
      },
    );
    expect(incompatible).toMatchObject({ eligible: false, reason: "INCOMPATIBLE_FORMAT" });
    const malformed = evaluateBankQuestionEligibility(question({ choices: [{ id: "a", text: "Mars" }] }), {
      policy: "episode",
      targetLanguage: "en",
    });
    expect(malformed).toMatchObject({ eligible: false, reason: "INVALID_CHOICE_COUNT" });
  });

  it("does not coerce Vietnamese or foreign sources to English", () => {
    expect(evaluateEpisodeQuestionEligibility(question({ language: "vi" }), { targetLanguage: "en" })).toMatchObject({
      eligible: false,
      reason: "MISSING_ENGLISH_SOURCE",
    });
    expect(evaluateEpisodeQuestionEligibility(question(), { targetLanguage: "klingon_fake_lang" }).eligible).toBe(true);
    expect(evaluateEpisodeQuestionEligibility(question(), { targetLanguage: "fr" }).eligible).toBe(true);
  });

  it("rejects contradictory correctness flags", () => {
    expect(
      evaluateEpisodeQuestionEligibility(
        question({
          choices: [
            { id: "a", text: "Mars", is_correct: true },
            { id: "b", text: "Venus", is_correct: true },
            { id: "c", text: "Jupiter" },
          ],
        }),
        { targetLanguage: "en" },
      ),
    ).toMatchObject({ eligible: false, reason: "INCOMPATIBLE_CHOICES" });
    expect(
      evaluateEpisodeQuestionEligibility(
        question({
          choices: [
            { id: "a", text: "Mars", is_correct: false },
            { id: "b", text: "Venus", is_correct: false },
            { id: "c", text: "Jupiter" },
          ],
        }),
        { targetLanguage: "en" },
      ),
    ).toMatchObject({ eligible: false, reason: "INCOMPATIBLE_CHOICES" });
  });
});
