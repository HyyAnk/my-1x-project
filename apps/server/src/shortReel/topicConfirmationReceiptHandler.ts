import {
  type Channel,
  type ConfirmShortReelTopicResponse,
  type BankQuestion,
  type ShortReelRecord,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository/service.js";
import { convertBankQuestionToQuizQuestionLossless } from "../quiz/bank/bridge/bankQuestionConverter.js";
import {
  loadShortReelLocalizationArtifact,
  normalizeTargetLanguage,
} from "../quiz/bank/localization/productLocalization.js";
import {
  computeConfirmationOptionsFingerprint,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
  type TopicConfirmationReceipt,
} from "../repository/topicConfirmationReceipts.js";

/**
 * Reconciles channel question history for an confirmed Short-Reel if missing.
 */
export async function reconcileQuestionHistory(
  repository: RepositoryService,
  channelId: string,
  reelId: string,
  originalQuestion?: BankQuestion,
): Promise<void> {
  const existingHistory = await repository.readQuestionHistory(channelId);
  const hasHistory = existingHistory.some((entry) => entry.episode_id === reelId);
  if (!hasHistory && originalQuestion) {
    const baseQ = convertBankQuestionToQuizQuestionLossless(originalQuestion);
    await repository.appendQuestionHistory(channelId, reelId, [baseQ], 30);
  }
}

/**
 * Ensures a confirmed topic is marked selected in repository state projection.
 */
export async function reconcileTopicSelection(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
): Promise<void> {
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (topic && !topic.selected) {
    await repository.markTopicSelected(channelId, topicId, 1);
  }
}

/**
 * Combined projection reconciliation for history and topic selection.
 */
export async function reconcileStateProjections(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
  reelId: string,
  originalQuestion?: BankQuestion,
): Promise<void> {
  await reconcileQuestionHistory(repository, channelId, reelId, originalQuestion);
  await reconcileTopicSelection(repository, channelId, topicId);
}

/**
 * Reconciles and returns an existing completed Short-Reel from its confirmation receipt.
 */
export async function handleCompletedReelReceipt(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
  receipt: TopicConfirmationReceipt,
): Promise<ConfirmShortReelTopicResponse> {
  const existingReel = await repository.getShortReel({ channel_id: channelId, reel_id: receipt.product_id });
  if (!existingReel) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_MISSING: Completed confirmation product is missing.",
      "CONFIRMATION_PRODUCT_MISSING",
    );
  }
  const locArtifact = await loadShortReelLocalizationArtifact(repository, channelId, existingReel.reel_id).catch(() => null);
  if (!locArtifact) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_CORRUPT: Completed Short-Reel localization artifact is missing or corrupted.",
      "CONFIRMATION_PRODUCT_CORRUPT",
    );
  }

  await reconcileStateProjections(repository, channelId, topicId, existingReel.reel_id, existingReel.source.original_question);

  return {
    content_kind: "short_reel",
    short_reel: existingReel,
  };
}

/**
 * Reconciles a legacy discovered Short-Reel created prior to receipt tracking.
 */
export async function handleLegacyDiscoveredReel(
  repository: RepositoryService,
  channel: Channel,
  topicId: string,
  legacyReel: ShortReelRecord,
  options: TopicConfirmationOptions | undefined,
  incomingOptions: TopicConfirmationOptions,
  targetLanguage: string,
  requestId?: string,
): Promise<ConfirmShortReelTopicResponse> {
  const isDefaultLegacyOptions = !options?.visual_style && targetLanguage === normalizeTargetLanguage(channel.language || "en");
  if (!isDefaultLegacyOptions) {
    throw new RepositoryError(
      `CONFIRMATION_OPTIONS_CONFLICT: Topic "${topicId}" was previously confirmed with legacy default options. Replay with identical options or re-suggest topics for alternative configurations.`,
      "CONFIRMATION_OPTIONS_CONFLICT",
    );
  }
  const locArtifact = await loadShortReelLocalizationArtifact(repository, channel.channel_id, legacyReel.reel_id).catch(() => null);
  if (!locArtifact) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_INCOMPLETE: Discovered Short-Reel without receipt is missing valid localization artifact.",
      "CONFIRMATION_PRODUCT_INCOMPLETE",
    );
  }

  await reconcileStateProjections(repository, channel.channel_id, topicId, legacyReel.reel_id, legacyReel.source.original_question);

  await saveTopicConfirmationReceipt(repository, channel.channel_id, {
    receipt_id: `rec-${legacyReel.reel_id}`,
    channel_id: channel.channel_id,
    topic_id: topicId,
    content_kind: "short_reel",
    product_id: legacyReel.reel_id,
    confirmed_at: new Date().toISOString(),
    request_id: requestId || `req-reconcile-${Date.now()}`,
    options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
    options: incomingOptions,
    source_question_ids: [legacyReel.source.question_id],
    source_content_hashes: [legacyReel.source.content_hash],
    status: "completed",
  });

  return {
    content_kind: "short_reel",
    short_reel: legacyReel,
  };
}

export interface EnsurePreparingReceiptParams {
  repository: RepositoryService;
  channelId: string;
  topicId: string;
  existingReceipt: TopicConfirmationReceipt | null;
  reservedReelId: string;
  effectiveRequestId: string;
  incomingOptions: TopicConfirmationOptions;
  boundQuestionIds: string[];
  boundContentHashes: string[];
}

/**
 * Idempotently creates a preparing receipt to establish intent before generation/localization.
 */
export async function ensurePreparingReceipt(params: EnsurePreparingReceiptParams): Promise<void> {
  const { repository, channelId, topicId, existingReceipt, reservedReelId, effectiveRequestId, incomingOptions, boundQuestionIds, boundContentHashes } = params;
  if (existingReceipt && existingReceipt.status === "preparing") return;

  await saveTopicConfirmationReceipt(repository, channelId, {
    receipt_id: `rec-${reservedReelId}`,
    channel_id: channelId,
    topic_id: topicId,
    content_kind: "short_reel",
    product_id: reservedReelId,
    confirmed_at: new Date().toISOString(),
    request_id: effectiveRequestId,
    options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
    options: incomingOptions,
    source_question_ids: boundQuestionIds,
    source_content_hashes: boundContentHashes,
    status: "preparing",
  });
}

export interface SaveCompletedConfirmationReceiptParams {
  repository: RepositoryService;
  channelId: string;
  topicId: string;
  reelId: string;
  requestId: string;
  incomingOptions: TopicConfirmationOptions;
  boundQuestionIds: string[];
  boundContentHashes: string[];
}

/**
 * Saves a completed confirmation receipt marking final durable confirmation.
 */
export async function saveCompletedConfirmationReceipt(params: SaveCompletedConfirmationReceiptParams): Promise<void> {
  const { repository, channelId, topicId, reelId, requestId, incomingOptions, boundQuestionIds, boundContentHashes } = params;

  await saveTopicConfirmationReceipt(repository, channelId, {
    receipt_id: `rec-${reelId}`,
    channel_id: channelId,
    topic_id: topicId,
    content_kind: "short_reel",
    product_id: reelId,
    confirmed_at: new Date().toISOString(),
    request_id: requestId,
    options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
    options: incomingOptions,
    source_question_ids: boundQuestionIds,
    source_content_hashes: boundContentHashes,
    status: "completed",
  });
}

