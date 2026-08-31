import {
  quizChoicePresentationFor,
  type MascotRenderAspectRatio,
  type QuizLayoutResolutionResult,
  type QuizQuestion,
  type ResolvedQuizLayoutId,
} from "@studio/shared";
import type { QuizTemplateScene } from "../../visual/types.js";
import { assetFor } from "../candyArcade/candyArcadeAudio.js";
import { buildQuizSceneRenderModel } from "./buildQuizSceneRenderModel.js";
import { productionSceneStateAt } from "./productionSceneStateAdapter.js";
import { resolveQuizSceneElementStyles } from "./quizSceneStyles.js";
import type { QuizSceneMascotOccupancy, QuizSceneRenderModel, QuizSceneTiming } from "./quizScene.types.js";

type SuccessfulLayoutResolution = Extract<QuizLayoutResolutionResult<ResolvedQuizLayoutId>, { ok: true }>;

export type ProductionSceneAdapterInput = {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  archetype: Parameters<typeof quizChoicePresentationFor>[0];
  layoutResolution: SuccessfulLayoutResolution;
  visual: QuizTemplateScene;
  timing: QuizSceneTiming;
  atSeconds?: number;
  assets: Record<string, string>;
  aspectRatio: MascotRenderAspectRatio;
  mascot: QuizSceneMascotOccupancy;
  styles: Parameters<typeof resolveQuizSceneElementStyles>[0];
  channelBrandName?: string | null;
  brandVisible: boolean;
  isFinal: boolean;
};

export function adaptProductionQuizScene(input: ProductionSceneAdapterInput): QuizSceneRenderModel {
  return buildQuizSceneRenderModel({
    question: {
      id: input.question.id,
      number: input.question.number,
      format: input.question.format,
      text: input.question.question,
      visualOpportunity: input.question.visual_opportunity,
      explanation: input.question.explanation,
      funFact: input.question.fun_fact,
      choices: input.question.choices,
      correctChoiceId: input.question.correct_choice_id,
    },
    totalQuestions: input.totalQuestions,
    state: productionSceneStateAt(input.timing, input.atSeconds ?? input.timing.start),
    layout: {
      id: input.layoutResolution.layoutId,
      source: input.layoutResolution.source,
      capability: input.layoutResolution.capability,
      presentation: quizChoicePresentationFor(input.archetype, input.question.format),
    },
    aspectRatio: input.aspectRatio,
    mascot: input.mascot,
    hero: productionHero(input),
    choiceMedia: productionChoiceMedia(input),
    palette: input.visual.palette,
    styles: resolveQuizSceneElementStyles(input.styles),
    visual: input.visual,
    channelBrandName: input.channelBrandName,
    brandVisible: input.brandVisible,
    isFinal: input.isFinal,
  });
}

function productionHero(input: ProductionSceneAdapterInput) {
  const subject = input.question.visual_opportunity || input.question.question;
  return {
    source: assetFor(input.assets, `asset-${input.question.id}-hero`, `asset-${input.question.id}-question`),
    altText: subject,
    fallback: { subject, seed: input.question.number },
  };
}

function productionChoiceMedia(input: ProductionSceneAdapterInput) {
  return Object.fromEntries(
    input.question.choices.map((choice, index) => [
      choice.id,
      {
        source: assetFor(input.assets, `asset-${input.question.id}-${choice.id}`),
        altText: choice.text,
        fallback: { subject: choice.text, seed: index + input.question.number * 10 },
      },
    ]),
  );
}
