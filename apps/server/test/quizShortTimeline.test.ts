import { describe, expect, it } from "vitest";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import {
  QUIZ_SHORT_STAGE_SEGMENT_IDS,
  SCORE_CTA_DURATION_SECONDS,
  SCORE_CTA_ON_SCREEN_COPY,
  compileQuizTimeline,
} from "../src/quiz/timeline/compileTimeline.js";
import { quizShortDurationIssues, quizShortChoiceNarrationIssues } from "../src/quiz/timeline/quizShortTimelineRules.js";
import { validateQuizTimeline } from "../src/quiz/timeline/validateTimeline.js";
import { assessQuizShortQa } from "../src/quiz/qa/stages/assessQuizShortQa.js";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";
import { buildQuizShortConfig, buildTextQuizShortQuiz, quizShortAudioDurations } from "./fixtures/quizShortFixtures.js";

function compileSpecimen(questionSeconds?: number, outroCtaEnabled?: boolean) {
  const quiz = buildTextQuizShortQuiz();
  const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
  const voicePlan = buildQuizShortVoicePlan(quiz, { director });
  const audioDurations = quizShortAudioDurations(voicePlan.segments.map((segment) => segment.segment_id));
  if (questionSeconds !== undefined) {
    for (const segment of voicePlan.segments)
      if (segment.segment_id.endsWith(":question")) audioDurations[segment.segment_id] = questionSeconds;
  }
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, audioDurations, productKind: "quiz_short", outroCtaEnabled });
  return { quiz, director, voicePlan, timeline };
}

describe("Quiz Short timeline", () => {
  it("compiles five questions with realistic narration into the 45 to 65 second window", () => {
    const { quiz, timeline } = compileSpecimen();
    expect(timeline.duration_seconds).toBeGreaterThanOrEqual(45);
    expect(timeline.duration_seconds).toBeLessThanOrEqual(65);
    expect(validateQuizTimeline(quiz, timeline, { productKind: "quiz_short" })).toEqual([]);
    for (const question of quiz.questions) {
      expect(timeline.events.some((event) => event.type === "countdown.start" && event.question_id === question.id)).toBe(true);
      expect(timeline.events.some((event) => event.segment_id === question.id + ":choice")).toBe(false);
      expect(timeline.events.some((event) => event.segment_id === question.id + ":explanation")).toBe(false);
    }
  });

  it("has no intro, bridge, mid-roll CTA, pre-outro or spoken outro stages", () => {
    const { timeline } = compileSpecimen();
    const types = new Set(timeline.events.map((event) => event.type));
    expect(types.has("bridge.topic.enter")).toBe(false);
    expect(types.has("bridge.cta.enter")).toBe(false);
    expect(types.has("pre_outro.enter")).toBe(false);
    expect(timeline.events.some((event) => event.segment_id === "intro" || event.segment_id === "outro")).toBe(false);
    const kickoff = timeline.events.find(
      (event) => event.type === "narration.segment" && event.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff,
    );
    expect(kickoff?.at_seconds).toBe(0);
  });

  it("ends with the three second score CTA carrying on-screen copy only", () => {
    const { timeline } = compileSpecimen();
    const cta = timeline.events.find(
      (event) => event.type === "background.motion" && event.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta,
    );
    expect(cta?.duration_seconds).toBe(SCORE_CTA_DURATION_SECONDS);
    expect(cta?.payload.on_screen_copy).toBe(SCORE_CTA_ON_SCREEN_COPY);
    expect(Number(((cta?.at_seconds ?? 0) + SCORE_CTA_DURATION_SECONDS).toFixed(3))).toBe(timeline.duration_seconds);
    expect(timeline.events.some((event) => event.type === "narration.segment" && event.at_seconds >= (cta?.at_seconds ?? 0))).toBe(false);
    const withoutCta = compileSpecimen(undefined, false).timeline;
    expect(withoutCta.events.some((event) => event.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta)).toBe(false);
  });

  it("fails the duration budget above 90 seconds and warns above 75", () => {
    const { quiz, timeline } = compileSpecimen(12);
    expect(timeline.duration_seconds).toBeGreaterThan(90);
    const codes = validateQuizTimeline(quiz, timeline, { productKind: "quiz_short" }).map((issue) => issue.code);
    expect(codes).toContain("timeline_short_duration_exceeded");
    expect(quizShortDurationIssues(80).map((issue) => [issue.code, issue.severity])).toEqual([["timeline_short_duration_long", "warning"]]);
    expect(quizShortDurationIssues(60)).toEqual([]);
    expect(validateQuizTimeline(quiz, timeline)).toEqual([]);
  });

  it("fails when a choice narration segment is scheduled", () => {
    const quiz = buildTextQuizShortQuiz();
    const episodeVoice = buildQuizVoicePlan(quiz, { skipIntro: true, skipOutro: true });
    const events = [
      {
        event_id: "e1",
        type: "narration.segment" as const,
        at_seconds: 1,
        duration_seconds: 2,
        question_id: "q1",
        choice_id: null,
        segment_id: "q1:choice",
        payload: {},
      },
    ];
    expect(quizShortChoiceNarrationIssues({ events }).map((issue) => issue.code)).toEqual(["timeline_short_choice_narration"]);
    expect(episodeVoice.segments.some((segment) => segment.role === "choice")).toBe(true);
    expect(assessQuizShortQa({ quiz, voicePlan: episodeVoice }).map((issue) => issue.code)).toEqual(["quiz_short_choice_narration"]);
  });

  it("passes the aggregated QA with the short pacing profile", () => {
    const { quiz, director, voicePlan, timeline } = compileSpecimen();
    const assessment = assessQuiz({ quiz, director, voicePlan, timeline, measuredAudio: true, hasMascot: false, pacingProfile: "short" });
    const blockers = assessment.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.code);
    expect(blockers).toEqual([]);
    expect(assessment.issues.map((issue) => issue.code)).not.toContain("pacing_question_cycle_outside_target");
  });
});
