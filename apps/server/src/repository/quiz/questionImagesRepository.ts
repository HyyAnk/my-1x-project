import { createHash } from "node:crypto";
import path from "node:path";
import {
  type QuestionImageItem,
  type QuestionImagesOverviewResponse,
  type QuizAssetResolution,
  resolveQuizLayoutAssetAspectRatio,
} from "@studio/shared";
import { RepositoryError } from "../errors.js";
import { isValidImageBuffer } from "../helpers.js";
import type { RepositoryRuntime } from "../runtime.js";

import { buildQuestionImageSlots, summarizeSlotsToItem } from "./questionImageSlots.js";

/**
 * Lists question images and statuses for an episode by cross-referencing
 * the quiz, asset plan, asset resolution, and continuity bundles.
 */
export async function listEpisodeQuestionImages(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
): Promise<QuestionImagesOverviewResponse> {
  const [quiz, assetPlan, assetResolution, bundleImages] = await Promise.all([
    this.readQuiz(channelId, episodeId),
    this.readAssetPlan(channelId, episodeId),
    this.readQuizAssetResolution(channelId, episodeId),
    this.listBundleImages(channelId, episodeId),
  ]);

  const episode = await this.getEpisode(channelId, episodeId);
  const questions = quiz?.questions ?? [];
  const questionCount = Math.max(
    questions.length,
    bundleImages.length,
    episode.quiz_config?.question_count ?? 0,
  );

  const bundleByNumber = new Map(bundleImages.map((b) => [b.bundle_number, b]));
  const items: QuestionImageItem[] = [];

  for (let index = 1; index <= questionCount; index++) {
    const q = questions[index - 1];
    const qId = q?.id ?? `q-${index}`;
    const qText = q?.question ?? `Question ${index}`;
    const bundle = bundleByNumber.get(index);
    const effectiveLayoutId =
      q?.layout_id ??
      (quiz as any)?.layout_id ??
      episode.quiz_config?.target_layout ??
      "media_left_choices_right";

    const slots = buildQuestionImageSlots({
      question: q,
      questionNumber: index,
      effectiveLayoutId,
      assetPlan,
      assetResolution,
      bundle,
      channelId,
      episodeId,
    });

    const item = summarizeSlotsToItem(slots, {
      question_number: index,
      question_id: qId,
      question_text: qText,
      layout_id: effectiveLayoutId,
    });

    items.push(item);
  }

  return {
    episode_id: episodeId,
    channel_id: channelId,
    total_questions: items.length,
    ready_count: items.filter((i) => i.status !== "missing").length,
    uploaded_count: items.filter((i) => i.status === "user_uploaded").length,
    missing_count: items.filter((i) => i.status === "missing").length,
    items,
  };
}

/**
 * Persists a user-uploaded image for a specific question, locking it with explicit provenance
 * and synchronizing bundle images, quiz asset images, and asset resolution.
 */
export async function saveUploadedQuestionImage(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  questionNumber: number,
  content: Uint8Array,
  _filename?: string,
  options?: { slotId?: string; assetId?: string },
): Promise<{ item: QuestionImageItem; invalidated: string[] }> {
  this.assertBundleNumber(questionNumber);
  if (!isValidImageBuffer(content)) {
    throw new RepositoryError("Uploaded content is not a valid PNG, JPEG, or WebP image", "INVALID_IMAGE");
  }

  const [quiz, assetPlan, assetResolution] = await Promise.all([
    this.readQuiz(channelId, episodeId),
    this.readAssetPlan(channelId, episodeId),
    this.readQuizAssetResolution(channelId, episodeId),
  ]);

  const targetQuestion = quiz?.questions.find((q) => q.number === questionNumber);
  const targetQId = targetQuestion?.id ?? `q-${questionNumber}`;
  const slotId = options?.slotId;
  const isChoiceSlot = Boolean(slotId && slotId !== "hero");

  if (!isChoiceSlot) {
    await this.writeBundleImage(channelId, episodeId, questionNumber, content, 0, {
      provenance: "explicit",
      user_selected: true,
      model: "user_selected",
      provider: "user_upload",
    });
  }

  const targetChoiceId = isChoiceSlot ? slotId : undefined;
  const targetAssetId =
    options?.assetId ??
    (isChoiceSlot ? `asset-${targetQId}-${slotId}` : `q${questionNumber}_hero`);
  const targetPurpose = isChoiceSlot ? ("answer_option" as const) : ("hero_question_image" as const);

  const fingerprint = createHash("sha256").update(content).digest("hex");

  const quizAssetPath = await this.writeQuizImageAsset(
    channelId,
    episodeId,
    targetAssetId,
    fingerprint,
    content,
    {
      provenance: "explicit",
      user_selected: true,
      model: "user_selected",
      provider: "user_upload",
    },
  );

  const baseResolution: QuizAssetResolution = assetResolution ?? {
    schema_version: 2,
    episode_id: episodeId,
    template_id: "candy_arcade",
    assets: [],
  };

  const existingAssetIndex = baseResolution.assets.findIndex(
    (a) =>
      a.asset_id === targetAssetId ||
      (isChoiceSlot &&
        (a.question_id === targetQId || a.question_id === `q${questionNumber}`) &&
        ((a as any).choice_id === targetChoiceId ||
          a.semantic_key?.endsWith(`:choice:${targetChoiceId}`) ||
          a.asset_id.endsWith(`-${targetChoiceId}`) ||
          a.asset_id === `asset-${targetQId}-${targetChoiceId}`)) ||
      (!isChoiceSlot &&
        (a.asset_id === `q${questionNumber}_hero` ||
          ((a.question_id === targetQId || a.question_id === `q${questionNumber}`) &&
            a.purpose === "hero_question_image"))),
  );

  const planReq = assetPlan?.assets.find(
    (a) =>
      a.asset_id === targetAssetId ||
      (isChoiceSlot &&
        (a.question_id === targetQId || a.question_id === `q${questionNumber}`) &&
        ((a as any).choice_id === targetChoiceId ||
          a.semantic_key?.endsWith(`:choice:${targetChoiceId}`) ||
          a.asset_id.endsWith(`-${targetChoiceId}`) ||
          a.asset_id === `asset-${targetQId}-${targetChoiceId}`)) ||
      (!isChoiceSlot &&
        (a.asset_id === `q${questionNumber}_hero` ||
          ((a.question_id === targetQId || a.question_id === `q${questionNumber}`) &&
            a.purpose === "hero_question_image"))),
  );

  const choice = targetQuestion?.choices?.find((c) => c.id === targetChoiceId);
  const effectiveLayoutId = targetQuestion?.layout_id ?? (quiz as any)?.layout_id ?? "media_left_choices_right";
  const choiceAspectRatio = resolveQuizLayoutAssetAspectRatio(
    effectiveLayoutId,
    targetPurpose === "answer_option" ? "answer_option" : "hero_question_image",
  );

  const assetReq = planReq ?? {
    asset_id: targetAssetId,
    question_id: targetQId,
    subject: choice?.text ?? targetQuestion?.question ?? `Question ${questionNumber}`,
    purpose: targetPurpose,
    style: "photo_reference" as const,
    aspect_ratio: choiceAspectRatio,
    transparent_background: targetPurpose === "answer_option",
    required: true,
    semantic_key: targetChoiceId ? `${targetQId}:choice:${targetChoiceId}` : `q${questionNumber}_subject`,
    consistency_group_id: null,
  };

  const resolvedEntry: QuizAssetResolution["assets"][number] = {
    ...assetReq,
    fingerprint,
    path: quizAssetPath,
    source: "explicit_episode",
  };

  const updatedAssets = [...baseResolution.assets];
  if (existingAssetIndex >= 0) {
    updatedAssets[existingAssetIndex] = resolvedEntry;
  } else {
    updatedAssets.push(resolvedEntry);
  }

  await this.writeQuizAssetResolution(channelId, episodeId, {
    ...baseResolution,
    assets: updatedAssets,
  });

  const invalidatedStages: Array<"timeline" | "render"> = ["timeline", "render"];
  const invalidated = await this.invalidateQuizArtifacts(channelId, episodeId, invalidatedStages);

  const overview = await this.listEpisodeQuestionImages(channelId, episodeId);
  const item = overview.items.find((i) => i.question_number === questionNumber);
  if (!item) {
    throw new RepositoryError("Failed to retrieve updated question image item", "ASSET_SYNC_FAILED");
  }

  return { item, invalidated };
}

/**
 * Removes custom uploaded image for a specific question or slot, resetting it back to AI/empty state.
 */
export async function deleteUploadedQuestionImage(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  questionNumber: number,
  options?: { slotId?: string; assetId?: string },
): Promise<{ item: QuestionImageItem; invalidated: string[] }> {
  this.assertBundleNumber(questionNumber);

  const slotId = options?.slotId;
  const isChoiceSlot = Boolean(slotId && slotId !== "hero");

  if (!isChoiceSlot) {
    await this.clearBundleImages(channelId, episodeId, questionNumber);
  }

  const [quiz, assetResolution] = await Promise.all([
    this.readQuiz(channelId, episodeId),
    this.readQuizAssetResolution(channelId, episodeId),
  ]);

  const targetQuestion = quiz?.questions.find((q) => q.number === questionNumber);
  const targetQId = targetQuestion?.id ?? `q-${questionNumber}`;
  const targetAssetId = options?.assetId;

  if (assetResolution) {
    let updatedAssets = [...assetResolution.assets];
    if (isChoiceSlot) {
      updatedAssets = updatedAssets.filter(
        (a) =>
          !(
            (a.question_id === targetQId || a.question_id === `q${questionNumber}`) &&
            ((a as any).choice_id === slotId ||
              a.semantic_key?.endsWith(`:choice:${slotId}`) ||
              a.asset_id.endsWith(`-${slotId}`) ||
              a.asset_id === targetAssetId ||
              a.asset_id === `asset-${targetQId}-${slotId}`)
          ),
      );
    } else {
      updatedAssets = updatedAssets.filter(
        (a) =>
          !(
            (a.question_id === targetQId || a.question_id === `q${questionNumber}`) &&
            (a.purpose === "hero_question_image" || a.asset_id === `q${questionNumber}_hero`)
          ),
      );
    }

    await this.writeQuizAssetResolution(channelId, episodeId, {
      ...assetResolution,
      assets: updatedAssets,
    });
  }

  const invalidatedStages: Array<"timeline" | "render"> = ["timeline", "render"];
  const invalidated = await this.invalidateQuizArtifacts(channelId, episodeId, invalidatedStages);

  const overview = await this.listEpisodeQuestionImages(channelId, episodeId);
  const item = overview.items.find((i) => i.question_number === questionNumber);
  if (!item) {
    throw new RepositoryError("Failed to retrieve updated question image item", "ASSET_SYNC_FAILED");
  }

  return { item, invalidated };
}
