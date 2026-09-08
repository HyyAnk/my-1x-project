import { createEnglishSourceSnapshot, type ConfirmShortReelTopicResponse, type ShortReelSourceSnapshot } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository/service.js";
import { selectShortReelQuestion } from "./questionSelection.js";
import { resolveBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
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
}

/**
 * Confirms a Short-Reel topic candidate into Short-Reel storage idempotently,
 * resolving bound source questions with hash verification and receipt tracking,
 * without archetype reselection or mutable bank queries.
 */
export async function confirmShortReelTopic(deps: ConfirmShortReelTopicDeps): Promise<ConfirmShortReelTopicResponse> {
  const { repository, channelId, topicId, requestId, options } = deps;

  // 1. Verify channel exists
  await repository.getChannel(channelId);

  const incomingOptions: TopicConfirmationOptions = {
    question_count: 1,
    ...(options?.visual_style ? { visual_style: options.visual_style } : {}),
    render_aspect_ratio: "9:16",
    ...(options?.target_language ? { target_language: options.target_language } : {}),
  };

  // 2. Durable replay check via confirmation receipts
  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, topicId);
  if (existingReceipt) {
    assertConfirmationReplayOrConflict(existingReceipt, incomingOptions);
    const existingReel = await repository.getShortReel({ channel_id: channelId, reel_id: existingReceipt.product_id });
    if (existingReel) {
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

  // 3. Check if Short-Reel was already created for this channel + topic without receipt (idempotency fallback)
  const existingReel = await repository.getShortReelByTopic(channelId, topicId);
  if (existingReel) {
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

  // 4. Retrieve topic candidate
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  if (topic.content_kind !== "short_reel") {
    throw new RepositoryError(`Cannot confirm topic with content_kind "${topic.content_kind}" as Short-Reel`, "INVALID_CONTENT_KIND");
  }

  let sourceSnapshot: ShortReelSourceSnapshot;
  let boundQuestionIds: string[];
  let boundContentHashes: string[];

  if (topic.source_bindings && topic.source_bindings.length > 0) {
    // Stage 4: Authoritatively resolve bound topic source questions
    const boundResult = await resolveBoundTopicSources({
      repository,
      channelId,
      topicId,
      requestedQuestionCount: 1,
    });
    const bankQuestion = boundResult.questions[0];
    const translationProvenance = topic.source_bindings?.[0]?.projection_provenance?.translation_provenance;
    const snapshotProvenance = translationProvenance === "verified_translation" ? "verified_translation" : "source";
    sourceSnapshot = createEnglishSourceSnapshot(bankQuestion, snapshotProvenance);
    boundQuestionIds = boundResult.questionIds;
    boundContentHashes = boundResult.sourceContentHashes;
  } else {
    // Legacy unbound candidate fallback: select question by archetype
    sourceSnapshot = await selectShortReelQuestion({
      topic,
      repository,
    });
    boundQuestionIds = [sourceSnapshot.question_id];
    boundContentHashes = [sourceSnapshot.content_hash];
  }

  const effectiveRequestId = requestId || `req-confirm-${Date.now()}`;

  // 5. Create Short-Reel record in repository
  const createdReel = await repository.createShortReel(
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
  );

  // 6. Save durable confirmation receipt
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
  });

  // 7. Reconcile topic selection projection only after record creation succeeds
  await repository.markTopicSelected(channelId, topic.topic_id, 1);

  return {
    content_kind: "short_reel",
    short_reel: createdReel,
  };
}
