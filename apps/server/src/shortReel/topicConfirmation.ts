import {
  createEnglishSourceSnapshot,
  sha256Hex,
  type Channel,
  type ConfirmShortReelTopicResponse,
  type QuizQuestion,
  type ShortReelRecord,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository/service.js";
import { resolveBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
import { convertBankQuestionToQuizQuestionLossless } from "../quiz/bank/bridge/bankQuestionConverter.js";
import {
  loadShortReelLocalizationArtifact,
  localizeProductContent,
  normalizeTargetLanguage,
  saveShortReelLocalizationArtifact,
  type ProductLocalizationArtifact,
  type TranslateFunction,
} from "../quiz/bank/localization/productLocalization.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { resolveMascotReference } from "./mascotReferenceService.js";
import { adoptVisualContext } from "./visualContextService.js";
import {
  assertConfirmationReplayOrConflict,
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
  type TopicConfirmationReceipt,
} from "../repository/topicConfirmationReceipts.js";

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
 * resolving bound source questions with hash verification and receipt tracking,
 * without archetype reselection or mutable bank queries.
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

async function handleCompletedReelReceipt(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
  receipt: TopicConfirmationReceipt,
): Promise<ConfirmShortReelTopicResponse> {
  const existingReel = await repository.getShortReel({ channel_id: channelId, reel_id: receipt.product_id });
  if (!existingReel) {
    throw new RepositoryError("CONFIRMATION_PRODUCT_MISSING: Completed confirmation product is missing.", "CONFIRMATION_PRODUCT_MISSING");
  }
  const locArtifact = await loadShortReelLocalizationArtifact(repository, channelId, existingReel.reel_id).catch(() => null);
  if (!locArtifact) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_CORRUPT: Completed Short-Reel localization artifact is missing or corrupted.",
      "CONFIRMATION_PRODUCT_CORRUPT",
    );
  }
  // Reconcile question history if missing
  const existingHistory = await repository.readQuestionHistory(channelId);
  const hasHistory = existingHistory.some((entry) => entry.episode_id === existingReel.reel_id);
  if (!hasHistory && existingReel.source.original_question) {
    const baseQ = convertBankQuestionToQuizQuestionLossless(existingReel.source.original_question);
    await repository.appendQuestionHistory(channelId, existingReel.reel_id, [baseQ], 30);
  }
  // Reconcile topic selected state projection if not already projected
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (topic && !topic.selected) {
    await repository.markTopicSelected(channelId, topicId, 1);
  }
  return {
    content_kind: "short_reel",
    short_reel: existingReel,
  };
}

async function handleLegacyDiscoveredReel(
  repository: RepositoryService,
  channel: Channel,
  topicId: string,
  legacyReel: ShortReelRecord,
  options: ConfirmShortReelTopicDeps["options"],
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
  const topics = await repository.listTopics(channel.channel_id);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (topic && !topic.selected) {
    await repository.markTopicSelected(channel.channel_id, topicId, 1);
  }
  // Reconcile question history if missing
  const existingHistory = await repository.readQuestionHistory(channel.channel_id);
  const hasHistory = existingHistory.some((entry) => entry.episode_id === legacyReel.reel_id);
  if (!hasHistory && legacyReel.source.original_question) {
    const baseQ = convertBankQuestionToQuizQuestionLossless(legacyReel.source.original_question);
    await repository.appendQuestionHistory(channel.channel_id, legacyReel.reel_id, [baseQ], 30);
  }
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

async function findAndValidateTopicCandidate(repository: RepositoryService, channelId: string, topicId: string): Promise<TopicCandidate> {
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

interface CreateAndFinalizeParams {
  repository: RepositoryService;
  channelId: string;
  topic: TopicCandidate;
  sourceSnapshot: ReturnType<typeof createEnglishSourceSnapshot>;
  baseQuizQuestion: QuizQuestion;
  boundQuestionIds: string[];
  boundContentHashes: string[];
  incomingOptions: TopicConfirmationOptions;
  effectiveRequestId: string;
  reservedReelId: string;
  localizationArtifact: ProductLocalizationArtifact;
}

async function createAndFinalizeShortReel(params: CreateAndFinalizeParams) {
  const {
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
  } = params;

  const createdReel =
    (await repository.getShortReelByTopic(channelId, topic.topic_id)) ||
    (await repository.createShortReel(
      channelId,
      {
        topic_id: topic.topic_id,
        channel_id: channelId,
        title: topic.title,
        premise: topic.premise,
        hook: topic.hook,
        origin: topic.origin,
      },
      sourceSnapshot,
      effectiveRequestId,
      reservedReelId,
    ));

  localizationArtifact.product_id = createdReel.reel_id;
  await saveShortReelLocalizationArtifact(repository, channelId, createdReel.reel_id, localizationArtifact);
  await repository.appendQuestionHistory(channelId, createdReel.reel_id, [baseQuizQuestion], 30);
  await repository.markTopicSelected(channelId, topic.topic_id, 1);

  let finalizedReel = createdReel;
  try {
    const visualContext = await resolveMascotReference(repository, { channel_id: channelId, reel_id: createdReel.reel_id });
    finalizedReel = await adoptVisualContext(repository, { channel_id: channelId, reel_id: createdReel.reel_id }, visualContext);
  } catch {
    // Channel mascot might not be configured yet; visual context will be resolved when generating assets.
  }

  await saveTopicConfirmationReceipt(repository, channelId, {
    receipt_id: `rec-${createdReel.reel_id}`,
    channel_id: channelId,
    topic_id: topic.topic_id,
    content_kind: "short_reel",
    product_id: createdReel.reel_id,
    confirmed_at: new Date().toISOString(),
    request_id: effectiveRequestId,
    options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
    options: incomingOptions,
    source_question_ids: boundQuestionIds,
    source_content_hashes: boundContentHashes,
    status: "completed",
  });

  return finalizedReel;
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

interface EnsurePreparingReceiptParams {
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

async function ensurePreparingReceipt(params: EnsurePreparingReceiptParams): Promise<void> {
  const {
    repository,
    channelId,
    topicId,
    existingReceipt,
    reservedReelId,
    effectiveRequestId,
    incomingOptions,
    boundQuestionIds,
    boundContentHashes,
  } = params;

  if (existingReceipt && existingReceipt.status === "preparing") {
    return;
  }

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

async function executeConfirmShortReelTopic(deps: ConfirmShortReelTopicDeps): Promise<ConfirmShortReelTopicResponse> {
  const { repository, channelId, topicId, requestId, options } = deps;

  // 1. Verify channel exists
  const channel = await repository.getChannel(channelId);
  const { incomingOptions, targetLanguage, explicitThumbnailText } = resolveConfirmationOptions(deps, channel.language);

  // 2. Durable replay check via confirmation receipts
  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, topicId);
  if (existingReceipt) {
    assertConfirmationReplayOrConflict(existingReceipt, incomingOptions, "short_reel");
    if (existingReceipt.status === "completed") {
      return await handleCompletedReelReceipt(repository, channelId, topicId, existingReceipt);
    }
  }

  // 3. Check if Short-Reel was already created for this channel + topic without receipt (legacy replay)
  const legacyReel = existingReceipt ? null : await repository.getShortReelByTopic(channelId, topicId);
  if (legacyReel) {
    return await handleLegacyDiscoveredReel(repository, channel, topicId, legacyReel, options, incomingOptions, targetLanguage, requestId);
  }

  // 4. Retrieve topic candidate and bound sources
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
