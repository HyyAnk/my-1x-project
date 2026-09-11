import { computeSandboxPhaseTimeline, type SandboxPreviewInput } from "@studio/shared";
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
    question: Number((defaultTimeline.questionStart + 0.3).toFixed(1)),
    choices: Number((defaultTimeline.choicesStart + 0.3).toFixed(1)),
    thinking: Number((defaultTimeline.thinkingStart + 1.0).toFixed(1)),
    reveal: Number((defaultTimeline.revealStart + 0.2).toFixed(1)),
    explain: Number((defaultTimeline.explainStart + 0.2).toFixed(1)),
    outro: Number((defaultTimeline.totalDuration - 0.5).toFixed(1)),
  } as const;
  return times[phase];
}
