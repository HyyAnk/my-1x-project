import type { BuildQuizSceneRenderModelInput, QuizSceneChoice, QuizSceneRenderModel } from "./quizScene.types.js";

export function buildQuizSceneRenderModel(input: BuildQuizSceneRenderModelInput): QuizSceneRenderModel {
  assertSceneInput(input);
  const choices = input.question.choices.map((choice, index) => normalizeChoice(input, choice, index));
  return {
    id: input.question.id,
    question: {
      id: input.question.id,
      number: input.question.number,
      total: input.totalQuestions,
      format: input.question.format,
      text: input.question.text,
      visualOpportunity: input.question.visualOpportunity,
      factText: input.question.funFact || input.question.explanation,
      correctChoiceId: input.question.correctChoiceId,
    },
    choices,
    state: input.state,
    layout: input.layout,
    aspectRatio: input.aspectRatio,
    mascot: input.mascot,
    assets: { hero: input.hero },
    palette: input.palette,
    styles: input.styles,
    styleCatalogRevision: input.styleCatalogRevision,
    visual: input.visual,
    channelBrandName: input.channelBrandName?.trim() || null,
    brandVisible: input.brandVisible,
    isFinal: input.isFinal,
  };
}

function normalizeChoice(
  input: BuildQuizSceneRenderModelInput,
  choice: BuildQuizSceneRenderModelInput["question"]["choices"][number],
  index: number,
): QuizSceneChoice {
  return {
    id: choice.id,
    order: index,
    text: choice.text,
    media: input.choiceMedia[choice.id] ?? { source: null, altText: choice.text, fallback: { subject: choice.text, seed: index } },
  };
}

function assertSceneInput(input: BuildQuizSceneRenderModelInput): void {
  if (input.layout.id !== input.layout.capability.id) throw new Error("QUIZ_SCENE_LAYOUT_CAPABILITY_MISMATCH");
  if (
    input.question.choices.length > 0 &&
    !input.question.choices.some((choice) => choice.id === input.question.correctChoiceId)
  ) {
    throw new Error("QUIZ_SCENE_CORRECT_CHOICE_MISSING");
  }
}
