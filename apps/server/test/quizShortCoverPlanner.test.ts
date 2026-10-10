import { describe, expect, it, vi } from "vitest";
import { QuizShortSchema, type QuizShort } from "@studio/shared";
import { MASCOT_ARCHETYPES_CATALOG } from "../src/quiz/thumbnail/thumbnailArchetypes.js";
import {
  buildQuizShortCoverPlannerPrompt,
  createFallbackQuizShortCoverPersona,
  formatQuizShortQuestionBadge,
  planQuizShortCoverWithAI,
  resolveQuizShortHookQuestion,
} from "../src/quiz/thumbnail/quizShortCoverPlanner.js";
import { buildQuizShortCoverPrompt } from "../src/quiz/thumbnail/quizShortCoverPrompt.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { buildQuizShortQuiz, buildTextQuizShortQuiz } from "./fixtures/quizShortFixtures.js";

const now = new Date().toISOString();

function makeQuizShort(): QuizShort {
  return QuizShortSchema.parse({
    quiz_short_id: "qshort_planner",
    channel_id: "channel-1",
    slug: "planet-sprint",
    topic: { title: "Planet Sprint", premise: "Five quick planet facts", hook: "Which planet wins the race?" },
    stage: "SCENE_READY",
    quiz_config: { question_count: 5, age_band: "7-9" },
    created_at: now,
    updated_at: now,
  });
}

function mockLlm(response: string): LLMClient {
  return {
    connect: vi.fn(async () => undefined),
    generateContent: vi.fn(async () => ({ text: response })),
  };
}

describe("Quiz Short cover planner", () => {
  it("derives the hook from question one and never from the answer", () => {
    const quiz = buildQuizShortQuiz([{ choices: ["Jupiter", "Mars", "Venus"], correctIndex: 1 }, {}]);
    const hook = resolveQuizShortHookQuestion(quiz, makeQuizShort());

    expect(hook.question).toBe(quiz.questions[0].question);
    expect(hook.choices).toEqual(["Jupiter", "Mars", "Venus"]);
    expect(hook.correctChoiceText).toBe("Mars");
    expect(hook.hookText.length).toBeLessThanOrEqual(30);
    expect(hook.hookText).toBe(hook.hookText.toUpperCase());
  });

  it("formats the question badge from the real count", () => {
    expect(formatQuizShortQuestionBadge(5)).toBe("5 QUESTIONS");
    expect(formatQuizShortQuestionBadge(1)).toBe("1 QUESTION");
  });

  it("builds a kid-safe English planner prompt around the hook question and badge", () => {
    const quiz = buildTextQuizShortQuiz();
    const prompt = buildQuizShortCoverPlannerPrompt(
      { quizShort: makeQuizShort(), quiz, mascotName: "Nova" },
      MASCOT_ARCHETYPES_CATALOG.slice(0, 2),
    );

    expect(prompt).toContain('Mascot Character: "Nova"');
    expect(prompt).toContain(quiz.questions[0].question);
    expect(prompt).toContain('Question Count Badge: "5 QUESTIONS"');
    expect(prompt).toContain("Kid-safe only");
    expect(prompt).toContain("Write everything in English");
    expect(prompt).toContain("DO NOT reveal");
  });

  it("falls back to the first archetype without an LLM client", async () => {
    const pool = MASCOT_ARCHETYPES_CATALOG.slice(0, 3);
    const persona = await planQuizShortCoverWithAI({
      quizShort: makeQuizShort(),
      quiz: buildTextQuizShortQuiz(),
      archetypesOverride: pool,
      mascotName: "Nova",
    });

    expect(persona).toEqual(createFallbackQuizShortCoverPersona(pool[0], "Nova"));
    expect(persona.role).toContain("Nova");
  });

  it("uses a valid planner variation and ignores unusable ones", async () => {
    const pool = MASCOT_ARCHETYPES_CATALOG.slice(0, 2);
    const response = JSON.stringify({
      variations: [
        { id: 1 },
        {
          id: 2,
          archetypeId: pool[1].id,
          archetypeName: pool[1].name,
          role: "Rocket pilot",
          costume: "Silver space suit",
          prop: "Telescope",
          expression: "Wide-eyed wonder",
          poseDescription: "Leaning toward a glowing planet",
          dramaticHook: "A planet lights up behind the mascot",
        },
      ],
    });
    const persona = await planQuizShortCoverWithAI({
      quizShort: makeQuizShort(),
      quiz: buildTextQuizShortQuiz(),
      archetypesOverride: pool,
      llmClient: mockLlm(response),
      rng: () => 0,
    });

    expect(persona.role).toBe("Rocket pilot");
    expect(persona.costume).toBe("Silver space suit");
    expect(persona.archetypeName).toBe(pool[1].name);
  });

  it("falls back when the planner returns malformed JSON", async () => {
    const pool = MASCOT_ARCHETYPES_CATALOG.slice(0, 1);
    const persona = await planQuizShortCoverWithAI({
      quizShort: makeQuizShort(),
      quiz: buildTextQuizShortQuiz(),
      archetypesOverride: pool,
      llmClient: mockLlm("not json at all"),
    });
    expect(persona.archetypeId).toBe(pool[0].id);
  });

  it("compiles a cover prompt with the hook banner, badge, safe zones and no answer", () => {
    const quiz = buildQuizShortQuiz([{ choices: ["Jupiter", "Mars", "Venus"], correctIndex: 1 }, {}, {}]);
    const persona = createFallbackQuizShortCoverPersona(MASCOT_ARCHETYPES_CATALOG[0], "Nova");
    const prompt = buildQuizShortCoverPrompt({ quizShort: makeQuizShort(), quiz, mascotName: "Nova", hasMascotReference: true, persona });

    expect(prompt).toContain("9:16");
    expect(prompt).toContain('"3 QUESTIONS"');
    expect(prompt).toContain("Hook Banner");
    expect(prompt).toContain("bottom 22%");
    expect(prompt).toContain('Never show, write or hint at the correct answer "Mars"');
    expect(prompt).toContain("Kid-safe");
    expect(prompt).toContain("channel mascot");
  });
});
