import { describe, expect, it } from "vitest";
import type { BankQuestion, BankQuestionWithCooldown, ShortReelTopicCandidate } from "@studio/shared";
import { evaluateQuestionEligibility } from "../src/shortReel/questionEligibility.js";
import { calculateSuitabilityScore } from "../src/shortReel/questionSuitability.js";

function createValidBankQuestion(overrides: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id: "q-test-01",
    archetype_id: "versus_faceoff",
    domain_id: "nature_animals",
    subtopic_id: "mammals",
    question: "Which predator has stronger bite force?",
    explanation: "The Jaguar has exceptional jaw strength capable of piercing turtle shells.",
    status: "approved",
    language: "English",
    correct_choice_id: "c1",
    choices: [
      { id: "c1", text: "Jaguar" },
      { id: "c2", text: "Leopard" },
    ],
    tags: ["predators", "animals", "bite force"],
    difficulty: "medium",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function createShortReelTopic(overrides: Partial<ShortReelTopicCandidate> = {}): ShortReelTopicCandidate {
  return {
    topic_id: "topic-sr-01",
    channel_id: "ch-test-01",
    title: "Apex Predators Faceoff",
    premise: "A dramatic 1v1 showdown between big cats.",
    why_it_fits: "High engagement animal showdown.",
    hook: "Who reigns supreme?",
    estimated_potential: "Very High",
    generated_at: "2026-09-01T00:00:00.000Z",
    selected: false,
    content_kind: "short_reel",
    archetype: "versus_faceoff",
    question_count: 1,
    aspect_ratio: "9:16",
    origin: "keyword",
    theme_hint: "predators",
    domain_id: "nature_animals",
    subtopic_id: "mammals",
    ...overrides,
  };
}

describe("evaluateQuestionEligibility", () => {
  it("approves valid natively English question with matching archetype", () => {
    const q = createValidBankQuestion();
    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(true);
    if (result.eligible) {
      expect(result.candidate.sourceText).toBe(q.question);
      expect(result.candidate.selectedAnswerText).toBe("Jaguar");
      expect(result.candidate.translationProvenance).toBe("source");
    }
  });

  it("rejects non-approved questions", () => {
    const q = createValidBankQuestion({ status: "draft" });
    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("NOT_APPROVED");
    }
  });

  it("rejects questions with mismatched archetype", () => {
    const q = createValidBankQuestion({ archetype_id: "deep_trivia" });
    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("ARCHETYPE_MISMATCH");
    }
  });

  it("rejects questions with channel cooldown active", () => {
    const q: BankQuestionWithCooldown = {
      ...createValidBankQuestion(),
      channel_cooldown: {
        is_cooldown: true,
        days_remaining: 14,
      },
    };
    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("IN_COOLDOWN");
    }
  });

  it("rejects questions with missing, undefined, or empty language without translation", () => {
    const undefinedLang = createValidBankQuestion({ language: undefined });
    expect(evaluateQuestionEligibility(undefinedLang, "versus_faceoff").eligible).toBe(false);

    const emptyLang = createValidBankQuestion({ language: "   " });
    expect(evaluateQuestionEligibility(emptyLang, "versus_faceoff").eligible).toBe(false);

    const unrecognizedLang = createValidBankQuestion({ language: "klingon_fake_lang" });
    expect(evaluateQuestionEligibility(unrecognizedLang, "versus_faceoff").eligible).toBe(false);
  });

  it("rejects questions with duplicate choice IDs in original question", () => {
    const q = createValidBankQuestion({
      choices: [
        { id: "c1", text: "Jaguar" },
        { id: "c1", text: "Leopard" },
      ],
    });
    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("DUPLICATE_CHOICE_IDS");
    }
  });

  it("rejects questions where correct_choice_id is missing from choices", () => {
    const q = createValidBankQuestion({ correct_choice_id: "c999" });
    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("CORRECT_CHOICE_NOT_FOUND");
    }
  });

  it("accepts valid verified English translation for non-English question", () => {
    const q = createValidBankQuestion({
      language: "es",
      question: "¿Qué depredador tiene mayor fuerza de mordida?",
      explanation: "El jaguar tiene una fuerza mandibular excepcional.",
      translations: {
        en: {
          language: "en",
          question: "Which predator has stronger bite force?",
          explanation: "The Jaguar has exceptional jaw strength.",
          verified: true,
          choices: [
            { id: "c1", text: "Jaguar" },
            { id: "c2", text: "Leopard" },
          ],
        },
      },
    });

    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(true);
    if (result.eligible) {
      expect(result.candidate.sourceText).toBe("Which predator has stronger bite force?");
      expect(result.candidate.explanation).toBe("The Jaguar has exceptional jaw strength.");
      expect(result.candidate.translationProvenance).toBe("verified_translation");
      expect(result.candidate.selectedAnswerText).toBe("Jaguar");
    }
  });

  it("rejects unverified English translation", () => {
    const q = createValidBankQuestion({
      language: "fr",
      translations: {
        en: {
          language: "en",
          question: "English question",
          explanation: "English explanation",
          verified: false,
          choices: [
            { id: "c1", text: "Jaguar" },
            { id: "c2", text: "Leopard" },
          ],
        },
      },
    });

    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("UNVERIFIED_TRANSLATION");
    }
  });

  it("rejects translation with duplicate choice IDs", () => {
    const q = createValidBankQuestion({
      language: "de",
      translations: {
        en: {
          language: "en",
          question: "English question",
          explanation: "English explanation",
          verified: true,
          choices: [
            { id: "c1", text: "Jaguar" },
            { id: "c1", text: "Duplicate Jaguar" },
          ],
        },
      },
    });

    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("DUPLICATE_TRANSLATED_CHOICE_IDS");
    }
  });

  it("rejects translation with missing or mismatched choice IDs", () => {
    const q = createValidBankQuestion({
      language: "ja",
      translations: {
        en: {
          language: "en",
          question: "English question",
          explanation: "English explanation",
          verified: true,
          choices: [
            { id: "c1", text: "Jaguar" },
            { id: "wrong_id", text: "Other" },
          ],
        },
      },
    });

    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("TRANSLATED_CHOICE_ID_MISMATCH");
    }
  });

  it("rejects translation with empty explanation (never falls back to non-English explanation)", () => {
    const q = createValidBankQuestion({
      language: "es",
      explanation: "Explicación en español.",
      translations: {
        en: {
          language: "en",
          question: "English question",
          explanation: "   ",
          verified: true,
          choices: [
            { id: "c1", text: "Jaguar" },
            { id: "c2", text: "Leopard" },
          ],
        },
      },
    });

    const result = evaluateQuestionEligibility(q, "versus_faceoff");
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("EMPTY_TRANSLATED_CONTENT");
    }
  });
});

describe("calculateSuitabilityScore", () => {
  it("scores higher for domain, subtopic, and keyword token overlap", () => {
    const topic = createShortReelTopic({
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      theme_hint: "predators",
    });

    const matchingQ = createValidBankQuestion({
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      tags: ["predators", "animals"],
    });
    const matchResult = evaluateQuestionEligibility(matchingQ, "versus_faceoff");
    expect(matchResult.eligible).toBe(true);

    const nonMatchingQ = createValidBankQuestion({
      id: "q-non-match",
      domain_id: "space_earth",
      subtopic_id: "planets",
      question: "Which planet is closer to the sun?",
      explanation: "Mercury orbits closer.",
      tags: ["astronomy"],
      choices: [
        { id: "c1", text: "Mercury" },
        { id: "c2", text: "Venus" },
      ],
    });
    const nonMatchResult = evaluateQuestionEligibility(nonMatchingQ, "versus_faceoff");
    expect(nonMatchResult.eligible).toBe(true);

    if (matchResult.eligible && nonMatchResult.eligible) {
      const scoreHigh = calculateSuitabilityScore(matchResult.candidate, topic);
      const scoreLow = calculateSuitabilityScore(nonMatchResult.candidate, topic);
      expect(scoreHigh).toBeGreaterThan(scoreLow);
    }
  });
});
