import type { QuizShortTitleCanvas, ResolvedTransitionInstance } from "@studio/shared";
import { esc, escAttr } from "../candyArcadeSvg.js";
import { INTRO_BOUNDARY_ID, resolveIntroBoundaryTransition } from "../introBoundaryTransition.js";
import { calculateIntroTransitionTiming, renderIntroTransitionOverlay } from "../introVideoTransition.js";
import type { Copy } from "../quizCopy.js";
import { layoutShortIntroTitle } from "./shortIntroTitleLayout.js";

export const SHORT_INTRO_CLIP_ID = "short-intro";
/** Title entrance: badge first, then words cascade in before the voice starts reading. */
const BADGE_ENTER_AT_SECONDS = 0.15;
const WORD_ENTER_AT_SECONDS = 0.3;
const WORD_ENTER_STAGGER_SECONDS = 0.05;
/** Words are highlighted across this share of the narration so the last one lands before it ends. */
const WORD_HIGHLIGHT_SPAN_RATIO = 0.85;

export type ShortIntroClipInput = {
  videoPath: string;
  /** Length of the uploaded intro loop; the clip repeats it when the title stage runs longer. */
  loopDurationSeconds: number;
  start: number;
  duration: number;
  title: string;
  voiceStartSeconds: number;
  voiceDurationSeconds: number;
  copy: Copy;
  titleCanvas: QuizShortTitleCanvas;
  transitionType: string;
  transitionDurationSeconds: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
  fps: number;
  canvas: { width: number; height: number };
  palette?: { accent?: string; backgroundPrimary?: string; text?: string };
};

export type ShortIntroClipResult = {
  clip: string;
  transitionInstance?: { id: string; instance: ResolvedTransitionInstance };
};

/** Back-to-back muted copies of the loop so the backdrop never freezes on its last frame. */
export function renderLoopedIntroVideos(videoPath: string, loopDurationSeconds: number, totalSeconds: number): string {
  const loop = Math.max(0.5, loopDurationSeconds);
  const source = escAttr(videoPath);
  const parts: string[] = [];
  for (let at = 0, index = 0; at < totalSeconds - 0.001; at += loop, index += 1) {
    const length = Math.min(loop, totalSeconds - at);
    parts.push(
      `<video id="short-intro-video-${index}" class="short-intro-video" src="${source}" data-start="${at.toFixed(3)}"` +
        ` data-duration="${length.toFixed(3)}" data-has-audio="false" muted playsinline></video>`,
    );
  }
  return parts.join("");
}

function renderTitleWords(input: ShortIntroClipInput, words: string[]): string {
  const highlightSpan = Math.max(0.2, input.voiceDurationSeconds * WORD_HIGHLIGHT_SPAN_RATIO);
  const highlightStep = words.length > 0 ? highlightSpan / words.length : 0;
  return words
    .map((word, index) => {
      const enterAt = WORD_ENTER_AT_SECONDS + index * WORD_ENTER_STAGGER_SECONDS;
      const highlightAt = input.voiceStartSeconds - input.start + index * highlightStep;
      return `<span class="short-intro-word" style="--word-enter-at:${enterAt.toFixed(3)}s;--word-highlight-at:${highlightAt.toFixed(3)}s;">${esc(word)}</span>`;
    })
    .join(" ");
}

function renderTitleCard(input: ShortIntroClipInput): string {
  const { titleCanvas: rect } = input;
  const layout = layoutShortIntroTitle(input.title, rect);
  const position = `left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;`;
  return (
    `<div class="short-intro-title-card" data-layout-ignore style="${position}--title-size:${layout.fontSizePx}px;--badge-enter-at:${BADGE_ENTER_AT_SECONDS}s;">` +
    `<span class="short-intro-badge">${esc(input.copy.quizTime)}</span>` +
    `<h1 class="short-intro-title" data-title-lines="${layout.lineCount}">${renderTitleWords(input, layout.words)}</h1>` +
    `</div>`
  );
}

/**
 * The Quiz Short opening over an uploaded intro: the muted intro loop as the backdrop, the quiz
 * title drawn on the loop's blank canvas while the voice reads it, then the intro transition into
 * the first question. The clip ends on the timeline's title stage, not on the loop's length.
 */
export function shortIntroClip(input: ShortIntroClipInput): ShortIntroClipResult {
  const duration = Math.max(0.04, input.duration);
  const transition = resolveIntroBoundaryTransition({
    boundarySeconds: duration,
    transitionType: input.transitionType,
    transitionDurationSeconds: input.transitionDurationSeconds,
    transitionInstances: input.transitionInstances,
    fps: input.fps,
    canvas: input.canvas,
    palette: input.palette,
  });
  const timing = calculateIntroTransitionTiming(duration, input.transitionType, input.transitionDurationSeconds);
  const overlay = renderIntroTransitionOverlay(
    input.transitionType,
    timing.transitionStart,
    timing.transitionDuration,
    null,
    INTRO_BOUNDARY_ID,
    "9:16",
    transition.colors,
  );
  const clip =
    `<section id="${SHORT_INTRO_CLIP_ID}" class="clip candy-scene short-intro-scene" style="--clip-start: 0s;"` +
    ` data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0" data-quiz-stage="short_intro">` +
    `${renderLoopedIntroVideos(input.videoPath, input.loopDurationSeconds, duration)}${renderTitleCard(input)}${overlay}</section>`;
  return {
    clip,
    transitionInstance: transition.instance ? { id: INTRO_BOUNDARY_ID, instance: transition.instance } : undefined,
  };
}
