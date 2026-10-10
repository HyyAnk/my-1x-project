import { describe, expect, it } from "vitest";
import {
  PORTRAIT_FRAME_GEOMETRY,
  PORTRAIT_MIN_CHOICE_FONT_PX,
  PORTRAIT_MIN_QUESTION_FONT_PX,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  type QuizPortraitLayoutId,
  type QuizTimeline,
  type QuizV2,
} from "@studio/shared";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import {
  QUIZ_SHORT_STAGE_SEGMENT_IDS,
  SCORE_CTA_DURATION_SECONDS,
  SCORE_CTA_ON_SCREEN_COPY,
} from "../src/quiz/timeline/quizShortTimelinePolicy.js";
import { buildCandyArcadeCompositionBundle, type CandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { findQuizShortMascotViolations } from "../src/quiz/render/candyArcade/quizShortMascotInvariant.js";
import { SCORE_CTA_CLIP_ID } from "../src/quiz/render/candyArcade/scoreCtaClip.js";
import { KICKOFF_CLIP_ID } from "../src/quiz/render/candyArcade/kickoffClip.js";
import {
  buildImageQuizShortQuiz,
  buildQuizShortConfig,
  buildTextQuizShortQuiz,
  quizShortAudioDurations,
} from "./fixtures/quizShortFixtures.js";
import { stillImageMascot } from "./candyArcadeTestUtils.js";

type Specimen = {
  quiz: QuizV2;
  timeline: QuizTimeline;
  bundle: CandyArcadeCompositionBundle;
  layoutByQuestion: Map<string, QuizPortraitLayoutId>;
};

function buildSpecimen(quiz: QuizV2): Specimen {
  const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
  const voicePlan = buildQuizShortVoicePlan(quiz, { director });
  const audioDurations = quizShortAudioDurations(voicePlan.segments.map((segment) => segment.segment_id));
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, audioDurations, productKind: "quiz_short" });
  const bundle = buildCandyArcadeCompositionBundle({
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
  });
  const layoutByQuestion = new Map(director.beats.map((beat) => [beat.question_id, beat.layout_id as QuizPortraitLayoutId]));
  return { quiz, timeline, bundle, layoutByQuestion };
}

function clipFiles(bundle: CandyArcadeCompositionBundle): Array<{ id: string; html: string }> {
  return Object.entries(bundle.files)
    .filter(([path]) => path.startsWith("compositions/"))
    .map(([, html]) => ({ id: html.match(/<section[^>]*\sid="([^"]+)"/)?.[1] ?? "", html }));
}

function mountFor(bundle: CandyArcadeCompositionBundle, clipId: string): string {
  return bundle.html.match(new RegExp(`<div id="${clipId}-mount"[^>]*>`))?.[0] ?? "";
}

function questionClips(bundle: CandyArcadeCompositionBundle): Array<{ id: string; html: string }> {
  return clipFiles(bundle).filter((clip) => clip.id.startsWith("quiz-q"));
}

/** Strips volatile data URIs so the snapshot stays readable and stable. */
function normalizeForSnapshot(html: string): string {
  return html.replace(/src="data:[^"]+"/g, 'src="data:image/svg+xml;base64,[inline]"');
}

const textSpecimen = buildSpecimen(buildTextQuizShortQuiz());
const imageSpecimen = buildSpecimen(buildImageQuizShortQuiz());
const specimens = [textSpecimen, imageSpecimen];

describe("Quiz Short render snapshot", () => {
  it("renders every portrait layout across the two specimens", () => {
    const rendered = new Set<string>();
    for (const specimen of specimens) {
      for (const clip of questionClips(specimen.bundle)) {
        const layoutId = clip.html.match(/layout-(short_[a-z_]+)/)?.[1];
        if (layoutId) rendered.add(layoutId);
      }
    }
    expect([...rendered].sort()).toEqual([...QUIZ_PORTRAIT_LAYOUT_IDS].sort());
  });

  it.each(QUIZ_PORTRAIT_LAYOUT_IDS)("%s question clip matches its HTML snapshot", (layoutId) => {
    const clip = specimens
      .flatMap((specimen) => questionClips(specimen.bundle))
      .find((candidate) => candidate.html.includes(`layout-${layoutId}`));
    expect(clip, `no clip rendered for ${layoutId}`).toBeDefined();
    expect(normalizeForSnapshot(clip!.html)).toMatchSnapshot();
  });

  it("places the canvas, progress strip, ring timer and reveal card in the portrait frame slots", () => {
    const { bundle, quiz } = textSpecimen;
    expect(bundle.html).toContain('data-width="1080" data-height="1920" data-aspect-ratio="9:16"');
    const clips = questionClips(bundle);
    expect(clips).toHaveLength(quiz.questions.length);
    clips.forEach((clip, index) => {
      expect(clip.html).toContain("quiz-frame-unified quiz-frame-portrait quiz-short-question");
      expect(clip.html).toContain(`data-progress-current="${index + 1}" data-progress-total="${quiz.questions.length}"`);
      expect(clip.html).toContain(
        `<span class="progress-label" data-layout-allow-occlusion>${index + 1} / ${quiz.questions.length}</span>`,
      );
      expect(clip.html).not.toContain("hanging-wood-sign");
      expect(clip.html).toContain('<div class="quiz-thinking-anchor" data-quiz-fixed="thinking"><div class="short-ring-timer"');
      expect(clip.html).toContain('data-countdown-seconds="3"');
      expect(clip.html).not.toContain('class="thinking-bar');
      expect(clip.html).not.toContain("quiz-fact-anchor");
      expect(clip.html).not.toContain('class="fact-card"');
      expect(clip.html).not.toContain("channel-brand-mark");
    });
    const css = bundle.html;
    const { progressStrip, question, countdown } = PORTRAIT_FRAME_GEOMETRY;
    expect(css).toContain(`.quiz-progress-strip { position: absolute; z-index: 6; left: ${progressStrip.x}px; top: ${progressStrip.y}px;`);
    expect(css).toContain(`.quiz-question-anchor { position: absolute; z-index: 3; left: ${question.x}px; top: ${question.y}px;`);
    expect(css).toContain(`.quiz-thinking-anchor { position: absolute; left: ${countdown.x}px; top: ${countdown.y}px;`);
  });

  it("enforces the portrait text minimums in the stylesheet", () => {
    const css = textSpecimen.bundle.html;
    expect(css).toContain(`max(var(--question-size, 56px), ${PORTRAIT_MIN_QUESTION_FONT_PX}px)`);
    for (const layoutId of QUIZ_PORTRAIT_LAYOUT_IDS) {
      const tokenBlock = css.match(new RegExp(`\\.layout-${layoutId} \\{([^}]+)\\}`))?.[1] ?? "";
      expect(tokenBlock, `token block for ${layoutId}`).toContain(`--choice-fit-min: ${PORTRAIT_MIN_CHOICE_FONT_PX}px`);
      const sizes = [...tokenBlock.matchAll(/--choice-font-size-[a-z_]+: ([0-9]+)px/g)].map((match) => Number(match[1]));
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(PORTRAIT_MIN_CHOICE_FONT_PX);
    }
  });

  it("has no intro, bridge, stinger, pre-outro, outro or celebration markup", () => {
    for (const specimen of specimens) {
      const ids = clipFiles(specimen.bundle).map((clip) => clip.id);
      expect(ids[0]).toBe(KICKOFF_CLIP_ID);
      expect(ids[ids.length - 1]).toBe(SCORE_CTA_CLIP_ID);
      const markup = [specimen.bundle.html.replace(/<style>[\s\S]*?<\/style>/, ""), ...Object.values(specimen.bundle.files)].join("\n");
      for (const forbidden of [
        "candy-intro",
        "candy-outro",
        "bridge-topic",
        "bridge-subscribe",
        "brand-logo-stinger",
        "energy-whip",
        "candy-pre-outro",
        "celebration-stinger",
      ]) {
        expect(markup, `unexpected ${forbidden}`).not.toContain(`id="${forbidden}`);
      }
      expect(markup).not.toContain("custom-intro-video");
      expect(markup).not.toContain("custom-outro-video");
      expect(markup).not.toContain("quiz-narration");
    }
  });

  it("renders the kickoff card with the question count and the three second score CTA", () => {
    const { bundle, quiz } = textSpecimen;
    const kickoff = clipFiles(bundle).find((clip) => clip.id === KICKOFF_CLIP_ID)!;
    expect(kickoff.html).toContain(`<h1 class="kickoff-count">${quiz.questions.length} questions`);
    expect(kickoff.html).toContain('data-quiz-stage="kickoff"');
    expect(mountFor(bundle, KICKOFF_CLIP_ID)).toContain('data-start="0.000"');
    expect(kickoff.html).not.toContain("candy-mascot-container");
    const cta = clipFiles(bundle).find((clip) => clip.id === SCORE_CTA_CLIP_ID)!;
    expect(mountFor(bundle, SCORE_CTA_CLIP_ID)).toContain(`data-duration="${SCORE_CTA_DURATION_SECONDS.toFixed(3)}"`);
    expect(cta.html).toContain(`data-on-screen-copy="${SCORE_CTA_ON_SCREEN_COPY}"`);
    expect(cta.html).toContain('<h1 class="score-cta-headline">How many did you get right?</h1>');
    expect(cta.html).toContain('<p class="score-cta-prompt">Comment below</p>');
    expect(cta.html).toContain("candy-mascot-container");
    expect(cta.html).toContain('data-mascot-action="celebrate"');
    expect(cta.html).toContain('data-mascot-aspect-ratio="9:16"');
    expect(normalizeForSnapshot(cta.html)).toMatchSnapshot();
  });

  it("shows the mascot only on answer reveals and the CTA", () => {
    for (const specimen of specimens) {
      expect(findQuizShortMascotViolations(specimen.bundle)).toEqual([]);
      for (const clip of questionClips(specimen.bundle)) {
        const phases = [...clip.html.matchAll(/data-mascot-phase="([^"]+)"/g)].map((match) => match[1]);
        expect(phases.length).toBeGreaterThan(0);
        expect(phases.every((phase) => phase === "reveal" || phase === "explain")).toBe(true);
        const revealAt = Number(clip.html.match(/data-reveal-at="([^"]+)"/)![1]);
        const delays = [...clip.html.matchAll(/--mascot-state-delay:([0-9.]+)s/g)].map((match) => Number(match[1]));
        for (const delay of delays) expect(delay).toBeGreaterThanOrEqual(revealAt - 0.001);
      }
    }
  });

  it("keys the CTA clip on the timeline score CTA stage", () => {
    const { bundle, timeline } = textSpecimen;
    const stage = timeline.events.find(
      (event) => event.type === "background.motion" && event.segment_id === QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta,
    )!;
    const ctaMount = mountFor(bundle, SCORE_CTA_CLIP_ID);
    expect(ctaMount).toContain(`data-start="${stage.at_seconds.toFixed(3)}"`);
    expect(ctaMount).toContain(`data-duration="${stage.duration_seconds.toFixed(3)}"`);
    const cta = clipFiles(bundle).find((clip) => clip.id === SCORE_CTA_CLIP_ID)!;
    expect(cta.html).toContain(`data-quiz-stage="${QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta}"`);
    expect(Number(mountFor(bundle, KICKOFF_CLIP_ID).match(/data-duration="([^"]+)"/)![1])).toBeGreaterThan(1);
  });
});
