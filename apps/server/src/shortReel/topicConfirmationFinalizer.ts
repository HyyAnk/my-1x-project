import {
  createEnglishSourceSnapshot,
  type QuizQuestion,
  type ShortReelRecord,
  type TopicCandidate,
} from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import {
  saveShortReelLocalizationArtifact,
  type ProductLocalizationArtifact,
} from "../quiz/bank/localization/productLocalization.js";
import { resolveMascotReference } from "./mascotReferenceService.js";
import { adoptVisualContext } from "./visualContextService.js";
import type { TopicConfirmationOptions } from "../repository/topicConfirmationReceipts.js";
import { saveCompletedConfirmationReceipt } from "./topicConfirmationReceiptHandler.js";

export interface CreateAndFinalizeReelParams {
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

/**
 * Creates and finalizes a Short-Reel record in storage, updating artifacts, history, and receipts.
 */
export async function createAndFinalizeShortReel(params: CreateAndFinalizeReelParams): Promise<ShortReelRecord> {
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

  await saveCompletedConfirmationReceipt({
    repository,
    channelId,
    topicId: topic.topic_id,
    reelId: createdReel.reel_id,
    requestId: effectiveRequestId,
    incomingOptions,
    boundQuestionIds,
    boundContentHashes,
  });

  return finalizedReel;
}
