import { quizSceneStateForPhase } from "./quizSceneState.js";
import type { QuizSceneState, QuizSceneTiming } from "./quizScene.types.js";

export function productionSceneStateAt(timing: QuizSceneTiming, atSeconds: number): QuizSceneState {
  if (atSeconds < timing.choicesStart) return quizSceneStateForPhase("question");
  if (atSeconds < timing.thinkingStart) return quizSceneStateForPhase("choices");
  if (atSeconds < timing.revealStart) return quizSceneStateForPhase("thinking");
  if (atSeconds < timing.rewardStart) return quizSceneStateForPhase("reveal");
  return quizSceneStateForPhase("explain");
}
