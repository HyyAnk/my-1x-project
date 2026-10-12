import { describe, expect, it } from "vitest";
import { DEFAULT_QUIZ_SHORT_TITLE_CANVAS } from "@studio/shared";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS, compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { SHORT_INTRO_TAIL_SECONDS, SHORT_INTRO_VOICE_LEAD_IN_SECONDS } from "../src/quiz/timeline/quizShortTimelinePolicy.js";
import { validateQuizTimeline } from "../src/quiz/timeline/validateTimeline.js";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";
import { layoutShortIntroTitle, splitTitleWords } from "../src/quiz/render/candyArcade/shortBookends/shortIntroTitleLayout.js";
import { renderLoopedIntroVideos } from "../src/quiz/render/candyArcade/shortBookends/shortIntroClip.js";
import { resolveBgmScheduleItems } from "../src/quiz/audio/soundtrackBgmPlanner.js";
import { buildQuizShortConfig, buildTextQuizShortQuiz, quizShortAudioDurations } from "./fixtures/quizShortFixtures.js";

const TITLE = "Can You Name These Ocean Animals?";
const OUTRO_SECONDS = 6;

function compileWithBookends(introSeconds: number, outroSeconds: number) {
  const quiz = buildTextQuizShortQuiz();
  const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
  const voicePlan = buildQuizShortVoicePlan(quiz, { director, kickoffText: introSeconds > 0 ? TITLE : undefined });
  const audioDurations = quizShortAudioDurations(voicePlan.segments.map((segment) => segment.segment_id));
  audioDurations[QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff] = 2.4;
  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan,
    audioDurations,
    productKind: "quiz_short",
    introDuration: introSeconds,
    outroDuration: outroSeconds,
    topic: TITLE,
  });
  return { quiz, director, voicePlan, timeline };
}

function stage(timeline: ReturnType<typeof compileWithBookends>["timeline"], segmentId: string) {
  return timeline.events.find((event) => event.type === "background.motion" && event.segment_id === segmentId);
}

describe("Quiz Short with Short Intro & Outro", () => {
  it("reads the quiz title instead of the question-count kickoff when an intro is pinned", () => {
    const { voicePlan } = compileWithBookends(10, OUTRO_SECONDS);
    expect(voicePlan.segments.find((segment) => segment.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff)?.text).toBe(TITLE);
    const plain = compileWithBookends(0, 0).voicePlan;
    expect(plain.segments.find((segment) => segment.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff)?.text).toBe(
      "Five questions. Ready?",
    );
  });

  it("ends the intro stage 0.8 seconds after the title voice, not at the end of the 10 second loop", () => {
    const { quiz, timeline } = compileWithBookends(10, OUTRO_SECONDS);
    const intro = stage(timeline, QUIZ_SHORT_STAGE_SEGMENT_IDS.shortIntro);
    const narration = timeline.events.find(
      (event) => event.type === "narration.segment" && event.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff,
    );
    expect(intro?.at_seconds).toBe(0);
    expect(intro?.payload?.title).toBe(TITLE);
    expect(narration?.at_seconds).toBe(SHORT_INTRO_VOICE_LEAD_IN_SECONDS);
    const voiceEnd = SHORT_INTRO_VOICE_LEAD_IN_SECONDS + 2.4;
    expect(intro?.duration_seconds).toBeCloseTo(voiceEnd + SHORT_INTRO_TAIL_SECONDS, 3);
    const firstQuestion = timeline.events.find((event) => event.type === "question.enter" && event.question_id === quiz.questions[0].id);
    expect(firstQuestion?.at_seconds).toBeGreaterThanOrEqual(voiceEnd + SHORT_INTRO_TAIL_SECONDS - 0.001);
    expect(stage(timeline, QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff)).toBeUndefined();
  });

  it("closes with the full outro, no narration over it and no score CTA", () => {
    const { timeline } = compileWithBookends(10, OUTRO_SECONDS);
    const outro = stage(timeline, QUIZ_SHORT_STAGE_SEGMENT_IDS.shortOutro);
    expect(outro?.duration_seconds).toBe(OUTRO_SECONDS);
    expect(outro!.at_seconds + OUTRO_SECONDS).toBeCloseTo(timeline.duration_seconds, 3);
    expect(stage(timeline, QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta)).toBeUndefined();
    const speechAfterOutro = timeline.events.filter((event) => event.type === "narration.segment" && event.at_seconds >= outro!.at_seconds);
    expect(speechAfterOutro).toEqual([]);
  });

  it("keeps the timeline valid and free of QA blockers", () => {
    const { quiz, director, voicePlan, timeline } = compileWithBookends(10, OUTRO_SECONDS);
    expect(validateQuizTimeline(quiz, timeline, { productKind: "quiz_short" })).toEqual([]);
    const assessment = assessQuiz({ quiz, director, voicePlan, timeline, measuredAudio: true, hasMascot: false, pacingProfile: "short" });
    expect(assessment.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.code)).toEqual([]);
  });
});

describe("Short intro title layout", () => {
  it("fits a short title large and a long title smaller inside the default canvas", () => {
    const short = layoutShortIntroTitle("Animal Quiz", DEFAULT_QUIZ_SHORT_TITLE_CANVAS);
    const long = layoutShortIntroTitle(
      "Can You Guess Which Of These Amazing Rainforest Animals Lives The Longest In The Wild?",
      DEFAULT_QUIZ_SHORT_TITLE_CANVAS,
    );
    expect(short.fontSizePx).toBeGreaterThan(long.fontSizePx);
    expect(long.fontSizePx).toBeGreaterThanOrEqual(60);
    expect(long.lineCount * long.fontSizePx * 1.08).toBeLessThanOrEqual(DEFAULT_QUIZ_SHORT_TITLE_CANVAS.height);
  });

  it("splits titles written without spaces per character", () => {
    expect(splitTitleWords("海洋动物知识")).toHaveLength(6);
    expect(splitTitleWords("  Ocean   Animals ")).toEqual(["Ocean", "Animals"]);
  });

  it("repeats the intro loop when the title stage runs past the clip length", () => {
    const html = renderLoopedIntroVideos("./intro.mp4", 4, 9);
    expect(html.match(/<video /g)).toHaveLength(3);
    expect(html).toContain('data-start="8.000" data-duration="1.000"');
    expect(html).not.toContain("<audio");
  });
});

describe("Short outro BGM fade", () => {
  it("fades the final BGM clip over the requested outro length", () => {
    const items = resolveBgmScheduleItems(40, undefined, { seed: "fade", startSeconds: 0, finalFadeOutSeconds: OUTRO_SECONDS });
    expect(items.length).toBeGreaterThan(0);
    const last = items[items.length - 1];
    expect(last.fadeOutSeconds).toBeCloseTo(Math.min(OUTRO_SECONDS, last.durationSeconds * 0.8), 3);
    expect(items[0].startSeconds).toBe(0);
  });
});
