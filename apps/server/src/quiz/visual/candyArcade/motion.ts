import type { QuizMotionId, QuizTransitionId } from "@studio/shared";

export function resolveMotion(requested: QuizMotionId, questionIndex: number): Exclude<QuizMotionId, "auto"> {
  if (requested !== "auto") return requested;
  return (["enter.pop", "enter.slideUp", "enter.scale"] as const)[questionIndex % 3];
}

export function resolveTransition(requested: QuizTransitionId): Exclude<QuizTransitionId, "auto"> {
  return requested === "auto" ? "bubble_splash" : requested;
}

export function motionCssClass(motion: QuizMotionId): string {
  return "motion-" + (motion === "auto" ? "enter-pop" : motion.replaceAll(".", "-"));
}

export function timelineProgress(startSeconds: number, endSeconds: number, currentSeconds: number): number {
  if (endSeconds <= startSeconds) return 1;
  return Math.max(0, Math.min(1, (currentSeconds - startSeconds) / (endSeconds - startSeconds)));
}

export type QuizTimerState = {
  progress: number;
  remaining: number;
  boundary: number;
};

/**
 * The single source of truth for the on-screen timer. Consumers must derive
 * both the fill edge and the token position from this state; no frame delta
 * or previous render state is involved.
 */
export function quizTimerState(startSeconds: number, endSeconds: number, currentSeconds: number): QuizTimerState {
  const progress = timelineProgress(startSeconds, endSeconds, currentSeconds);
  const remaining = 1 - progress;
  return { progress, remaining, boundary: remaining };
}

export type AmbientMotionKind = "float" | "breathe" | "drift" | "tilt" | "none";

export function ambientPhaseSeconds(kind: AmbientMotionKind, itemIndex: number, questionId = ""): number {
  if (kind === "none") return 0;
  const hash = [...questionId].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, 17);
  const base = (Math.abs(hash) + Math.max(0, itemIndex) * 37) % 97;
  return Number(((base / 97) * ambientPeriodSeconds(kind)).toFixed(3));
}

export function ambientPeriodSeconds(kind: AmbientMotionKind): number {
  if (kind === "float") return 3.6;
  if (kind === "breathe") return 4.2;
  if (kind === "drift") return 6.4;
  if (kind === "tilt") return 5.1;
  return 0;
}

export function visualAnswerState(
  choiceId: string,
  canonicalChoiceId: string,
  phase: "idle" | "reveal" | "explain",
): "idle" | "correct" | "incorrect" {
  if (phase === "idle") return "idle";
  return choiceId === canonicalChoiceId ? "correct" : "incorrect";
}
