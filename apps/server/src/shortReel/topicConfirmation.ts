import type { ConfirmShortReelTopicResponse } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository/service.js";
import { selectShortReelQuestion } from "./questionSelection.js";

export interface ConfirmShortReelTopicDeps {
  repository: RepositoryService;
  channelId: string;
  topicId: string;
  requestId?: string;
}

/**
 * Confirms a Short-Reel topic candidate into Short-Reel storage idempotently,
 * selecting an approved English bank question or verified English translation,
 * and only then reconciling topic selected state.
 */
export async function confirmShortReelTopic(deps: ConfirmShortReelTopicDeps): Promise<ConfirmShortReelTopicResponse> {
  const { repository, channelId, topicId, requestId } = deps;

  // Verify channel exists
  await repository.getChannel(channelId);

  // Check if Short-Reel was already created for this channel + topic (idempotency)
  const existingReel = await repository.getShortReelByTopic(channelId, topicId);

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

  // Retrieve topic candidate
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  if (topic.content_kind !== "short_reel") {
    throw new RepositoryError(`Cannot confirm topic with content_kind "${topic.content_kind}" as Short-Reel`, "INVALID_CONTENT_KIND");
  }

  // Select approved English question from question bank
  const sourceSnapshot = await selectShortReelQuestion({
    topic,
    repository,
  });

  // Create Short-Reel record in repository
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
    requestId || `req-confirm-${Date.now()}`,
  );

  // Reconcile topic selection projection only after record creation succeeds
  await repository.markTopicSelected(channelId, topic.topic_id, 1);

  return {
    content_kind: "short_reel",
    short_reel: createdReel,
  };
}
