import { computeSandboxPhaseTimeline, SETTLED_SANDBOX_PHASE_TIMESTAMPS, type SandboxPreviewInput } from "@studio/shared";
import { quizSceneStateForPhase } from "./quizSceneState.js";
import type { QuizScenePhase, QuizSceneState } from "./quizScene.types.js";

const defaultTimeline = computeSandboxPhaseTimeline();

export const SANDBOX_PHASE_BOUNDARIES = {
  choices: defaultTimeline.choicesStart,
  thinking: defaultTimeline.thinkingStart,
  reveal: defaultTimeline.revealStart,
  explain: defaultTimeline.explainStart,
} as const;

export function sandboxSceneState(input: Pick<SandboxPreviewInput, "phase" | "timeline_time_seconds">): QuizSceneState {
  const phase = input.timeline_time_seconds === undefined ? input.phase : sandboxPhaseAt(input.timeline_time_seconds);
  return quizSceneStateForPhase(phase);
}

export function sandboxPhaseAt(timeSeconds: number): QuizScenePhase {
  if (timeSeconds < SANDBOX_PHASE_BOUNDARIES.choices) return "question";
  if (timeSeconds < SANDBOX_PHASE_BOUNDARIES.thinking) return "choices";
  if (timeSeconds < SANDBOX_PHASE_BOUNDARIES.reveal) return "thinking";
  if (timeSeconds < SANDBOX_PHASE_BOUNDARIES.explain) return "reveal";
  return "explain";
}

export function sandboxPreviewTimeForPhase(phase: "intro" | QuizScenePhase | "outro"): number {
  const times = {
    intro: 0.5,
    question: SETTLED_SANDBOX_PHASE_TIMESTAMPS.question,
    choices: SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices,
    thinking: SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking,
    reveal: SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal,
    explain: SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain,
    outro: Number((defaultTimeline.totalDuration - 0.5).toFixed(1)),
  } as const;
  return times[phase];
}
