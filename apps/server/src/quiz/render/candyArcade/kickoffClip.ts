import { esc } from "./candyArcadeSvg.js";
import type { Copy } from "./quizCopy.js";

export const KICKOFF_CLIP_ID = "candy-kickoff";
export const DEFAULT_KICKOFF_DURATION_SECONDS = 1.2;

export type KickoffClipInput = {
  start: number;
  duration: number;
  questionCount: number;
  copy: Copy;
  palette?: { backgroundPrimary: string; backgroundSecondary: string; accent: string };
};

/**
 * Quiz Short opening title card: the question count and a "ready" line over the ambient
 * background. No mascot, no topic teaser, no brand stinger.
 */
export function kickoffClip(input: KickoffClipInput): string {
  const duration = Math.max(0.04, input.duration);
  const paletteStyle = input.palette
    ? `--bg-primary:${input.palette.backgroundPrimary};--bg-secondary:${input.palette.backgroundSecondary};--accent:${input.palette.accent};`
    : "";
  return (
    `<section id="${KICKOFF_CLIP_ID}" class="clip candy-scene candy-kickoff-scene" style="--clip-start: 0s;${paletteStyle}"` +
    ` data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0" data-quiz-stage="kickoff">` +
    `<div class="kickoff-rays" data-layout-ignore aria-hidden="true"></div>` +
    `<div class="kickoff-card">` +
    `<span class="kickoff-badge">${esc(input.copy.quizTime)}</span>` +
    `<h1 class="kickoff-count">${input.questionCount} ${esc(input.copy.questions(input.questionCount))}</h1>` +
    `<p class="kickoff-ready">${esc(input.copy.ready)}</p>` +
    `</div></section>`
  );
}
