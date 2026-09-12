import {
  createEnglishSourceSnapshot,
  sha256Hex,
  type ConfirmShortReelTopicResponse,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository/service.js";
import { resolveBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
import { convertBankQuestionToQuizQuestionLossless } from "../quiz/bank/bridge/bankQuestionConverter.js";
import {
  localizeProductContent,
  normalizeTargetLanguage,
  type TranslateFunction,
} from "../quiz/bank/localization/productLocalization.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import {
  assertConfirmationReplayOrConflict,
  getTopicConfirmationReceipt,
  type TopicConfirmationOptions,
} from "../repository/topicConfirmationReceipts.js";
import {
  ensurePreparingReceipt,
  handleCompletedReelReceipt,
  handleLegacyDiscoveredReel,
} from "./topicConfirmationReceiptHandler.js";
import { createAndFinalizeShortReel } from "./topicConfirmationFinalizer.js";

export interface ConfirmShortReelTopicDeps {
  repository: RepositoryService;
  channelId: string;
  topicId: string;
  requestId?: string;
  options?: TopicConfirmationOptions;
  customHookText?: string;
  thumbnailText?: string;
  llmClient?: LLMClient | null;
  translateFn?: TranslateFunction;
}

const reelTopicConfirmationLocks = new Map<string, Promise<ConfirmShortReelTopicResponse>>();

/**
 * Confirms a Short-Reel topic candidate into Short-Reel storage idempotently,
 * resolving bound source questions with hash verification and receipt tracking.
 */
export async function confirmShortReelTopic(deps: ConfirmShortReelTopicDeps): Promise<ConfirmShortReelTopicResponse> {
  const lockKey = `${deps.channelId}:${deps.topicId}`;
  while (reelTopicConfirmationLocks.has(lockKey)) {
    try {
      await reelTopicConfirmationLocks.get(lockKey);
    } catch {
      // A failed attempt must not prevent a later retry from reconciling state.
    }
  }
  const task = executeConfirmShortReelTopic(deps);
  reelTopicConfirmationLocks.set(lockKey, task);
  try {
    return await task;
  } finally {
    reelTopicConfirmationLocks.delete(lockKey);
  }
}

async function findAndValidateTopicCandidate(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
): Promise<TopicCandidate> {
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }
  if (topic.content_kind !== "short_reel") {
    throw new RepositoryError(`Cannot confirm topic with content_kind "${topic.content_kind}" as Short-Reel`, "INVALID_CONTENT_KIND");
  }
  if (!topic.source_bindings || topic.source_bindings.length === 0) {
    throw new RepositoryError(
      "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
      "UNBOUND_LEGACY_TOPIC",
    );
  }
  return topic;
}

function resolveConfirmationOptions(
  deps: ConfirmShortReelTopicDeps,
  channelLanguage?: string,
): { incomingOptions: TopicConfirmationOptions; targetLanguage: string; explicitThumbnailText?: string } {
  const targetLanguage = normalizeTargetLanguage(deps.options?.target_language || channelLanguage || "en");
  const explicitCustomHookText = deps.customHookText?.trim() || deps.options?.custom_hook_text?.trim() || undefined;
  const explicitThumbnailText = explicitCustomHookText || deps.thumbnailText?.trim() || deps.options?.thumbnail_text?.trim() || undefined;

  const incomingOptions: TopicConfirmationOptions = {
    question_count: 1,
    visual_style: deps.options?.visual_style || "mixed",
    render_aspect_ratio: "9:16",
    target_language: targetLanguage,
    ...(explicitCustomHookText ? { custom_hook_text: explicitCustomHookText } : {}),
    ...(explicitThumbnailText ? { thumbnail_text: explicitThumbnailText } : {}),
  };

  return { incomingOptions, targetLanguage, explicitThumbnailText };
}

function resolveSnapshotProvenance(topic: TopicCandidate): "verified_translation" | "source" {
  const translationProvenance = topic.source_bindings?.[0]?.projection_provenance?.translation_provenance;
  return translationProvenance === "verified_translation" ? "verified_translation" : "source";
}

async function executeConfirmShortReelTopic(deps: ConfirmShortReelTopicDeps): Promise<ConfirmShortReelTopicResponse> {
  const { repository, channelId, topicId, requestId, options } = deps;

  const channel = await repository.getChannel(channelId);
  const { incomingOptions, targetLanguage, explicitThumbnailText } = resolveConfirmationOptions(deps, channel.language);

  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, topicId);
  if (existingReceipt) {
    assertConfirmationReplayOrConflict(existingReceipt, incomingOptions, "short_reel");
    if (existingReceipt.status === "completed") {
      return await handleCompletedReelReceipt(repository, channelId, topicId, existingReceipt);
    }
  }

  const legacyReel = existingReceipt ? null : await repository.getShortReelByTopic(channelId, topicId);
  if (legacyReel) {
    return await handleLegacyDiscoveredReel(repository, channel, topicId, legacyReel, options, incomingOptions, targetLanguage, requestId);
  }

  const topic = await findAndValidateTopicCandidate(repository, channelId, topicId);
  const boundResult = await resolveBoundTopicSources({
    repository,
    channelId,
    topicId,
    requestedQuestionCount: 1,
    force: existingReceipt?.status === "preparing",
  });

  const bankQuestion = boundResult.questions[0];
  const sourceSnapshot = createEnglishSourceSnapshot(bankQuestion, resolveSnapshotProvenance(topic));
  const boundQuestionIds = boundResult.questionIds;
  const boundContentHashes = boundResult.sourceContentHashes;

  const baseQuizQuestion = convertBankQuestionToQuizQuestionLossless(bankQuestion);
  baseQuizQuestion.number = 1;

  const effectiveRequestId = requestId || existingReceipt?.request_id || `req-confirm-${Date.now()}`;
  const reservedReelId = existingReceipt?.product_id || `sreel_${sha256Hex(`${channelId}:${topic.topic_id}:${Date.now()}`).slice(0, 16)}`;

  await ensurePreparingReceipt({
    repository,
    channelId,
    topicId: topic.topic_id,
    existingReceipt,
    reservedReelId,
    effectiveRequestId,
    incomingOptions,
    boundQuestionIds,
    boundContentHashes,
  });

  const localizationArtifact = await localizeProductContent({
    targetLanguage,
    productId: reservedReelId,
    contentKind: "short_reel",
    sourceQuestionIds: boundQuestionIds,
    sourceContentHashes: boundContentHashes,
    quizQuestions: [baseQuizQuestion],
    videoDescription: topic.premise,
    thumbnailText: explicitThumbnailText,
    llmClient: deps.llmClient,
    translateFn: deps.translateFn,
  });

  const createdReel = await createAndFinalizeShortReel({
    repository,
    channelId,
    topic,
    sourceSnapshot,
    baseQuizQuestion,
    boundQuestionIds,
    boundContentHashes,
    incomingOptions,
    effectiveRequestId,
    reservedReelId,
    localizationArtifact,
  });

  return {
    content_kind: "short_reel",
    short_reel: createdReel,
  };
}
