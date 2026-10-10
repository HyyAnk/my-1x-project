import type { FrameRect } from "./quizFrame.types.js";
import { escAttr } from "../candyArcade/candyArcadeSvg.js";

export type ProgressStripInput = {
  questionNumber: number;
  totalQuestions: number;
  paletteAccent?: string;
};

export const PROGRESS_STRIP_CLASS = "quiz-progress-strip";

function segmentState(index: number, questionNumber: number): "complete" | "active" | "pending" {
  if (index < questionNumber - 1) return "complete";
  if (index === questionNumber - 1) return "active";
  return "pending";
}

/**
 * Segmented progress strip that replaces the question counter on Quiz Shorts.
 * Completed questions are filled, the current one glows, later ones stay hollow.
 */
export function renderProgressStrip(input: ProgressStripInput): string {
  const total = Math.max(1, Math.round(input.totalQuestions));
  const current = Math.min(total, Math.max(1, Math.round(input.questionNumber)));
  const segments = Array.from({ length: total }, (_, index) => {
    const state = segmentState(index, current);
    return `<span class="progress-segment is-${state}" data-progress-state="${state}" data-layout-allow-occlusion></span>`;
  }).join("");
  const accent = input.paletteAccent ? ` style="--progress-accent:${escAttr(input.paletteAccent)}"` : "";
  return (
    `<div class="${PROGRESS_STRIP_CLASS}" data-quiz-fixed="progress" data-progress-current="${current}" data-progress-total="${total}"` +
    ` role="img" aria-label="Question ${current} of ${total}"${accent}>` +
    `<div class="progress-segments" data-layout-allow-occlusion>${segments}</div>` +
    `<span class="progress-label" data-layout-allow-occlusion>${current} / ${total}</span></div>`
  );
}

export function progressStripCss(scope: string, rect: FrameRect): string {
  return `
${scope} .${PROGRESS_STRIP_CLASS} { position: absolute; z-index: 6; left: ${rect.x}px; top: ${rect.y}px; width: ${rect.width}px; height: ${rect.height}px; display: flex; align-items: center; gap: 18px; contain: layout style; }
${scope} .progress-segments { display: flex; flex: 1 1 auto; gap: 12px; height: 100%; }
${scope} .progress-segment { flex: 1 1 0; height: 100%; border-radius: 999px; background: rgba(255,255,255,.38); box-shadow: inset 0 2px 0 rgba(255,255,255,.5), 0 4px 0 rgba(13,35,71,.14); }
${scope} .progress-segment.is-complete { background: var(--progress-accent, #FFC436); }
${scope} .progress-segment.is-active { background: #FFFFFF; box-shadow: 0 0 18px rgba(255,255,255,.85), 0 4px 0 rgba(13,35,71,.14); }
${scope} .progress-label { flex: 0 0 auto; min-width: 112px; text-align: right; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 44px; font-weight: 900; line-height: 1; color: #FFFFFF; text-shadow: 0 3px 0 rgba(13,35,71,.35); }
`;
}
