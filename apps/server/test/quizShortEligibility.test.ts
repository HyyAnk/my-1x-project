import { describe, expect, it } from "vitest";
import type { BankQuestion, BankQuestionWithCooldown } from "@studio/shared";
import { evaluateQuizShortQuestionEligibility } from "../src/quiz/bank/bankEligibility.js";
import {
  QUIZ_SHORT_MAX_CHOICE_CHARS,
  QUIZ_SHORT_MAX_QUESTION_CHARS,
  findQuizShortRuleViolation,
} from "../src/quiz/bank/quizShortEligibilityRules.js";

function question(overrides: Partial<BankQuestionWithCooldown> = {}): BankQuestionWithCooldown {
  return {
    id: "qs-1",
    archetype_id: "deep_trivia",
    domain_id: "space_earth",
    subtopic_id: "planets",
    language: "en",
    question: "Which planet has the most moons?",
    format: "multiple_choice",
    choices: [
      { id: "a", text: "Saturn" },
      { id: "b", text: "Jupiter" },
      { id: "c", text: "Neptune" },
    ],
    correct_choice_id: "a",
    explanation: "Saturn passed Jupiter in 2023.",
    fun_fact: "",
    age_band: "7-9",
    difficulty: 2,
    tags: ["space"],
    status: "approved",
    ...overrides,
  };
}

describe("Quiz Short bank eligibility policy", () => {
  it("accepts an approved, short, English question with three choices", () => {
    const result = evaluateQuizShortQuestionEligibility(question(), { targetArchetype: "deep_trivia" });
    expect(result.eligible).toBe(true);
    if (result.eligible) {
      expect(result.candidate.selectedAnswerText).toBe("Saturn");
      expect(result.candidate.resolvedLanguage).toBe("en");
    }
  });

  it("accepts two-choice Yes/No questions and does not require an explanation", () => {
    const yesNo = question({
      archetype_id: "verdict_yes_no",
      format: "yes_no",
      explanation: "",
      choices: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
      ],
      correct_choice_id: "yes",
    });
    expect(evaluateQuizShortQuestionEligibility(yesNo, { targetArchetype: "verdict_yes_no" }).eligible).toBe(true);
    expect(evaluateQuizShortQuestionEligibility(yesNo).eligible).toBe(true);
  });

  it("rejects questions that are not approved, in cooldown, or mismatched with the target archetype", () => {
    expect(evaluateQuizShortQuestionEligibility(question({ status: "draft" }))).toMatchObject({ eligible: false, reason: "NOT_APPROVED" });
    expect(
      evaluateQuizShortQuestionEligibility(
        question({ channel_cooldown: { is_cooldown: true, days_remaining: 3, last_used_at: "2026-10-01T00:00:00.000Z" } }),
      ),
    ).toMatchObject({ eligible: false, reason: "IN_COOLDOWN" });
    expect(evaluateQuizShortQuestionEligibility(question(), { targetArchetype: "versus_faceoff" })).toMatchObject({
      eligible: false,
      reason: "ARCHETYPE_MISMATCH",
    });
  });

  it("rejects question text longer than the portrait budget", () => {
    const longStem = `${"Which planet ".repeat(8)}has the most moons?`;
    expect(longStem.length).toBeGreaterThan(QUIZ_SHORT_MAX_QUESTION_CHARS);
    expect(evaluateQuizShortQuestionEligibility(question({ question: longStem }))).toMatchObject({
      eligible: false,
      reason: "TEXT_TOO_LONG_FOR_SHORT",
    });
  });

  it("rejects any choice longer than the portrait budget", () => {
    const longChoice = "The ringed gas giant orbiting far beyond Mars";
    expect(longChoice.length).toBeGreaterThan(QUIZ_SHORT_MAX_CHOICE_CHARS);
    const result = evaluateQuizShortQuestionEligibility(
      question({
        choices: [
          { id: "a", text: "Saturn" },
          { id: "b", text: longChoice },
          { id: "c", text: "Neptune" },
        ],
      }),
    );
    expect(result).toMatchObject({ eligible: false, reason: "TEXT_TOO_LONG_FOR_SHORT" });
    if (!result.eligible) expect(result.detail).toContain('Choice "b"');
  });

  it("rejects one-choice Mystery Reveal questions even without a target archetype", () => {
    const mystery = question({ archetype_id: "mystery_reveal", format: "image_guess", choices: [{ id: "a", text: "Owl" }] });
    expect(evaluateQuizShortQuestionEligibility(mystery)).toMatchObject({ eligible: false, reason: "INVALID_CHOICE_COUNT" });
  });

  it("keeps the kid-safety and English-source guards of the Episode policy", () => {
    expect(evaluateQuizShortQuestionEligibility(question({ language: "vi" }))).toMatchObject({
      eligible: false,
      reason: "MISSING_ENGLISH_SOURCE",
    });
    expect(evaluateQuizShortQuestionEligibility(question({ question: "In Death Note, who owns the notebook?" }))).toMatchObject({
      eligible: false,
      reason: "KID_UNSAFE_CONTENT",
    });
  });

  it("exposes the pure rule checker for other consumers", () => {
    const fourChoices: BankQuestion = question({
      choices: [
        { id: "a", text: "Saturn" },
        { id: "b", text: "Jupiter" },
        { id: "c", text: "Neptune" },
        { id: "d", text: "Uranus" },
      ],
    });
    expect(findQuizShortRuleViolation(question())).toBeNull();
    expect(findQuizShortRuleViolation(fourChoices)?.reason).toBe("INVALID_CHOICE_COUNT");
  });
});
