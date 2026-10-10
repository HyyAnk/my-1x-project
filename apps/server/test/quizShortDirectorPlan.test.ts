import { describe, expect, it } from "vitest";
import { QUIZ_GAMEPLAY_POLICY_VERSION, isQuizPortraitLayoutId } from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { createQuizShortDirectorPlan, resolveQuizShortLayoutPair } from "../src/quiz/director/quizShortDirectorPlan.js";
import { validateDirectorPlan } from "../src/quiz/director/validateDirectorPlan.js";
import { buildImageQuizShortQuiz, buildQuizShortConfig, buildQuizShortQuiz, buildTextQuizShortQuiz } from "./fixtures/quizShortFixtures.js";

const TEXT_PAIR = { primary: "short_stack_list", secondary: "short_verdict_yes_no" } as const;

describe("Quiz Short director plan", () => {
  it("alternates the layout pair with question one on the primary layout", () => {
    const quiz = buildTextQuizShortQuiz();
    const plan = createQuizShortDirectorPlan(quiz, buildQuizShortConfig({ layout_pair: TEXT_PAIR }));
    expect(plan.beats.map((beat) => beat.layout_id)).toEqual([
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
    ]);
    expect(plan.gameplay_policy_version).toBe(QUIZ_GAMEPLAY_POLICY_VERSION);
    expect(plan.beats.map((beat) => beat.gameplay_id)).toEqual([
      "deep_trivia",
      "verdict_yes_no",
      "deep_trivia",
      "verdict_yes_no",
      "deep_trivia",
    ]);
    for (const beat of plan.beats) {
      expect(beat.thinking_seconds).toBeGreaterThanOrEqual(3);
      expect(beat.thinking_seconds).toBeLessThanOrEqual(4.5);
    }
    expect(plan.beats[1].asset_intents).toEqual(["question_illustration"]);
    expect(plan.beats[0].asset_intents).toEqual([]);
  });

  it("falls back to the other layout of the pair when the assigned layout does not fit the question", () => {
    const quiz = buildQuizShortQuiz([{}, {}, {}, { format: "yes_no", visual: "A planet" }, {}]);
    const plan = createQuizShortDirectorPlan(quiz, buildQuizShortConfig({ layout_pair: TEXT_PAIR }));
    expect(plan.beats.map((beat) => beat.layout_id)).toEqual([
      "short_stack_list",
      "short_stack_list",
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
    ]);
  });

  it("derives the pair from the topic when the config has none", () => {
    expect(resolveQuizShortLayoutPair(buildTextQuizShortQuiz())).toEqual(TEXT_PAIR);
    expect(resolveQuizShortLayoutPair(buildQuizShortQuiz([{}, {}, {}]))).toEqual({
      primary: "short_stack_list",
      secondary: "short_stack_list",
    });
    expect(resolveQuizShortLayoutPair(buildImageQuizShortQuiz())).toEqual({
      primary: "short_media_top_choices",
      secondary: "short_versus_two",
    });
  });

  it("uses both media layouts for image topics and keeps three-choice questions off the two-image layout", () => {
    const plan = createQuizShortDirectorPlan(buildImageQuizShortQuiz(), buildQuizShortConfig());
    expect(plan.beats.map((beat) => beat.layout_id)).toEqual([
      "short_media_top_choices",
      "short_versus_two",
      "short_media_top_choices",
      "short_versus_two",
      "short_media_top_choices",
    ]);
    expect(plan.beats[1].gameplay_id).toBe("versus_faceoff");
    expect(plan.beats[1].asset_intents).toEqual(["choice_illustration"]);
    const threeChoiceOnSecondary = createQuizShortDirectorPlan(
      buildQuizShortQuiz([{ visual: "Jupiter" }, { visual: "Mars" }, { visual: "Venus" }]),
      buildQuizShortConfig(),
    );
    expect(threeChoiceOnSecondary.beats.map((beat) => beat.layout_id)).toEqual([
      "short_media_top_choices",
      "short_media_top_choices",
      "short_media_top_choices",
    ]);
  });

  it("rejects plans with more than two portrait layouts or any landscape layout", () => {
    const quiz = buildImageQuizShortQuiz();
    const plan = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
    const mixed = {
      ...plan,
      beats: plan.beats.map((beat, index) => (index === 4 ? { ...beat, layout_id: "short_stack_list" as const } : beat)),
    };
    expect(validateDirectorPlan(quiz, mixed).issues.map((issue) => issue.code)).toContain("director_portrait_layout_pair_exceeded");
    const landscape = {
      ...plan,
      beats: plan.beats.map((beat, index) => (index === 0 ? { ...beat, layout_id: "full_stack_list" as const } : beat)),
    };
    expect(validateDirectorPlan(quiz, landscape).issues.map((issue) => issue.code)).toContain("director_portrait_layout_required");
    expect(validateDirectorPlan(quiz, plan).issues.filter((issue) => issue.severity === "blocker")).toEqual([]);
  });

  it("honors the aspect ratio argument of the default director plan", () => {
    const quiz = buildQuizShortQuiz([{ visual: "Jupiter" }, { visual: "Mars" }, { visual: "Venus" }]);
    expect(createDefaultDirectorPlan(quiz, "9:16").beats.every((beat) => isQuizPortraitLayoutId(beat.layout_id))).toBe(true);
    expect(createDefaultDirectorPlan(quiz).beats.some((beat) => isQuizPortraitLayoutId(beat.layout_id))).toBe(false);
    expect(createDefaultDirectorPlan(quiz, "candy_arcade").beats.some((beat) => isQuizPortraitLayoutId(beat.layout_id))).toBe(false);
  });
});
