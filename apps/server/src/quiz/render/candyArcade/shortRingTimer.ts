import { calculateThinkingBarTiming } from "../../visual/elements/thinkingBar/types.js";
import type { QuizSceneTiming } from "../scene/quizScene.types.js";

export const SHORT_RING_TIMER_CLASS = "short-ring-timer";
export const SHORT_RING_RADIUS = 104;
export const SHORT_RING_CIRCUMFERENCE = Number((2 * Math.PI * SHORT_RING_RADIUS).toFixed(2));
const RING_DIGITS = [3, 2, 1] as const;

/**
 * Large centered ring countdown for the short pacing profile. It replaces the channel thinking
 * bar on Quiz Shorts and is driven purely by the shared thinking-bar timing tokens, so it stays
 * seek-safe: the ring drains over `--timer-duration` and the digits pop on `--cdN-at`.
 */
export function renderShortRingTimer(timing: QuizSceneTiming): string {
  const bar = calculateThinkingBarTiming({
    countdownSeconds: timing.countdownSeconds,
    clipStart: timing.start,
    questionNarrationStart: timing.questionNarrationStart,
    revealStart: timing.revealStart,
    timerHideAt: timing.timerHideAt,
    thinkingStart: timing.thinkingStart,
  });
  const digits = RING_DIGITS.map(
    (digit) => `<span class="ring-digit ring-digit-${digit}" data-layout-allow-occlusion data-layout-allow-overflow>${digit}</span>`,
  ).join("");
  return (
    `<div class="${SHORT_RING_TIMER_CLASS}" ${bar.styleAttr} data-countdown-seconds="${timing.countdownSeconds ?? 3}" data-layout-allow-occlusion>` +
    `<svg class="ring-svg" viewBox="0 0 240 240" aria-hidden="true" data-layout-ignore>` +
    `<circle class="ring-track" cx="120" cy="120" r="${SHORT_RING_RADIUS}"></circle>` +
    `<circle class="ring-progress" cx="120" cy="120" r="${SHORT_RING_RADIUS}"></circle></svg>` +
    `<div class="ring-digits" aria-hidden="true">${digits}</div></div>`
  );
}
