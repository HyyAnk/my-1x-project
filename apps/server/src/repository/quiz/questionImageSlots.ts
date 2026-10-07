import path from "node:path";
import type {
  QuestionImageItem,
  QuestionImageSlot,
  QuizAssetPlan,
  QuizAssetResolution,
  QuizQuestion,
} from "@studio/shared";
import { resolveQuizLayoutAssetAspectRatio } from "@studio/shared";
import type { BundleImageAsset } from "../types.js";

export interface BuildSlotsContext {
  question?: QuizQuestion;
  questionNumber: number;
  effectiveLayoutId: string;
  assetPlan: QuizAssetPlan | null;
  assetResolution: QuizAssetResolution | null;
  bundle?: BundleImageAsset;
  channelId: string;
  episodeId: string;
}

const CHOICE_LABELS: readonly string[] = ["Choice A", "Choice B", "Choice C", "Choice D", "Choice E", "Choice F"];

function isVisualChoiceLayout(layoutId: string): boolean {
  return (
    layoutId === "visual_choices_three" ||
    layoutId === "visual_choices_three_pure" ||
    layoutId === "split_versus_two"
  );
}

/**
 * Builds individual image slots for a question depending on its effective layout and assets.
 */
export function buildQuestionImageSlots(context: BuildSlotsContext): QuestionImageSlot[] {
  const {
    question,
    questionNumber,
    effectiveLayoutId,
    assetPlan,
    assetResolution,
    bundle,
    channelId,
    episodeId,
  } = context;

  const qId = question?.id ?? `q-${questionNumber}`;
  const resolvedAssets = assetResolution?.assets ?? [];
  const plannedAssets = assetPlan?.assets ?? [];

  const layoutFromPlan = plannedAssets.find(
    (a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && a.sizing?.layout_id,
  )?.sizing?.layout_id;

  const layoutFromAssets =
    plannedAssets.find((a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && a.purpose === "answer_option")?.aspect_ratio === "3:4" ||
    resolvedAssets.find((a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && a.purpose === "answer_option")?.aspect_ratio === "3:4"
      ? "visual_choices_three_pure"
      : undefined;

  const targetLayoutId =
    question?.layout_id ??
    layoutFromPlan ??
    layoutFromAssets ??
    effectiveLayoutId;

  const hasPlannedVisualChoices = plannedAssets.some(
    (a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && a.purpose === "answer_option",
  );
  const hasResolvedVisualChoices = resolvedAssets.some(
    (a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && (a.purpose === "answer_option" || Boolean((a as any).choice_id)),
  );

  const shouldUseVisualChoices =
    isVisualChoiceLayout(targetLayoutId) ||
    hasPlannedVisualChoices ||
    hasResolvedVisualChoices;

  if (shouldUseVisualChoices) {
    const slots: QuestionImageSlot[] = [];
    const choiceAspectRatio = resolveQuizLayoutAssetAspectRatio(targetLayoutId, "answer_option");

    // Retrieve choices from question or build default candidates
    let rawChoices = question?.choices && question.choices.length > 0
      ? question.choices
      : targetLayoutId === "split_versus_two"
        ? [{ id: "c1", text: "Option A" }, { id: "c2", text: "Option B" }]
        : [{ id: "c1", text: "Option A" }, { id: "c2", text: "Option B" }, { id: "c3", text: "Option C" }];

    if (targetLayoutId === "split_versus_two" && rawChoices.length > 2) {
      rawChoices = rawChoices.slice(0, 2);
    }

    for (let idx = 0; idx < rawChoices.length; idx++) {
      const choice = rawChoices[idx];
      const choiceId = choice.id;
      const label = CHOICE_LABELS[idx] ?? `Choice ${idx + 1}`;

      const resolved = resolvedAssets.find(
        (a) =>
          (a.question_id === qId || a.question_id === `q${questionNumber}`) &&
          ((a as any).choice_id === choiceId ||
            a.asset_id === `asset-${qId}-${choiceId}` ||
            a.asset_id === `asset-q${questionNumber}-${choiceId}` ||
            a.asset_id === `q${questionNumber}_${choiceId}` ||
            a.asset_id.endsWith(`-${choiceId}`) ||
            a.semantic_key?.endsWith(`:choice:${choiceId}`) ||
            a.semantic_key?.includes(`:choice:${choiceId}`)),
      );

      const planned = plannedAssets.find(
        (a) =>
          (a.question_id === qId || a.question_id === `q${questionNumber}`) &&
          ((a as any).choice_id === choiceId ||
            a.asset_id === `asset-${qId}-${choiceId}` ||
            a.asset_id === `asset-q${questionNumber}-${choiceId}` ||
            a.asset_id === `q${questionNumber}_${choiceId}` ||
            a.asset_id.endsWith(`-${choiceId}`) ||
            a.semantic_key?.endsWith(`:choice:${choiceId}`) ||
            a.semantic_key?.includes(`:choice:${choiceId}`)),
      );

      let status: QuestionImageSlot["status"] = "missing";
      let source: QuestionImageSlot["source"] = "none";
      let imageUrl: string | null = null;
      let filename: string | undefined = undefined;
      let userSelected = false;

      if (resolved?.source === "explicit_episode") {
        status = "user_uploaded";
        source = "explicit_episode";
        userSelected = true;
        imageUrl = `/api/channels/${channelId}/episodes/${episodeId}/questions/${questionNumber}/image?slotId=${choiceId}`;
        filename = path.basename(resolved.path);
      } else if (resolved) {
        status = resolved.source === "fallback" ? "fallback" : "ai_generated";
        source = resolved.source as QuestionImageSlot["source"];
        imageUrl = `/api/channels/${channelId}/episodes/${episodeId}/questions/${questionNumber}/image?slotId=${choiceId}`;
        filename = path.basename(resolved.path);
      }

      slots.push({
        slot_id: choiceId,
        asset_id: planned?.asset_id ?? resolved?.asset_id ?? `asset-${qId}-${choiceId}`,
        label,
        choice_id: choiceId,
        choice_text: choice.text,
        purpose: "answer_option",
        aspect_ratio: planned?.aspect_ratio ?? choiceAspectRatio,
        status,
        source,
        image_url: imageUrl,
        prompt: planned?.subject ?? choice.text,
        user_selected: userSelected,
        dimensions: resolved?.actual_dimensions,
        filename,
      });
    }

    // If there is also an explicit hero question image planned, append it as a supporting hero slot
    const heroPlanned = plannedAssets.find(
      (a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && a.purpose === "hero_question_image",
    );
    if (heroPlanned) {
      const heroResolved = resolvedAssets.find(
        (a) => (a.question_id === qId || a.question_id === `q${questionNumber}`) && a.purpose === "hero_question_image",
      );
      slots.unshift({
        slot_id: "hero",
        asset_id: heroPlanned.asset_id,
        label: "Hero Image",
        purpose: "hero_question_image",
        aspect_ratio: heroPlanned.aspect_ratio ?? "16:9",
        status: heroResolved ? (heroResolved.source === "explicit_episode" ? "user_uploaded" : "ai_generated") : "missing",
        source: heroResolved ? (heroResolved.source as QuestionImageSlot["source"]) : "none",
        image_url: heroResolved ? `/api/channels/${channelId}/episodes/${episodeId}/questions/${questionNumber}/image?slotId=hero` : null,
        prompt: heroPlanned.subject,
        user_selected: heroResolved?.source === "explicit_episode",
        filename: heroResolved?.path ? path.basename(heroResolved.path) : undefined,
      });
    }

    return slots;
  }

  // Standard single hero image slot
  const resolved = resolvedAssets.find(
    (a) =>
      (a.question_id === qId && a.purpose === "hero_question_image") ||
      a.asset_id === `q${questionNumber}_hero` ||
      a.asset_id === `asset-${qId}-hero` ||
      a.question_id === qId,
  );
  const planned = plannedAssets.find(
    (a) =>
      (a.question_id === qId && a.purpose === "hero_question_image") ||
      a.asset_id === `q${questionNumber}_hero` ||
      a.asset_id === `asset-${qId}-hero` ||
      a.question_id === qId,
  );

  let status: QuestionImageSlot["status"] = "missing";
  let source: QuestionImageSlot["source"] = "none";
  let imageUrl: string | null = null;
  let filename: string | undefined = undefined;
  let userSelected = false;

  if (bundle?.user_selected || bundle?.provenance === "explicit") {
    status = "user_uploaded";
    source = "explicit_episode";
    userSelected = true;
    imageUrl = `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/${bundle.filename}`;
    filename = bundle.filename;
  } else if (resolved?.source === "explicit_episode") {
    status = "user_uploaded";
    source = "explicit_episode";
    userSelected = true;
    imageUrl = `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/CB-${String(questionNumber).padStart(2, "0")}.png`;
    filename = bundle?.filename ?? path.basename(resolved.path);
  } else if (bundle) {
    status = "ai_generated";
    source = (resolved?.source as QuestionImageSlot["source"]) ?? "provider";
    imageUrl = `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/${bundle.filename}`;
    filename = bundle.filename;
  } else if (resolved) {
    status = resolved.source === "fallback" ? "fallback" : "ai_generated";
    source = resolved.source as QuestionImageSlot["source"];
    imageUrl = `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/CB-${String(questionNumber).padStart(2, "0")}.png`;
    filename = path.basename(resolved.path);
  }

  const prompt = planned?.subject || question?.visual_opportunity || "";

  return [
    {
      slot_id: "hero",
      asset_id: planned?.asset_id ?? `q${questionNumber}_hero`,
      label: "Hero Image",
      purpose: "hero_question_image",
      aspect_ratio: planned?.aspect_ratio ?? resolveQuizLayoutAssetAspectRatio(effectiveLayoutId, "hero_question_image"),
      status,
      source,
      image_url: imageUrl,
      prompt,
      user_selected: userSelected,
      price_vnd: bundle?.price_vnd,
      model: bundle?.model,
      dimensions: resolved?.actual_dimensions,
      filename,
      updated_at: bundle?.modified_at,
    },
  ];
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
