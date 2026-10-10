import path from "node:path";
import type { QuestionImageSlot } from "@studio/shared";
import { resolveQuizLayoutAssetAspectRatio } from "@studio/shared";
import { belongsToQuestionWithPurpose, matchesChoiceSlotAsset } from "./questionImageAssetMatching.js";
import type { ResolvedQuizAsset, SlotBuildScope } from "./questionImageSlotContext.types.js";

const CHOICE_LABELS: readonly string[] = ["Choice A", "Choice B", "Choice C", "Choice D", "Choice E", "Choice F"];

interface SlotChoice {
  id: string;
  text: string;
}

type SlotImageState = Pick<QuestionImageSlot, "status" | "source" | "image_url" | "user_selected" | "filename">;

function selectSlotChoices(scope: SlotBuildScope, targetLayoutId: string): SlotChoice[] {
  const { question } = scope.context;
  const isVersus = targetLayoutId === "split_versus_two";
  let rawChoices: SlotChoice[] =
    question?.choices && question.choices.length > 0
      ? question.choices
      : isVersus
        ? [{ id: "c1", text: "Option A" }, { id: "c2", text: "Option B" }]
        : [{ id: "c1", text: "Option A" }, { id: "c2", text: "Option B" }, { id: "c3", text: "Option C" }];

  if (isVersus && rawChoices.length > 2) {
    rawChoices = rawChoices.slice(0, 2);
  }
  return rawChoices;
}

function choiceSlotImageUrl(scope: SlotBuildScope, slotId: string): string {
  const { channelId, episodeId, questionNumber } = scope.context;
  return `/api/channels/${channelId}/episodes/${episodeId}/questions/${questionNumber}/image?slotId=${slotId}`;
}

function resolveChoiceSlotImageState(
  scope: SlotBuildScope,
  choiceId: string,
  resolved: ResolvedQuizAsset | undefined,
): SlotImageState {
  if (!resolved) {
    return { status: "missing", source: "none", image_url: null, user_selected: false, filename: undefined };
  }
  const isExplicit = resolved.source === "explicit_episode";
  return {
    status: isExplicit ? "user_uploaded" : resolved.source === "fallback" ? "fallback" : "ai_generated",
    source: resolved.source,
    image_url: choiceSlotImageUrl(scope, choiceId),
    user_selected: isExplicit,
    filename: path.basename(resolved.path),
  };
}

function buildChoiceSlot(
  scope: SlotBuildScope,
  choice: SlotChoice,
  index: number,
  choiceAspectRatio: string,
): QuestionImageSlot {
  const ref = { questionId: scope.questionId, questionNumber: scope.context.questionNumber, choiceId: choice.id };
  const resolved = scope.resolvedAssets.find((a) => matchesChoiceSlotAsset(a, ref));
  const planned = scope.plannedAssets.find((a) => matchesChoiceSlotAsset(a, ref));
  const imageState = resolveChoiceSlotImageState(scope, choice.id, resolved);

  return {
    slot_id: choice.id,
    asset_id: planned?.asset_id ?? resolved?.asset_id ?? `asset-${scope.questionId}-${choice.id}`,
    label: CHOICE_LABELS[index] ?? `Choice ${index + 1}`,
    choice_id: choice.id,
    choice_text: choice.text,
    purpose: "answer_option",
    aspect_ratio: planned?.aspect_ratio ?? choiceAspectRatio,
    status: imageState.status,
    source: imageState.source,
    image_url: imageState.image_url,
    prompt: planned?.subject ?? choice.text,
    user_selected: imageState.user_selected,
    dimensions: resolved?.actual_dimensions,
    filename: imageState.filename,
  };
}

function buildSupportingHeroSlot(scope: SlotBuildScope): QuestionImageSlot | undefined {
  const { channelId, episodeId, questionNumber } = scope.context;
  const ref = { questionId: scope.questionId, questionNumber };
  const heroPlanned = scope.plannedAssets.find((a) => belongsToQuestionWithPurpose(a, ref, "hero_question_image"));
  if (!heroPlanned) return undefined;

  const heroResolved = scope.resolvedAssets.find((a) => belongsToQuestionWithPurpose(a, ref, "hero_question_image"));
  return {
    slot_id: "hero",
    asset_id: heroPlanned.asset_id,
    label: "Hero Image",
    purpose: "hero_question_image",
    aspect_ratio: heroPlanned.aspect_ratio ?? "16:9",
    status: heroResolved ? (heroResolved.source === "explicit_episode" ? "user_uploaded" : "ai_generated") : "missing",
    source: heroResolved ? heroResolved.source : "none",
    image_url: heroResolved
      ? `/api/channels/${channelId}/episodes/${episodeId}/questions/${questionNumber}/image?slotId=hero`
      : null,
    prompt: heroPlanned.subject,
    user_selected: heroResolved?.source === "explicit_episode",
    filename: heroResolved?.path ? path.basename(heroResolved.path) : undefined,
  };
}

/**
 * Builds one slot per answer choice, preceded by a supporting hero slot when one is planned.
 */
export function buildVisualChoiceSlots(scope: SlotBuildScope, targetLayoutId: string): QuestionImageSlot[] {
  const choiceAspectRatio = resolveQuizLayoutAssetAspectRatio(targetLayoutId, "answer_option");
  const slots = selectSlotChoices(scope, targetLayoutId).map((choice, index) =>
    buildChoiceSlot(scope, choice, index, choiceAspectRatio),
  );

  const heroSlot = buildSupportingHeroSlot(scope);
  if (heroSlot) {
    slots.unshift(heroSlot);
  }
  return slots;
}
