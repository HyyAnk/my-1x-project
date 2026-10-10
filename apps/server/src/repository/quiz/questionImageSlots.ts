import path from "node:path";
import type { QuestionImageItem, QuestionImageSlot } from "@studio/shared";
import { resolveQuizLayoutAssetAspectRatio } from "@studio/shared";
import {
  belongsToQuestion,
  belongsToQuestionWithPurpose,
  readAssetChoiceId,
  type MatchableQuizAsset,
  type QuestionAssetRef,
} from "./questionImageAssetMatching.js";
import type { BuildSlotsContext, ResolvedQuizAsset, SlotBuildScope } from "./questionImageSlotContext.types.js";
import { buildVisualChoiceSlots } from "./questionImageVisualChoiceSlots.js";

export type { BuildSlotsContext } from "./questionImageSlotContext.types.js";

type SlotImageState = Pick<QuestionImageSlot, "status" | "source" | "image_url" | "user_selected" | "filename">;

function isVisualChoiceLayout(layoutId: string): boolean {
  return (
    layoutId === "visual_choices_three" ||
    layoutId === "visual_choices_three_pure" ||
    layoutId === "split_versus_two"
  );
}

function questionRefOf(scope: SlotBuildScope): QuestionAssetRef {
  return { questionId: scope.questionId, questionNumber: scope.context.questionNumber };
}

function isAnswerOptionAsset(asset: MatchableQuizAsset, ref: QuestionAssetRef): boolean {
  return belongsToQuestionWithPurpose(asset, ref, "answer_option");
}

function resolveTargetLayoutId(scope: SlotBuildScope): string {
  const ref = questionRefOf(scope);
  const layoutFromPlan = scope.plannedAssets.find((a) => belongsToQuestion(a, ref) && a.sizing?.layout_id)?.sizing
    ?.layout_id;

  const layoutFromAssets =
    scope.plannedAssets.find((a) => isAnswerOptionAsset(a, ref))?.aspect_ratio === "3:4" ||
    scope.resolvedAssets.find((a) => isAnswerOptionAsset(a, ref))?.aspect_ratio === "3:4"
      ? "visual_choices_three_pure"
      : undefined;

  return scope.context.question?.layout_id ?? layoutFromPlan ?? layoutFromAssets ?? scope.context.effectiveLayoutId;
}

function shouldUseVisualChoices(scope: SlotBuildScope, targetLayoutId: string): boolean {
  const ref = questionRefOf(scope);
  const hasPlannedVisualChoices = scope.plannedAssets.some((a) => isAnswerOptionAsset(a, ref));
  const hasResolvedVisualChoices = scope.resolvedAssets.some(
    (a) => belongsToQuestion(a, ref) && (a.purpose === "answer_option" || Boolean(readAssetChoiceId(a))),
  );
  return isVisualChoiceLayout(targetLayoutId) || hasPlannedVisualChoices || hasResolvedVisualChoices;
}

function isStandaloneHeroAsset(asset: MatchableQuizAsset, scope: SlotBuildScope): boolean {
  const { questionId } = scope;
  const { questionNumber } = scope.context;
  return (
    (asset.question_id === questionId && asset.purpose === "hero_question_image") ||
    asset.asset_id === `q${questionNumber}_hero` ||
    asset.asset_id === `asset-${questionId}-hero` ||
    asset.question_id === questionId
  );
}

function resolveHeroSlotImageState(scope: SlotBuildScope, resolved: ResolvedQuizAsset | undefined): SlotImageState {
  const { bundle, channelId, episodeId, questionNumber } = scope.context;
  const imagesBaseUrl = `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images`;
  const contactBoardUrl = `${imagesBaseUrl}/CB-${String(questionNumber).padStart(2, "0")}.png`;

  if (bundle?.user_selected || bundle?.provenance === "explicit") {
    const url = `${imagesBaseUrl}/${bundle.filename}`;
    return { status: "user_uploaded", source: "explicit_episode", image_url: url, user_selected: true, filename: bundle.filename };
  }
  if (resolved?.source === "explicit_episode") {
    const filename = bundle?.filename ?? path.basename(resolved.path);
    return { status: "user_uploaded", source: "explicit_episode", image_url: contactBoardUrl, user_selected: true, filename };
  }
  if (bundle) {
    const url = `${imagesBaseUrl}/${bundle.filename}`;
    const source = resolved?.source ?? "provider";
    return { status: "ai_generated", source, image_url: url, user_selected: false, filename: bundle.filename };
  }
  if (resolved) {
    const status = resolved.source === "fallback" ? "fallback" : "ai_generated";
    const filename = path.basename(resolved.path);
    return { status, source: resolved.source, image_url: contactBoardUrl, user_selected: false, filename };
  }
  return { status: "missing", source: "none", image_url: null, user_selected: false, filename: undefined };
}

function buildStandaloneHeroSlot(scope: SlotBuildScope): QuestionImageSlot {
  const { question, questionNumber, effectiveLayoutId, bundle } = scope.context;
  const resolved = scope.resolvedAssets.find((a) => isStandaloneHeroAsset(a, scope));
  const planned = scope.plannedAssets.find((a) => isStandaloneHeroAsset(a, scope));
  const imageState = resolveHeroSlotImageState(scope, resolved);

  return {
    slot_id: "hero",
    asset_id: planned?.asset_id ?? `q${questionNumber}_hero`,
    label: "Hero Image",
    purpose: "hero_question_image",
    aspect_ratio: planned?.aspect_ratio ?? resolveQuizLayoutAssetAspectRatio(effectiveLayoutId, "hero_question_image"),
    status: imageState.status,
    source: imageState.source,
    image_url: imageState.image_url,
    prompt: planned?.subject || question?.visual_opportunity || "",
    user_selected: imageState.user_selected,
    price_vnd: bundle?.price_vnd,
    model: bundle?.model,
    dimensions: resolved?.actual_dimensions,
    filename: imageState.filename,
    updated_at: bundle?.modified_at,
  };
}

/**
 * Builds individual image slots for a question depending on its effective layout and assets.
 */
export function buildQuestionImageSlots(context: BuildSlotsContext): QuestionImageSlot[] {
  const scope: SlotBuildScope = {
    context,
    questionId: context.question?.id ?? `q-${context.questionNumber}`,
    plannedAssets: context.assetPlan?.assets ?? [],
    resolvedAssets: context.assetResolution?.assets ?? [],
  };

  const targetLayoutId = resolveTargetLayoutId(scope);
  if (shouldUseVisualChoices(scope, targetLayoutId)) {
    return buildVisualChoiceSlots(scope, targetLayoutId);
  }
  return [buildStandaloneHeroSlot(scope)];
}

/**
 * Aggregates individual slots into the parent QuestionImageItem for high-level backward compatibility.
 */
export function summarizeSlotsToItem(
  slots: QuestionImageSlot[],
  base: {
    question_number: number;
    question_id: string;
    question_text: string;
    layout_id?: string;
  },
): QuestionImageItem {
  if (slots.length === 0) {
    return {
      ...base,
      asset_id: `q${base.question_number}_hero`,
      status: "missing",
      source: "none",
      image_url: null,
      prompt: "",
      aspect_ratio: "16:9",
      user_selected: false,
      slots: [],
    };
  }

  const primarySlot = slots.find((s) => s.purpose === "hero_question_image") ?? slots[0];
  const anyMissing = slots.some((s) => s.status === "missing");
  const anyGenerating = slots.some((s) => s.status === "generating");
  const anyUploaded = slots.some((s) => s.status === "user_uploaded" || s.user_selected);
  const allReady = slots.every((s) => s.status !== "missing" && s.status !== "generating");

  let status: QuestionImageItem["status"] = "missing";
  if (allReady) {
    status = anyUploaded ? "user_uploaded" : "ai_generated";
  } else if (anyGenerating) {
    status = "generating";
  } else if (anyMissing) {
    status = "missing";
  }

  return {
    ...base,
    asset_id: primarySlot.asset_id,
    status,
    source: primarySlot.source,
    image_url: primarySlot.image_url,
    prompt: primarySlot.prompt,
    aspect_ratio: primarySlot.aspect_ratio,
    user_selected: anyUploaded,
    price_vnd: primarySlot.price_vnd,
    model: primarySlot.model,
    dimensions: primarySlot.dimensions,
    filename: primarySlot.filename,
    updated_at: primarySlot.updated_at,
    slots,
  };
}
