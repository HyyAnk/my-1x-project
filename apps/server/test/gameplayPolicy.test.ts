import { describe, expect, it } from "vitest";
import { QUIZ_GAMEPLAY_ARCHETYPES, QuizQuestionSchema } from "@studio/shared";
import { gameplayFixture } from "./fixtures/gameplayFixtures.js";
import { validateQuizTimeline } from "../src/quiz/timeline/validateTimeline.js";
import { validateDirectorPlan } from "../src/quiz/director/validateDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { assessGameplayQa } from "../src/quiz/qa/stages/assessGameplayQa.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";

describe("versioned gameplay policy", () => {
  for (const age of ["4-6", "7-9", "10-12", "family"] as const) {
    it.each(QUIZ_GAMEPLAY_ARCHETYPES)(`compiles $id for ${age} without gameplay drift`, ({ id, targetLayout }) => {
      const { quiz, director, voice, timeline, policy } = gameplayFixture(id, age);
      expect(director.beats.every((beat) => beat.layout_id === targetLayout)).toBe(true);
      expect(validateDirectorPlan(quiz, director).issues.filter((issue) => issue.severity === "blocker")).toEqual([]);
      expect(validateQuizTimeline(quiz, timeline)).toEqual([]);
      expect(voice.segments.some((segment) => segment.role === "choice")).toBe(policy.readChoices);
      expect(voice.segments.some((segment) => segment.role === "thinking_prompt")).toBe(policy.thinkingPrompt);
      expect(assessGameplayQa({ quiz, director, timeline, voicePlan: voice }).filter((issue) => issue.severity === "blocker")).toEqual([]);
      const assets = planQuizAssets(quiz, director);
      expect(assets.assets.length).toBe(
        id === "speed_blitz" ? 0 : ["visual_spotting", "visual_identification"].includes(id) ? 9 : id === "versus_faceoff" ? 6 : 3,
      );
    });
  }
  it("makes Speed Blitz shorter than Deep Trivia without speeding up narration", () => {
    expect(gameplayFixture("speed_blitz").timeline.duration_seconds).toBeLessThan(gameplayFixture("deep_trivia").timeline.duration_seconds);
  });
  it("waits for slow narration even when choice narration is intentionally omitted", () => {
    const fixture = gameplayFixture("speed_blitz");
    const timeline = compileQuizTimeline({
      quiz: fixture.quiz,
      director: fixture.director,
      voicePlan: fixture.voice,
      audioDurations: { ...fixture.durations, "q1:question": 20 },
    });
    const narration = timeline.events.find((event) => event.segment_id === "q1:question")!;
    const timer = timeline.events.find((event) => event.question_id === "q1" && event.type === "countdown.start")!;
    expect(timer.at_seconds).toBeGreaterThanOrEqual(narration.at_seconds + narration.duration_seconds);
  });
  it("accepts explicit two-choice Versus without weakening normal multiple choice", () => {
    const question = gameplayFixture("versus_faceoff").quiz.questions[0];
    expect(question.format).toBe("multiple_choice");
    expect(QuizQuestionSchema.safeParse({ ...question, gameplay_id: undefined }).success).toBe(false);
  });
  it("blocks early answer narration and unexpected mystery choice narration", () => {
    const { quiz, director, timeline, voice } = gameplayFixture("mystery_reveal");
    timeline.events.find((event) => event.segment_id === "q1:reveal")!.at_seconds = 0;
    expect(assessGameplayQa({ quiz, director, timeline, voicePlan: voice }).map((issue) => issue.code)).toContain(
      "gameplay_early_answer_voice",
    );
  });
});
