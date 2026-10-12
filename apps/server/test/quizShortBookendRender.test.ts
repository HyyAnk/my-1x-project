import { describe, expect, it } from "vitest";
import { DEFAULT_QUIZ_SHORT_TITLE_CANVAS } from "@studio/shared";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle, type CandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { findQuizShortMascotViolations } from "../src/quiz/render/candyArcade/quizShortMascotInvariant.js";
import type { QuizShortBookendRenderMedia } from "../src/quiz/render/candyArcade/shortBookends/quizShortBookendClips.js";
import { buildQuizShortConfig, buildTextQuizShortQuiz, quizShortAudioDurations } from "./fixtures/quizShortFixtures.js";
import { stillImageMascot } from "./candyArcadeTestUtils.js";

const TITLE = "Ocean Animal Challenge";
const MEDIA: QuizShortBookendRenderMedia = {
  introVideoPath: "./intro.mp4",
  introLoopDurationSeconds: 10,
  outroVideoPath: "./outro.mp4",
  outroHasAudio: false,
  titleCanvas: DEFAULT_QUIZ_SHORT_TITLE_CANVAS,
  transitionType: "stinger_swipe",
  transitionDurationSeconds: 0.5,
};

function buildBundle(withBookends: boolean): CandyArcadeCompositionBundle {
  const quiz = buildTextQuizShortQuiz();
  const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
  const voicePlan = buildQuizShortVoicePlan(quiz, { director, kickoffText: withBookends ? TITLE : undefined });
  const audioDurations = quizShortAudioDurations(voicePlan.segments.map((segment) => segment.segment_id));
  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan,
    audioDurations,
    productKind: "quiz_short",
    introDuration: withBookends ? 10 : 0,
    outroDuration: withBookends ? 6 : 0,
    topic: TITLE,
  });
  return buildCandyArcadeCompositionBundle({
    productKind: "quiz_short",
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./soundtrack.wav",
    premixedAudio: true,
    narrationDurationSeconds: timeline.duration_seconds,
    aspectRatio: "9:16",
    mascot: stillImageMascot,
    shortBookends: withBookends ? MEDIA : undefined,
  });
}

function clipHtml(bundle: CandyArcadeCompositionBundle, clipId: string): string | undefined {
  return Object.values(bundle.files).find((html) => new RegExp(`<section[^>]*\\sid="${clipId}"`).test(html));
}

describe("Quiz Short render with Short Intro & Outro", () => {
  it("opens on the muted intro loop with the title on its canvas and closes on the full outro", () => {
    const bundle = buildBundle(true);
    const intro = clipHtml(bundle, "short-intro");
    expect(intro).toBeDefined();
    expect(intro).toContain('class="short-intro-video"');
    expect(intro).toContain("muted");
    expect(intro).not.toContain("<audio");
    for (const word of TITLE.split(" ")) expect(intro).toContain(`>${word}</span>`);
    expect(intro).toContain(`left:${DEFAULT_QUIZ_SHORT_TITLE_CANVAS.x}px;top:${DEFAULT_QUIZ_SHORT_TITLE_CANVAS.y}px`);
    expect(intro).toContain("intro-transition");
    expect(intro).not.toContain("short-intro-count");

    const outro = clipHtml(bundle, "custom-outro");
    expect(outro).toMatch(/src="[^"]*outro.mp4"/);
    expect(outro).not.toContain("<audio");
    expect(clipHtml(bundle, "candy-kickoff")).toBeUndefined();
    expect(clipHtml(bundle, "candy-score-cta")).toBeUndefined();
    expect(findQuizShortMascotViolations({ html: bundle.html, files: bundle.files, transitionInstances: {} })).toEqual([]);
  });

  it("keeps the kickoff card and score CTA when no pair is pinned", () => {
    const bundle = buildBundle(false);
    expect(clipHtml(bundle, "short-intro")).toBeUndefined();
    expect(clipHtml(bundle, "candy-kickoff")).toBeDefined();
    expect(clipHtml(bundle, "candy-score-cta")).toBeDefined();
  });
});
