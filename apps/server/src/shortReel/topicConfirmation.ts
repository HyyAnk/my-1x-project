import { createEnglishSourceSnapshot, type ConfirmShortReelTopicResponse, type ShortReelSourceSnapshot } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository/service.js";
import { resolveBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
import { convertBankQuestionToQuizQuestionLossless } from "../quiz/bank/bridge/bankQuestionConverter.js";
import {
  localizeProductContent,
  normalizeTargetLanguage,
  saveShortReelLocalizationArtifact,
  type TranslateFunction,
} from "../quiz/bank/localization/productLocalization.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import {
  assertConfirmationReplayOrConflict,
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
} from "../repository/topicConfirmationReceipts.js";

export interface ConfirmShortReelTopicDeps {
  repository: RepositoryService;
  channelId: string;
  topicId: string;
  requestId?: string;
  options?: TopicConfirmationOptions;
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

async function executeConfirmShortReelTopic(deps: ConfirmShortReelTopicDeps): Promise<ConfirmShortReelTopicResponse> {
  const { repository, channelId, topicId, requestId, options } = deps;

  // 1. Verify channel exists
  const channel = await repository.getChannel(channelId);

  // Normalize target language upfront - rejects "vi" and unknown codes immediately
  const targetLanguage = normalizeTargetLanguage(options?.target_language || channel.language || "en");

  const incomingOptions: TopicConfirmationOptions = {
    question_count: 1,
    visual_style: options?.visual_style || "mixed",
    render_aspect_ratio: "9:16",
    target_language: targetLanguage,
  };

  // 2. Durable replay check via confirmation receipts
  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, topicId);
  if (existingReceipt) {
    assertConfirmationReplayOrConflict(existingReceipt, incomingOptions, "short_reel");
    if (existingReceipt.status === "completed") {
      const existingReel = await repository.getShortReel({ channel_id: channelId, reel_id: existingReceipt.product_id });
      if (!existingReel) {
        throw new RepositoryError("CONFIRMATION_PRODUCT_MISSING: Completed confirmation product is missing.", "CONFIRMATION_PRODUCT_MISSING");
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
  }

  // 3. Check if Short-Reel was already created for this channel + topic without receipt (legacy replay)
  const legacyReel = existingReceipt ? null : await repository.getShortReelByTopic(channelId, topicId);
  if (legacyReel) {
    const isDefaultLegacyOptions =
      !options?.visual_style &&
      targetLanguage === normalizeTargetLanguage(channel.language || "en");
    if (!isDefaultLegacyOptions) {
      throw new RepositoryError(
        `CONFIRMATION_OPTIONS_CONFLICT: Topic "${topicId}" was previously confirmed with legacy default options. Replay with identical options or re-suggest topics for alternative configurations.`,
        "CONFIRMATION_OPTIONS_CONFLICT",
      );
    }
    const topics = await repository.listTopics(channelId);
    const topic = topics.find((t) => t.topic_id === topicId);
    if (topic && !topic.selected) {
      await repository.markTopicSelected(channelId, topicId, 1);
    }
    await saveTopicConfirmationReceipt(repository, channelId, {
      receipt_id: `rec-${legacyReel.reel_id}`,
      channel_id: channelId,
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

  // 4. Retrieve topic candidate
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  if (topic.content_kind !== "short_reel") {
    throw new RepositoryError(`Cannot confirm topic with content_kind "${topic.content_kind}" as Short-Reel`, "INVALID_CONTENT_KIND");
  }

  // Unconditionally reject unbound candidates for new Short-Reel creation
  if (!topic.source_bindings || topic.source_bindings.length === 0) {
    throw new RepositoryError(
      "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
      "UNBOUND_LEGACY_TOPIC",
    );
  }

  // Authoritatively resolve bound topic source questions
  const boundResult = await resolveBoundTopicSources({
    repository,
    channelId,
    topicId,
    requestedQuestionCount: 1,
  });
  const bankQuestion = boundResult.questions[0];
  const translationProvenance = topic.source_bindings?.[0]?.projection_provenance?.translation_provenance;
  const snapshotProvenance = translationProvenance === "verified_translation" ? "verified_translation" : "source";
  const sourceSnapshot = createEnglishSourceSnapshot(bankQuestion, snapshotProvenance);
  const boundQuestionIds = boundResult.questionIds;
  const boundContentHashes = boundResult.sourceContentHashes;

  // Convert lossless for product localization
  const baseQuizQuestion = convertBankQuestionToQuizQuestionLossless(bankQuestion);
  baseQuizQuestion.number = 1;

  // Localize before creating any discoverable Short-Reel record on disk
  const localizationArtifact = await localizeProductContent({
    targetLanguage,
    productId: `pending_${topic.topic_id}`,
    contentKind: "short_reel",
    sourceQuestionIds: boundQuestionIds,
    sourceContentHashes: boundContentHashes,
    quizQuestions: [baseQuizQuestion],
    videoDescription: topic.premise,
    thumbnailText: topic.hook,
    llmClient: deps.llmClient,
    translateFn: deps.translateFn,
  });

  const effectiveRequestId = requestId || `req-confirm-${Date.now()}`;

  // 5. Create Short-Reel record in repository
  const createdReel =
    (await repository.getShortReelByTopic(channelId, topicId)) ||
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
    ));

  // Persist a recoverable receipt before downstream artifact and projection writes.
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
    status: "preparing",
  });

  // 6. Save product localization artifact linked to the created reel ID
  localizationArtifact.product_id = createdReel.reel_id;
  await saveShortReelLocalizationArtifact(repository, channelId, createdReel.reel_id, localizationArtifact);
  await repository.appendQuestionHistory(channelId, createdReel.reel_id, [baseQuizQuestion], 30);

  // 7. Save durable confirmation receipt
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

  // 8. Reconcile topic selection projection only after record creation succeeds
  await repository.markTopicSelected(channelId, topic.topic_id, 1);

  return {
    content_kind: "short_reel",
    short_reel: createdReel,
  };
}
