import type { MascotActionType } from "@studio/shared";
import type { StageReactionStyle, StageScenarioPhase } from "../types";

export const STAGE_TIMELINE_DURATION_SECONDS = 16;

export type StageTimelineState = {
  phase: StageScenarioPhase;
  pose: MascotActionType;
};

export function resolveStageTimelineState(timeSeconds: number, reaction: StageReactionStyle): StageTimelineState {
  if (timeSeconds < 2) return { phase: "intro", pose: "wave" };
  if (timeSeconds < 4) return { phase: "question", pose: "thinking" };
  if (timeSeconds < 9) return { phase: "thinking", pose: "thinking" };
  if (timeSeconds < 12) return { phase: "reveal", pose: reaction === "celebrate" ? "celebrate" : "oops" };
  if (timeSeconds < 14) return { phase: "explain", pose: "point" };
  return { phase: "outro", pose: "outro" };
}

export function stageBackgroundPhase(phase: StageScenarioPhase): "question" | "choices" | "thinking" | "reveal" | "explain" {
  if (phase === "intro") return "question";
  if (phase === "question") return "choices";
  if (phase === "outro") return "explain";
  return phase;
}

export function stageBackgroundTime(phase: StageScenarioPhase): number {
  return { intro: 0.5, question: 2, thinking: 5, reveal: 8, explain: 9.5, outro: 9.5 }[phase];
}
