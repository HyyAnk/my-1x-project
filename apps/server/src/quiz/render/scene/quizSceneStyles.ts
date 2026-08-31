import type {
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
} from "@studio/shared";
import {
  resolveAnswerCardSkin,
  resolveBackgroundVariant,
  resolveCounterBadgeVariant,
  resolveQuestionBoxVariant,
  resolveThinkingBarVariant,
} from "../../visual/elements/index.js";
import type { QuizSceneElementStyles } from "./quizScene.types.js";

export function resolveQuizSceneElementStyles(input: {
  thinkingBar?: QuizThinkingBarStyle | null;
  questionBox?: QuizQuestionBoxStyle | null;
  answerCard?: QuizAnswerCardStyle | null;
  counter?: QuizQuestionCounterStyle | null;
  background?: QuizBackgroundStyle | null;
}): QuizSceneElementStyles {
  return {
    thinkingBar: resolveThinkingBarVariant(input.thinkingBar).id,
    questionBox: resolveQuestionBoxVariant(input.questionBox).id,
    answerCard: resolveAnswerCardSkin(input.answerCard).id,
    counter: resolveCounterBadgeVariant(input.counter).id,
    background: resolveBackgroundVariant(input.background).id,
  };
}
