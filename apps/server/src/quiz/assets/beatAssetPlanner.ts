import {
  getQuizImageSlotGeometry,
  recommendImageSizing,
  resolveQuizLayoutAssetAspectRatio,
  type DirectorBeat,
  type ImageSlotGeometry,
  type ImageSlotPurpose,
  type MascotRenderAspectRatio,
  type PersistedImageSizing,
  type QuizAssetPlan,
  type QuizQuestion,
  type ResolvedQuizLayoutId,
} from "@studio/shared";
import { resolveQuestionLayout } from "../layoutCompatibility.js";
import type { QUIZ_STYLE_CONTRACTS } from "./promptCompiler.js";
import { isGraphicIdentitySubject } from "./promptCompiler.js";
import { resolveChoiceAssetSubject } from "./choiceSubjectEnricher.js";
import { compactQuizAssetSubject } from "./assetSubject.js";
import { QUIZ_PORTRAIT_MAX_CHOICE_IMAGES, buildVisualAnswerSetGroup } from "./visualAnswerSetGroup.js";

type QuizStyleContract = (typeof QUIZ_STYLE_CONTRACTS)[keyof typeof QUIZ_STYLE_CONTRACTS];

export type BeatAssetPlan = {
  assets: QuizAssetPlan["assets"];
  consistencyGroups: QuizAssetPlan["consistency_groups"];
};

type SlotSizing = { ratio: QuizAssetPlan["assets"][number]["aspect_ratio"]; sizing: PersistedImageSizing | undefined };

function resolveSlotSizing(layoutId: ResolvedQuizLayoutId, purpose: ImageSlotPurpose, geometry: ImageSlotGeometry): SlotSizing {
  const recommendation = recommendImageSizing(geometry);
  if (!recommendation.ok) return { ratio: resolveQuizLayoutAssetAspectRatio(layoutId, purpose), sizing: undefined };
  return {
    ratio: recommendation.value.aspectRatio,
    sizing: {
      policy_version: 1,
      layout_id: layoutId,
      geometry_key: geometry.geometryKey,
      recommended_width: recommendation.value.recommended.width,
      recommended_height: recommendation.value.recommended.height,
    },
  };
}

function planHeroAsset(
  question: QuizQuestion,
  beat: DirectorBeat,
  layoutId: ResolvedQuizLayoutId,
  presentation: "visual" | "text",
  canvasAspectRatio: MascotRenderAspectRatio,
): QuizAssetPlan["assets"] {
  const wantsHero = beat.asset_intents.includes("question_illustration") && Boolean(question.visual_opportunity || question.question);
  if (!wantsHero) return [];
  const geometry = getQuizImageSlotGeometry({
    layoutId,
    purpose: "hero_question_image",
    presentation,
    choiceCount: question.choices.length,
    canvasAspectRatio,
  });
  if (!geometry) return [];
  const { ratio, sizing } = resolveSlotSizing(layoutId, "hero_question_image", geometry);
  const revealArchetypes: readonly string[] = ["mystery_reveal", "visual_reveal", "image_guess"];
  return [
    {
      asset_id: "asset-" + question.id + "-hero",
      question_id: question.id,
      subject: compactQuizAssetSubject(question.visual_opportunity || "", question.question),
      purpose: "hero_question_image",
      style: "cute_illustration",
      aspect_ratio: ratio,
      transparent_background: layoutId === "mystery_reveal" || revealArchetypes.includes(beat.archetype),
      required: true,
      semantic_key: question.id + ":hero_question_image",
      consistency_group_id: null,
      sizing,
    },
  ];
}

function choicePresentationFor(question: QuizQuestion, beat: DirectorBeat, layoutId: ResolvedQuizLayoutId): "visual" | "text" {
  const visual =
    beat.archetype === "visual_multiple_choice" ||
    question.format === "odd_one_out" ||
    (layoutId === "split_versus_two" && beat.asset_intents.includes("choice_illustration"));
  return visual ? "visual" : "text";
}

/** Portrait layouts show at most two answer images, so a portrait beat never plans three. */
function choiceImagesFit(question: QuizQuestion, canvasAspectRatio: MascotRenderAspectRatio): boolean {
  return canvasAspectRatio !== "9:16" || question.choices.length <= QUIZ_PORTRAIT_MAX_CHOICE_IMAGES;
}

function planChoiceAssets(
  question: QuizQuestion,
  beat: DirectorBeat,
  layoutId: ResolvedQuizLayoutId,
  contract: QuizStyleContract,
  canvasAspectRatio: MascotRenderAspectRatio,
): BeatAssetPlan {
  const empty: BeatAssetPlan = { assets: [], consistencyGroups: [] };
  const isSingleReveal = layoutId === "mystery_reveal" || question.answer_mode === "single_reveal";
  if (isSingleReveal || !beat.asset_intents.includes("choice_illustration") || !choiceImagesFit(question, canvasAspectRatio)) return empty;
  const geometry = getQuizImageSlotGeometry({
    layoutId,
    purpose: "answer_option",
    presentation: choicePresentationFor(question, beat, layoutId),
    choiceCount: question.choices.length,
    canvasAspectRatio,
  });
  if (!geometry) return empty;
  const { ratio, sizing } = resolveSlotSizing(layoutId, "answer_option", geometry);
  const groupId = question.id + ":visual-answer-set";
  const assetIds = question.choices.map((choice) => "asset-" + question.id + "-" + choice.id);
  const isGraphicQuestion = isGraphicIdentitySubject(question.visual_opportunity || question.question);
  return {
    consistencyGroups: [buildVisualAnswerSetGroup({ question, groupId, assetIds, contract, isGraphicQuestion })],
    assets: question.choices.map((choice) => ({
      asset_id: "asset-" + question.id + "-" + choice.id,
      question_id: question.id,
      subject: compactQuizAssetSubject(resolveChoiceAssetSubject({ choice, question, isGraphicQuestion }), choice.text),
      purpose: "answer_option",
      style: "cute_illustration",
      aspect_ratio: ratio,
      transparent_background: true,
      required: true,
      semantic_key: question.id + ":choice:" + choice.id,
      consistency_group_id: groupId,
      sizing,
    })),
  };
}

/** Plans the hero and answer images of one director beat against the product canvas. */
export function planBeatAssets(
  question: QuizQuestion,
  beat: DirectorBeat,
  contract: QuizStyleContract,
  canvasAspectRatio: MascotRenderAspectRatio,
): BeatAssetPlan {
  const layoutResolution = resolveQuestionLayout(question, beat, canvasAspectRatio);
  if (!layoutResolution.ok) {
    const reason = layoutResolution.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Failed to resolve layout for question ${question.id}: ${reason}`);
  }
  const layoutId = layoutResolution.layoutId;
  const hero = planHeroAsset(question, beat, layoutId, layoutResolution.capability.supportedPresentations[0], canvasAspectRatio);
  const choices = planChoiceAssets(question, beat, layoutId, contract, canvasAspectRatio);
  return { assets: [...hero, ...choices.assets], consistencyGroups: choices.consistencyGroups };
}
