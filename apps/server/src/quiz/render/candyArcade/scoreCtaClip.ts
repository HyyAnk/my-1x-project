import type { ChannelMascotConfig, MascotProfile, MascotRenderAspectRatio, MascotStateMediaMode } from "@studio/shared";
import { esc } from "./candyArcadeSvg.js";
import { renderProductionMascotHtmlLayer } from "../productionMascotRenderer.js";
import { source } from "./candyArcadeAudio.js";
import { SCORE_CTA_DURATION_SECONDS, SCORE_CTA_ON_SCREEN_COPY } from "../../timeline/quizShortTimelinePolicy.js";

export const SCORE_CTA_CLIP_ID = "candy-score-cta";
export const SCORE_CTA_MASCOT_CLASS = "mascot-score-cta";

export type ScoreCtaClipInput = {
  start: number;
  duration?: number;
  onScreenCopy?: string;
  aspectRatio?: MascotRenderAspectRatio;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  mediaMode?: MascotStateMediaMode;
  palette?: { backgroundPrimary: string; backgroundSecondary: string; accent: string };
};

/**
 * The CTA mascot is a reveal beat that starts at the clip start: it celebrates with the same
 * asset and visibility rule as an answer reveal, independent of the channel's outro toggle.
 */
function scoreCtaMascotHtml(input: ScoreCtaClipInput, duration: number): string {
  return renderProductionMascotHtmlLayer(input.mascot, input.mascotConfig, {
    phase: "question",
    clipStartSeconds: 0,
    clipDurationSeconds: duration,
    timelineEvents: [{ type: "answer.reveal", at_seconds: 0 }],
    revealOutcome: "correct",
    visibilityPolicy: "reveal_only",
    aspectRatio: input.aspectRatio ?? "9:16",
    sourceMapper: source,
    extraClass: SCORE_CTA_MASCOT_CLASS,
    mediaMode: input.mediaMode,
  });
}

/**
 * Quiz Short closing beat: a fixed three-second card asking viewers to comment their score,
 * with the mascot celebrating beside it. There is no narration and no outro video.
 */
export function scoreCtaClip(input: ScoreCtaClipInput): string {
  const duration = Math.max(0.04, input.duration ?? SCORE_CTA_DURATION_SECONDS);
  const copy = input.onScreenCopy?.trim() || SCORE_CTA_ON_SCREEN_COPY;
  const [headline, prompt] = splitScoreCtaCopy(copy);
  const paletteStyle = input.palette
    ? `--bg-primary:${input.palette.backgroundPrimary};--bg-secondary:${input.palette.backgroundSecondary};--accent:${input.palette.accent};`
    : "";
  return (
    `<section id="${SCORE_CTA_CLIP_ID}" class="clip candy-scene candy-score-cta-scene" style="--clip-start: 0s;${paletteStyle}"` +
    ` data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0" data-quiz-stage="score_cta">` +
    `<div class="score-cta-rays" data-layout-ignore aria-hidden="true"></div>` +
    `<div class="score-cta-card" data-on-screen-copy="${esc(copy)}">` +
    `<h1 class="score-cta-headline">${esc(headline)}</h1>` +
    (prompt ? `<p class="score-cta-prompt">${esc(prompt)}</p>` : "") +
    `<div class="score-cta-sparkles" data-layout-ignore aria-hidden="true">✦&nbsp;&nbsp;★&nbsp;&nbsp;✦</div>` +
    `</div>${scoreCtaMascotHtml(input, duration)}</section>`
  );
}

/** Splits "Question? Prompt" copy into a headline and a secondary prompt line. */
export function splitScoreCtaCopy(copy: string): [string, string] {
  const match = copy.match(/^(.*?[?!.])\s+(.+)$/);
  return match ? [match[1], match[2]] : [copy, ""];
}
