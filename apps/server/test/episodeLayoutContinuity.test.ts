import { describe, expect, it } from "vitest";
import { QUIZ_GAMEPLAY_ARCHETYPES, QuizConfigSchema, QuizV2Schema, type QuizQuestionFormat } from "@studio/shared";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";
import { synthesizeScenesFromQuiz } from "../src/quiz/domain/quizArtifactSynthesizer.js";
import { createEpisodeDirectorPlan, matchesEpisodeLayout } from "../src/quiz/director/episodeDirectorPlan.js";
import { resolveQuestionLayout } from "../src/quiz/layoutCompatibility.js";
import { parseScenes, serializeScenes } from "../src/repository/sceneCodec.js";

function quizFixture(format: QuizQuestionFormat, count: number) {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "ep-layout",
    age_band: "7-9",
    language: "en",
    questions: Array.from({ length: 3 }, (_, index) => ({
      id: `q-${index}`,
      number: index + 1,
      format,
      difficulty: 2,
      answer_mode: count === 1 ? "single_reveal" : "choice_selection",
      question: "Which animal has stripes?",
      choices: ["Tiger", "Dolphin", "Elephant"].slice(0, count).map((text, i) => ({ id: `c-${i}`, text })),
      correct_choice_id: "c-0",
      explanation: "Tigers have stripes.",
    })),
  });
}

describe("episode layout continuity", () => {
  it.each(QUIZ_GAMEPLAY_ARCHETYPES)("preserves $id across scenes, director and final question", (blueprint) => {
    const count = blueprint.id === "mystery_reveal" ? 1 : ["versus_faceoff", "verdict_true_false"].includes(blueprint.id) ? 2 : 3;
    const format = count === 2 ? "true_false" : blueprint.defaultFormat;
    const quiz = quizFixture(format, count);
    const reconstructed = deriveQuizV2FromScenes({
      episodeId: quiz.episode_id,
      language: quiz.language,
      ageBand: quiz.age_band,
      format: blueprint.defaultFormat,
      scenes: parseScenes(serializeScenes(synthesizeScenesFromQuiz(quiz)), quiz.episode_id),
    });
    const config = QuizConfigSchema.parse({ archetype: blueprint.id, target_layout: blueprint.targetLayout });
    const director = createEpisodeDirectorPlan(reconstructed, config);
    expect(director.beats.map((beat) => beat.layout_id)).toEqual(Array(3).fill(blueprint.targetLayout));
    for (const [index, beat] of director.beats.entries()) {
      expect(resolveQuestionLayout(reconstructed.questions[index], beat).ok).toBe(true);
    }
  });

  it("preserves single reveal for multiple-choice format instead of requiring three choices", () => {
    const quiz = quizFixture("multiple_choice", 1);
    const result = deriveQuizV2FromScenes({
      episodeId: quiz.episode_id,
      language: "en",
      ageBand: "7-9",
      format: "multiple_choice",
      scenes: synthesizeScenesFromQuiz(quiz),
    });
    expect(result.questions.every((q) => q.answer_mode === "single_reveal" && q.choices.length === 1)).toBe(true);
  });

  it("rejects an incompatible explicit layout instead of silently replacing it", () => {
    expect(() =>
      createEpisodeDirectorPlan(quizFixture("image_guess", 1), QuizConfigSchema.parse({ target_layout: "media_left_choices_right" })),
    ).toThrow(/single reveal|requires 3 choices/);
  });

  it("uses the archetype when a legacy episode has no target layout", () => {
    const plan = createEpisodeDirectorPlan(quizFixture("multiple_choice", 3), QuizConfigSchema.parse({ archetype: "speed_blitz" }));
    expect(plan.beats.every((beat) => beat.layout_id === "full_stack_list")).toBe(true);
  });

  it("still rejects a missing choice in a standard question", () => {
    const scenes = synthesizeScenesFromQuiz(quizFixture("multiple_choice", 3));
    scenes[0].quiz!.choices = ["Tiger"];
    expect(() =>
      deriveQuizV2FromScenes({ episodeId: "ep-layout", language: "en", ageBand: "7-9", format: "multiple_choice", scenes }),
    ).toThrow(/exactly 3/);
  });

  it("detects persisted layout drift, including a wrong final question", () => {
    const config = QuizConfigSchema.parse({ archetype: "speed_blitz" });
    const plan = createEpisodeDirectorPlan(quizFixture("multiple_choice", 3), config);
    expect(matchesEpisodeLayout(plan, config)).toBe(true);
    plan.beats[2].layout_id = "media_left_choices_right";
    expect(matchesEpisodeLayout(plan, config)).toBe(false);
  });

  it("recovers legacy Versus scenes with no per-question format", () => {
    const scenes = synthesizeScenesFromQuiz(quizFixture("true_false", 2));
    for (const scene of scenes) delete scene.quiz!.format;
    const quiz = deriveQuizV2FromScenes({
      episodeId: "ep-layout",
      language: "en",
      ageBand: "7-9",
      format: "multiple_choice",
      targetLayout: "split_versus_two",
      scenes,
    });
    expect(quiz.questions.every((question) => question.choices.length === 2)).toBe(true);
  });
});
