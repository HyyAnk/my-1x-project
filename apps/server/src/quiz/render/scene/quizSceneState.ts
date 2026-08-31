import type { QuizScenePhase, QuizSceneState } from "./quizScene.types.js";

export function quizSceneStateForPhase(phase: QuizScenePhase): QuizSceneState {
  const choicesVisible = phase !== "question";
  const revealed = phase === "reveal" || phase === "explain";
  const thinkingVisible = phase === "choices" || phase === "thinking";
  const explaining = phase === "explain";
  return {
    phase,
    choices: choicesVisible ? "visible" : "hidden",
    answers: revealed ? "revealed" : "pending",
    thinking: thinkingVisible ? "visible" : "hidden",
    fact: explaining ? "visible" : "hidden",
    reward: revealed ? "visible" : "hidden",
  };
}
