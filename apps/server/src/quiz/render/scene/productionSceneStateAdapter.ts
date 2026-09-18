import { quizSceneStateForPhase } from "./quizSceneState.js";
import type { QuizSceneState, QuizSceneTiming } from "./quizScene.types.js";

export function productionSceneStateAt(timing: QuizSceneTiming, atSeconds: number): QuizSceneState {
  if (atSeconds < timing.choicesStart) return quizSceneStateForPhase("question");
  if (atSeconds < timing.thinkingStart) return quizSceneStateForPhase("choices");
  if (atSeconds < timing.revealStart) {
    const baseThinking = quizSceneStateForPhase("thinking");
    if (timing.timerHideAt !== undefined && atSeconds >= timing.timerHideAt) {
      return { ...baseThinking, thinking: "hidden" };
    }
    return baseThinking;
  }
  if (atSeconds < timing.rewardStart) return quizSceneStateForPhase("reveal");
  return quizSceneStateForPhase("explain");
}
