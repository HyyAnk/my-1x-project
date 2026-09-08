import { hashBankQuestionSource, type BankQuestion, type TopicRunCandidate } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";

export interface ResolveBoundTopicSourcesInput {
  repository: RepositoryService;
  channelId: string;
  topicId: string;
  requestedQuestionCount?: number;
  force?: boolean;
  clientBindings?: unknown;
}

export interface ResolvedBoundTopicSources {
  topic: TopicRunCandidate;
  questions: BankQuestion[];
  questionIds: string[];
  sourceContentHashes: string[];
  selectedCount: number;
}

/**
 * Authoritatively resolves and validates bound source questions for a topic candidate.
 * Guarantees zero JIT question creation, zero client binding forgery, and immutable
 * canonical snapshot verification against Question Bank storage.
 */
export async function resolveBoundTopicSources(input: ResolveBoundTopicSourcesInput): Promise<ResolvedBoundTopicSources> {
  const { repository, channelId, topicId, requestedQuestionCount, force } = input;

  // 1. Verify channel exists
  await repository.getChannel(channelId);

  // 2. Locate topic candidate in channel repository
  const topics = await repository.listTopics(channelId);
  const candidate = topics.find((t) => t.topic_id === topicId) as TopicRunCandidate | undefined;
  if (!candidate || candidate.channel_id !== channelId) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  // 3. Reject unbound legacy topic candidates
  if (!candidate.source_bindings || candidate.source_bindings.length === 0) {
    throw new RepositoryError(
      "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
      "UNBOUND_LEGACY_TOPIC",
    );
  }

  // 4. Enforce supported source capacity
  const isShortReel = candidate.content_kind === "short_reel";
  const selectedCount = isShortReel ? 1 : (requestedQuestionCount ?? candidate.question_count ?? candidate.source_bindings.length);

  if (selectedCount <= 0) {
    throw new RepositoryError("Invalid question count requested", "INVALID_QUESTION_COUNT");
  }

  if (selectedCount > candidate.source_bindings.length) {
    throw new RepositoryError(
      `INSUFFICIENT_SOURCE_CAPACITY: Requested question count (${selectedCount}) exceeds supported source capacity (${candidate.source_bindings.length})`,
      "INSUFFICIENT_SOURCE_CAPACITY",
    );
  }

  // 5. Authoritatively resolve bound questions and verify immutable content hashes
  const activeBindings = candidate.source_bindings.slice(0, selectedCount);
  const questions: BankQuestion[] = [];
  const questionIds: string[] = [];
  const sourceContentHashes: string[] = [];

  for (const binding of activeBindings) {
    const questionId = binding.source_question_id;
    const bankQuestion = await repository.getQuestionBankQuestion(questionId, channelId);

    if (!bankQuestion) {
      throw new RepositoryError(
        `SOURCE_QUESTION_NOT_FOUND: Bound source question "${questionId}" was not found in question bank. Re-suggest topics to bind active sources.`,
        "SOURCE_QUESTION_NOT_FOUND",
      );
    }

    if (bankQuestion.status !== "approved") {
      throw new RepositoryError(
        `SOURCE_QUESTION_NOT_APPROVED: Bound source question "${questionId}" is not approved (status: "${bankQuestion.status}"). Only approved questions can be confirmed into products.`,
        "SOURCE_QUESTION_NOT_APPROVED",
      );
    }

    const currentHash = hashBankQuestionSource(bankQuestion);
    if (currentHash !== binding.source_content_hash) {
      throw new RepositoryError(
        `SOURCE_QUESTION_MODIFIED: Bound source question "${questionId}" was modified after topic suggestion. Re-suggest topics to synchronize canonical content.`,
        "SOURCE_QUESTION_MODIFIED",
      );
    }

    const isCooldown = Boolean(bankQuestion.channel_cooldown?.is_cooldown);
    if (isCooldown && !force) {
      const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
      throw new RepositoryError(
        `SOURCE_QUESTION_IN_COOLDOWN: Bound source question "${questionId}" entered channel cooldown (${days} days remaining). Re-suggest topics or set force=true to override.`,
        "SOURCE_QUESTION_IN_COOLDOWN",
      );
    }

    questions.push(bankQuestion);
    questionIds.push(questionId);
    sourceContentHashes.push(binding.source_content_hash);
  }

  return {
    topic: candidate,
    questions,
    questionIds,
    sourceContentHashes,
    selectedCount,
  };
}
