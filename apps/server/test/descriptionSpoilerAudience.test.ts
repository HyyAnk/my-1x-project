import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuizV2 } from "@studio/shared";

const mocks = vi.hoisted(() => ({ executeSinglePromptText: vi.fn() }));

vi.mock("../src/utils/promptSanitizer.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/promptSanitizer.js")>();
  return { ...original, executeSinglePromptText: mocks.executeSinglePromptText };
});

import {
  buildQuizAnswerKeys,
  calculateScoringTiers,
  composeScoringCta,
  DescriptionSpoilerError,
  enforceAudienceCta,
  extractRankTitle,
  findSpoilerLeaks,
  requestDescriptionJson,
  resolveAudiencePolicy,
} from "../src/quiz/description/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const validation = { semantic_status: "validated", source_coverage: true, fact_locked: true } as const;

const quiz = {
  schema_version: 2,
  episode_id: "ep-1",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which country is home to the Great Pyramid of Giza?",
      choices: [
        { id: "a", text: "Egypt" },
        { id: "b", text: "Greece" },
        { id: "c", text: "Italy" },
      ],
      correct_choice_id: "a",
      explanation: "The Great Pyramid stands in Egypt.",
      fun_fact: "",
      source_ids: ["src-1"],
      visual_opportunity: "",
      validation,
    },
    {
      id: "q-2",
      number: 2,
      format: "yes_no",
      difficulty: 1,
      question: "Pac-Man was inspired by a pizza.",
      choices: [
        { id: "a", text: "True" },
        { id: "b", text: "False" },
      ],
      correct_choice_id: "a",
      explanation: "",
      fun_fact: "",
      source_ids: ["src-2"],
      visual_opportunity: "",
      validation,
    },
    {
      id: "q-3",
      number: 3,
      format: "multiple_choice",
      difficulty: 2,
      question: "Is Mars or Venus called the Red Planet?",
      choices: [
        { id: "a", text: "Mars" },
        { id: "b", text: "Venus" },
        { id: "c", text: "Jupiter" },
      ],
      correct_choice_id: "a",
      explanation: "",
      fun_fact: "",
      source_ids: ["src-3"],
      visual_opportunity: "",
      validation,
    },
  ],
} as unknown as QuizV2;

const answerKeys = buildQuizAnswerKeys(quiz);
const client = {} as LLMClient;

afterEach(() => {
  mocks.executeSinglePromptText.mockReset();
});

describe("buildQuizAnswerKeys", () => {
  it("skips binary verdict questions and answers already printed in the question", () => {
    expect(answerKeys.map((key) => key.questionId)).toEqual(["q-1"]);
    expect(answerKeys[0]).toEqual({ questionId: "q-1", correctTexts: ["egypt"], distractorTexts: ["greece", "italy"] });
  });
});

describe("findSpoilerLeaks", () => {
  it("flags a sentence that states the correct answer", () => {
    const leaks = findSpoilerLeaks("Travel to Egypt to explore the Great Pyramid. Then test your memory!", answerKeys);
    expect(leaks).toEqual([{ questionId: "q-1", answerText: "egypt", sentence: "Travel to Egypt to explore the Great Pyramid." }]);
  });

  it("allows teasers that list every option and ignores partial-word matches", () => {
    expect(findSpoilerLeaks("Is the Great Pyramid in Egypt, Greece or Italy?", answerKeys)).toEqual([]);
    expect(findSpoilerLeaks("Discover Egyptology secrets!", answerKeys)).toEqual([]);
  });
});

describe("requestDescriptionJson", () => {
  const spoiler = JSON.stringify({ hook_lines: "Pyramid quiz", semantic_paragraph: "The pyramid is in Egypt." });
  const clean = JSON.stringify({ hook_lines: "Pyramid quiz", semantic_paragraph: "Which country hides the Great Pyramid?" });

  it("asks for a corrective rewrite when the first draft spoils an answer", async () => {
    mocks.executeSinglePromptText.mockResolvedValueOnce(spoiler).mockResolvedValueOnce(clean);
    const result = await requestDescriptionJson({ client, prompt: "BASE", answerKeys, timeoutMs: 1000 });
    expect(result.semantic_paragraph).toBe("Which country hides the Great Pyramid?");
    const correctionPrompt = mocks.executeSinglePromptText.mock.calls[1][1] as string;
    expect(correctionPrompt).toContain("BASE");
    expect(correctionPrompt).toContain('[CORRECTION REQUIRED]: Your previous draft revealed correct answers ("egypt")');
  });

  it("throws a spoiler error when every draft leaks", async () => {
    mocks.executeSinglePromptText.mockResolvedValue(spoiler);
    await expect(requestDescriptionJson({ client, prompt: "BASE", answerKeys, timeoutMs: 1000 })).rejects.toBeInstanceOf(
      DescriptionSpoilerError,
    );
    expect(mocks.executeSinglePromptText).toHaveBeenCalledTimes(2);
  });
});

describe("audience policy", () => {
  const cta = { beginner: "a", intermediate: "b", expert: "c", cta_text: "How many did you get? Comment below!" };

  it("treats child age bands as Made for Kids and family as general audience", () => {
    expect(resolveAudiencePolicy("4-6")).toEqual({ madeForKids: true, commentsEnabled: false });
    expect(resolveAudiencePolicy("10-12").madeForKids).toBe(true);
    expect(resolveAudiencePolicy("family")).toEqual({ madeForKids: false, commentsEnabled: true });
    expect(resolveAudiencePolicy(undefined).madeForKids).toBe(false);
  });

  it("replaces comment CTAs only when comments are disabled", () => {
    expect(enforceAudienceCta(cta, resolveAudiencePolicy("7-9"), "en").cta_text).toBe("Keep score, then challenge your family to beat it!");
    expect(enforceAudienceCta(cta, resolveAudiencePolicy("family"), "en")).toEqual(cta);
    const playAlong = { ...cta, cta_text: "Pause and guess before the reveal!" };
    expect(enforceAudienceCta(playAlong, resolveAudiencePolicy("7-9"), "en")).toEqual(playAlong);
    const german = { ...cta, cta_text: "Kommentiere unten!" };
    expect(enforceAudienceCta(german, resolveAudiencePolicy("7-9"), "de").cta_text).toBe("Zähl deine Punkte und fordere deine Familie heraus!");
  });
});

describe("composeScoringCta", () => {
  it("strips model-written ranges so the calculated localized range is the only one shown", () => {
    expect(extractRankTitle("1–3 pts: Arcade Rookie")).toBe("Arcade Rookie");
    expect(extractRankTitle("0-1 correct answers : Rookie")).toBe("Rookie");
    expect(extractRankTitle("4–7点：達人")).toBe("達人");
    expect(extractRankTitle("Retro Master")).toBe("Retro Master");

    const composed = composeScoringCta(
      { beginner: "1 pts: Arcade Rookie", intermediate: "2 pts: High Scorer", expert: "", cta_text: "CTA" },
      calculateScoringTiers(3),
      "en",
      { beginner: "Beginner", intermediate: "Intermediate", expert: "Master" },
    );
    expect(composed).toEqual({
      beginner: "0–1 points: Arcade Rookie",
      intermediate: "2 points: High Scorer",
      expert: "3 points: Master",
      cta_text: "CTA",
    });
  });
});
