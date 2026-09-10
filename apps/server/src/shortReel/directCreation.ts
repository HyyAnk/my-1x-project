import { hashBankQuestionSource, makeId, nowIso, type TopicRunCandidate, type TopicRunResult } from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import type { RepositoryService } from "../repository/service.js";

export interface CreateDirectShortReelCandidateInput {
  repository: RepositoryService;
  channelId: string;
  questionId: string;
}

export interface DirectShortReelCandidateResult {
  topicId: string;
}

/**
 * Prepares and persists an authoritative candidate topic for direct Short-Reel creation
 * from an approved Question Bank question.
 */
export async function createDirectShortReelCandidate(input: CreateDirectShortReelCandidateInput): Promise<DirectShortReelCandidateResult> {
  const { repository, channelId, questionId } = input;

  const bankQuestion = await repository.getQuestionBankQuestion(questionId, channelId);
  if (!bankQuestion) {
    throw new RepositoryError(`Bank question "${questionId}" not found`, "QUESTION_NOT_FOUND");
  }

  if (bankQuestion.status !== "approved") {
    throw new RepositoryError(
      `Bank question "${questionId}" is not approved (status: ${bankQuestion.status})`,
      "SOURCE_QUESTION_NOT_APPROVED",
    );
  }

  const topicId = makeId("topic_reel");
  const archetype: "versus_faceoff" | "deep_trivia" =
    bankQuestion.archetype_id === "versus_faceoff" || bankQuestion.choices.length === 2 ? "versus_faceoff" : "deep_trivia";

  const contentHash = hashBankQuestionSource(bankQuestion);
  const truncatedTitle = bankQuestion.question.length > 60 ? `${bankQuestion.question.slice(0, 57)}...` : bankQuestion.question;

  const candidate: TopicRunCandidate = {
    slot_id: "slot_direct_1",
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "short_reel",
    archetype,
    aspect_ratio: "9:16",
    title: truncatedTitle,
    premise: bankQuestion.explanation || bankQuestion.question,
    why_it_fits: "Directly selected from Question Bank",
    hook: bankQuestion.question,
    estimated_potential: "High",
    generated_at: nowIso(),
    selected: false,
    question_count: 1,
    origin: "discovery",
    domain_id: bankQuestion.domain_id,
    subtopic_id: bankQuestion.subtopic_id,
    source_bindings: [
      {
        source_question_id: bankQuestion.id,
        source_hash_version: 1,
        source_content_hash: contentHash,
        projection_provenance: {
          source_variant: "native",
          resolved_language: "en",
          translation_key: null,
          translation_provenance: "native",
        },
      },
    ],
  };

  const runResult: TopicRunResult = {
    run_id: makeId("run_direct"),
    target_episode_count: 0,
    target_short_reel_count: 1,
    candidates: [candidate],
    shortages: [],
  };

  await repository.saveTopicRun(channelId, runResult);

  return { topicId };
}
