import type { QuizSceneTiming } from "../scene/quizScene.types.js";
import type { ProductionMascotTimelineEvent } from "../productionMascotRenderer.js";

/**
 * Rounds seconds to 3 decimal places (millisecond precision) to avoid IEEE-754 drift.
 */
export function roundTimingSeconds(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

/**
 * Calculates a zero-based offset relative to clip start.
 * Clamps to 0 if the event occurred before or at clip start.
 */
export function toZeroBasedOffset(eventSeconds: number, clipStartSeconds: number): number {
  return Math.max(0, roundTimingSeconds(eventSeconds - clipStartSeconds));
}

/**
 * Calculates a zero-based duration between start and end.
 * Guarantees a minimum non-zero duration (default 0.04s, matching 1 frame at 25fps).
 */
export function toZeroBasedDuration(endSeconds: number, startSeconds: number, minDuration = 0.04): number {
  return Math.max(minDuration, roundTimingSeconds(endSeconds - startSeconds));
}

/**
 * Normalizes a global QuizSceneTiming object into a zero-based timing contract
 * where `start` is strictly 0 and all phase markers are relative to the scene root.
 */
export function normalizeSceneTimingToZeroBased(timing: QuizSceneTiming): QuizSceneTiming {
  const clipStart = timing.start;
  return {
    countdownSeconds: timing.countdownSeconds,
    start: 0,
    questionNarrationStart:
      timing.questionNarrationStart !== undefined
        ? toZeroBasedOffset(timing.questionNarrationStart, clipStart)
        : undefined,
    choicesStart: toZeroBasedOffset(timing.choicesStart, clipStart),
    thinkingStart: toZeroBasedOffset(timing.thinkingStart, clipStart),
    timerHideAt:
      timing.timerHideAt !== undefined
        ? toZeroBasedOffset(timing.timerHideAt, clipStart)
        : undefined,
    revealStart: toZeroBasedOffset(timing.revealStart, clipStart),
    rewardStart: toZeroBasedOffset(timing.rewardStart, clipStart),
    end: toZeroBasedDuration(timing.end, clipStart),
  };
}

/**
 * Offsets mascot timeline events by clip start so event delays in the sub-composition
 * begin from 0 seconds.
 */
export function normalizeMascotTimelineEventsToZeroBased(
  events: readonly ProductionMascotTimelineEvent[] | undefined,
  clipStartSeconds: number,
): ProductionMascotTimelineEvent[] {
  if (!events || events.length === 0) return [];
  return events.map((event) => ({
    ...event,
    at_seconds: toZeroBasedOffset(event.at_seconds, clipStartSeconds),
  }));
}

/**
 * Asserts that a QuizSceneTiming adheres strictly to the zero-based sub-composition contract.
 */
export function assertZeroBasedTiming(timing: QuizSceneTiming): void {
  if (timing.start !== 0) {
    throw new Error(`Zero-based timing invariant violation: clip start must be 0, received ${timing.start}`);
  }
  if (timing.choicesStart < 0 || timing.thinkingStart < 0 || timing.revealStart < 0 || timing.end <= 0) {
    throw new Error(
      `Zero-based timing invariant violation: offsets and duration must be non-negative, received ${JSON.stringify(timing)}`,
    );
  }
}
