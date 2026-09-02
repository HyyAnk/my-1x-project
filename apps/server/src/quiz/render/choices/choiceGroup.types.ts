import type { QuizChoicePresentation, QuizPreviewLayoutId } from "@studio/shared";
import type { AnswerCardSkin } from "../../visual/elements/answerCard/types.js";
import type { QuizSceneChoice, QuizScenePhase } from "../scene/quizScene.types.js";

export type ChoiceRevealMode = "snapshot" | "scheduled";

export type ChoiceGroupRenderInput = {
  questionId: string;
  items: readonly QuizSceneChoice[];
  correctChoiceId: string;
  phase: QuizScenePhase;
  visible: boolean;
  presentation: QuizChoicePresentation;
  skin: AnswerCardSkin;
  layoutId: QuizPreviewLayoutId;
  hasMascot: boolean;
  revealMode?: ChoiceRevealMode;
};
