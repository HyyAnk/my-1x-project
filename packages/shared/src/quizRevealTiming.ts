/**
 * Canonical timing constants and pure calculations for Quiz Reveal & Timer Exit.
 *
 * For single_reveal (Mystery Reveal):
 * - Timer exit animation duration is 0.28 seconds, finishing at timerHideAt (T).
 * - Mystery suspense interval is [T, T + 0.5s), where timer is gone and answer is not yet shown.
 * - Answer entrance, reveal wipe, and scanner begin at revealStart (R = T + 0.5s).
 *
 * For standard choice_selection:
 * - Timer remains visible until revealStart, so timerHideAt = revealStart.
 */

export const QUIZ_TIMER_EXIT_DURATION_SECONDS = 0.28;
export const MYSTERY_SUSPENSE_GAP_SECONDS = 0.5;
export const MYSTERY_REVEAL_WIPE_SECONDS = 0.85;

export type QuizRevealTimingPlan = {
  /** Timestamp when timer is completely invisible (opacity 0) */
  timerHideAt: number;
  /** Timestamp when reveal begins (image wipe, answer entrance, scanner) */
  revealStart: number;
  /** Timestamp when timer begins its exit fade animation */
  timerExitStart: number;
  /** Gap duration between timer invisibility and reveal start */
  suspenseGapSeconds: number;
  /** Alias for suspenseGapSeconds */
  suspenseGapDuration: number;
  /** Duration of the reveal image wipe and scanner sweep */
  revealWipeDuration: number;
};

export function calculateQuizRevealTiming(
  inputOrCountdownEnd:
    | number
    | {
        isSingleReveal?: boolean;
        countdownEnd: number;
        minGapSeconds?: number;
      },
  isSingleRevealFallback: boolean = true,
): QuizRevealTimingPlan {
  const isObject = typeof inputOrCountdownEnd === "object";
  const countdownEnd = isObject ? inputOrCountdownEnd.countdownEnd : inputOrCountdownEnd;
  const isSingleReveal = isObject ? (inputOrCountdownEnd.isSingleReveal ?? true) : isSingleRevealFallback;
  const minGap = isObject ? inputOrCountdownEnd.minGapSeconds : undefined;

  const timerHideAt = Number(countdownEnd.toFixed(3));
  const suspenseGapSeconds = isSingleReveal ? (minGap ?? MYSTERY_SUSPENSE_GAP_SECONDS) : 0;
  const revealStart = Number((timerHideAt + suspenseGapSeconds).toFixed(3));
  const timerExitStart = Number(Math.max(0, timerHideAt - QUIZ_TIMER_EXIT_DURATION_SECONDS).toFixed(3));

  return {
    timerHideAt,
    revealStart,
    timerExitStart,
    suspenseGapSeconds,
    suspenseGapDuration: suspenseGapSeconds,
    revealWipeDuration: MYSTERY_REVEAL_WIPE_SECONDS,
  };
}
