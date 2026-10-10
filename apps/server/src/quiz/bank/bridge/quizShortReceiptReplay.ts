import { quizShortProductRef } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import {
  assertConfirmationReplayOrConflict,
  getTopicConfirmationReceipt,
  type TopicConfirmationOptions,
} from "../../../repository/topicConfirmationReceipts.js";
import type { CreateQuizShortFromTopicWithBankResult } from "./quizShortConfirmationConfig.js";

/**
 * Replays a completed Quiz Short confirmation receipt: verifies the artifacts are intact, repairs
 * missing question history and topic selection, and returns the existing product without a task.
 * Returns null when the receipt is still preparing (the caller then rebuilds the product).
 */
export async function handleExistingQuizShortReceipt(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
  incomingOptions: TopicConfirmationOptions,
): Promise<CreateQuizShortFromTopicWithBankResult | null> {
  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, topicId);
  if (!existingReceipt) return null;

  assertConfirmationReplayOrConflict(existingReceipt, incomingOptions, "quiz_short");
  if (existingReceipt.status !== "completed") return null;

  const ref = quizShortProductRef(channelId, existingReceipt.product_id);
  const quizShort = await repository.getQuizShort(channelId, existingReceipt.product_id);
  const quiz = await repository.readQuiz(channelId, ref);
  const directorPlan = await repository.readDirectorPlan(channelId, ref);

  if (!quiz || quiz.questions.length === 0) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_CORRUPT: Completed Quiz Short quiz is missing or empty.",
      "CONFIRMATION_PRODUCT_CORRUPT",
    );
  }
  if (!directorPlan || directorPlan.beats.length === 0) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_CORRUPT: Completed Quiz Short director plan is missing or empty.",
      "CONFIRMATION_PRODUCT_CORRUPT",
    );
  }

  const history = await repository.readQuestionHistory(channelId);
  if (!history.some((entry) => entry.episode_id === quizShort.quiz_short_id)) {
    await repository.appendQuestionHistory(channelId, ref, quiz.questions, 30, undefined, "quiz_short");
  }

  const topic = (await repository.listTopics(channelId)).find((t) => t.topic_id === topicId);
  if (topic && !topic.selected) {
    await repository.markTopicSelected(channelId, topicId, existingReceipt.source_question_ids.length);
  }

  return {
    quiz_short: quizShort,
    task: null,
    quiz,
    director_plan: directorPlan,
    question_ids: existingReceipt.source_question_ids,
    cooldown_recorded: true,
  };
}
