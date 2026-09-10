import { textLayout } from "../../visual/candyArcade.js";
import { highlightQuestionMarkup } from "../candyArcade/candyArcadeSvg.js";
import { normalizeQuestionPunctuation } from "../../formatting/questionPunctuationNormalizer.js";
import type { QuizSceneChoice, QuizSceneMedia, QuizSceneRenderModel } from "./quizScene.types.js";

export type QuizSceneParts = {
  styleCatalogRevision?: string;
  question: {
    text: string;
    visualOpportunity: string;
    highlightedHtml: string;
    layout: ReturnType<typeof textLayout>;
    number: number;
    paletteAccent: string;
    style: QuizSceneRenderModel["styles"]["questionBox"];
  };
  counter: {
    questionNumber: number;
    totalQuestions: number;
    paletteAccent: string;
    isFinal: boolean;
    style: QuizSceneRenderModel["styles"]["counter"];
  };
  hero: QuizSceneMedia;
  choices: {
    questionId: string;
    items: readonly QuizSceneChoice[];
    presentation: QuizSceneRenderModel["layout"]["presentation"];
    correctChoiceId: string;
    phase: QuizSceneRenderModel["state"]["phase"];
    visible: boolean;
    style: QuizSceneRenderModel["styles"]["answerCard"];
    layoutId: QuizSceneRenderModel["layout"]["id"];
    hasMascot: boolean;
  };
  phase: {
    thinkingVisible: boolean;
    factVisible: boolean;
    rewardVisible: boolean;
    factText: string;
    thinkingStyle: QuizSceneRenderModel["styles"]["thinkingBar"];
  };
  brand: {
    name: string | null;
    visible: boolean;
    aspectRatio: QuizSceneRenderModel["aspectRatio"];
  };
  mascot: QuizSceneRenderModel["mascot"];
  background: {
    style: QuizSceneRenderModel["styles"]["background"];
    questionIndex: number;
    palette: QuizSceneRenderModel["palette"];
  };
};

export function buildQuizSceneParts(model: QuizSceneRenderModel): QuizSceneParts {
  const is16x9 = model.aspectRatio !== "9:16";
  const normalizedQuestionText = normalizeQuestionPunctuation(model.question.text, model.question.format);
  const questionLayout = textLayout(normalizedQuestionText, "question", {
    hasMascot: is16x9 ? true : model.mascot.occupied,
    layoutId: model.layout.id,
  });
  return {
    styleCatalogRevision: model.styleCatalogRevision,
    question: {
      text: normalizedQuestionText,
      visualOpportunity: model.question.visualOpportunity,
      highlightedHtml: highlightQuestionMarkup(normalizedQuestionText, model.question.visualOpportunity),
      layout: questionLayout,
      number: model.question.number,
      paletteAccent: model.palette.accent,
      style: model.styles.questionBox,
    },
    counter: {
      questionNumber: model.question.number,
      totalQuestions: model.question.total,
      paletteAccent: model.palette.accent,
      isFinal: model.isFinal,
      style: model.styles.counter,
    },
    hero: model.assets.hero,
    choices: {
      questionId: model.question.id,
      items: model.choices,
      presentation: model.layout.presentation,
      correctChoiceId: model.question.correctChoiceId,
      phase: model.state.phase,
      visible: model.state.choices === "visible",
      style: model.styles.answerCard,
      layoutId: model.layout.id,
      hasMascot: is16x9 ? true : model.mascot.occupied,
    },
    phase: {
      thinkingVisible: model.state.thinking === "visible",
      factVisible: model.state.fact === "visible",
      rewardVisible: model.state.reward === "visible",
      factText: model.question.factText,
      thinkingStyle: model.styles.thinkingBar,
    },
    brand: {
      name: model.channelBrandName,
      visible: model.aspectRatio !== "9:16" ? Boolean(model.channelBrandName?.trim()) || model.brandVisible : model.brandVisible,
      aspectRatio: model.aspectRatio,
    },
    mascot: model.mascot,
    background: {
      style: model.styles.background,
      questionIndex: model.question.number - 1,
      palette: model.palette,
    },
  };
}
