import type { SandboxPreviewInput } from "@studio/shared";
import { quizSceneStateForPhase } from "./quizSceneState.js";
import type { QuizScenePhase, QuizSceneState } from "./quizScene.types.js";

export const SANDBOX_PHASE_BOUNDARIES = {
  choices: 1.2,
  thinking: 2.5,
  reveal: 7.5,
  explain: 8.8,
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
  const times = { intro: 0.5, question: 0.5, choices: 2, thinking: 5, reveal: 8, explain: 9.5, outro: 9.5 } as const;
  return times[phase];
}
