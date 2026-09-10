import { hashBankQuestionSource, type BankQuestion, type BankQuestionWithCooldown, type TopicRunCandidate } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import { evaluateEpisodeQuestionEligibility, evaluateShortReelQuestionEligibility } from "../bankEligibility.js";

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
  snapshotRevision?: number;
  snapshotToken?: string;
}

function checkShortReelEligibility(candidate: TopicRunCandidate, bankQuestion: BankQuestionWithCooldown, force: boolean): void {
  const targetArchetype: "versus_faceoff" | "deep_trivia" =
    candidate.archetype === "versus_faceoff" || candidate.archetype === "deep_trivia"
      ? candidate.archetype
      : (bankQuestion.archetype_id as "versus_faceoff" | "deep_trivia");
  const evalQuestion = force ? { ...bankQuestion, channel_cooldown: { is_cooldown: false, days_remaining: 0 } } : bankQuestion;
  const eligibility = evaluateShortReelQuestionEligibility(evalQuestion, { targetArchetype });
  if (!eligibility.eligible) {
    if (!force && bankQuestion.channel_cooldown?.is_cooldown) {
      const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
      throw new RepositoryError(
        `SOURCE_QUESTION_IN_COOLDOWN: Bound source question "${bankQuestion.id}" entered channel cooldown (${days} days remaining). Re-suggest topics or set force=true to override.`,
        "SOURCE_QUESTION_IN_COOLDOWN",
      );
    }
    if (eligibility.reason === "NOT_APPROVED") {
      throw new RepositoryError(
        `SOURCE_QUESTION_NOT_APPROVED: Bound source question "${bankQuestion.id}" is not approved.`,
        "SOURCE_QUESTION_NOT_APPROVED",
      );
    }
    if (eligibility.reason === "MISSING_ENGLISH_SOURCE") {
      throw new RepositoryError(
        `SOURCE_QUESTION_NOT_ENGLISH: Bound source question "${bankQuestion.id}" must be explicitly English.`,
        "SOURCE_QUESTION_NOT_ENGLISH",
      );
    }
    throw new RepositoryError(
      `SOURCE_QUESTION_INELIGIBLE: Bound source question "${bankQuestion.id}" is ineligible: ${eligibility.detail}`,
      "SOURCE_QUESTION_INELIGIBLE",
    );
  }
}

function checkEpisodeEligibility(candidate: TopicRunCandidate, bankQuestion: BankQuestionWithCooldown, force: boolean): void {
  const evalQuestion = force ? { ...bankQuestion, channel_cooldown: { is_cooldown: false, days_remaining: 0 } } : bankQuestion;
  const candQuizFormat = (candidate as { quiz_format?: string; format?: string }).quiz_format ?? (candidate as { format?: string }).format;
  const expectedFormat =
    candQuizFormat === "true_false"
      ? "true_false"
      : candQuizFormat === "multiple_choice" || candQuizFormat === "knowledge"
        ? "multiple_choice"
        : undefined;
  const eligibility = evaluateEpisodeQuestionEligibility(evalQuestion, {
    targetLanguage: "en",
    expectedFormat,
  });
  if (!eligibility.eligible) {
    if (!force && bankQuestion.channel_cooldown?.is_cooldown) {
      const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
      throw new RepositoryError(
        `SOURCE_QUESTION_IN_COOLDOWN: Bound source question "${bankQuestion.id}" entered channel cooldown (${days} days remaining). Re-suggest topics or set force=true to override.`,
        "SOURCE_QUESTION_IN_COOLDOWN",
      );
    }
    if (eligibility.reason === "NOT_APPROVED") {
      throw new RepositoryError(
        `SOURCE_QUESTION_NOT_APPROVED: Bound source question "${bankQuestion.id}" is not approved.`,
        "SOURCE_QUESTION_NOT_APPROVED",
      );
    }
    if (eligibility.reason === "MISSING_ENGLISH_SOURCE") {
      throw new RepositoryError(
        `SOURCE_QUESTION_NOT_ENGLISH: Bound source question "${bankQuestion.id}" must be explicitly English.`,
        "SOURCE_QUESTION_NOT_ENGLISH",
      );
    }
    if (eligibility.reason === "INCOMPATIBLE_FORMAT") {
      throw new RepositoryError(
        `SOURCE_QUESTION_FORMAT_MISMATCH: Bound source question "${bankQuestion.id}" format mismatch: ${eligibility.detail}`,
        "SOURCE_QUESTION_FORMAT_MISMATCH",
      );
    }
    throw new RepositoryError(
      `SOURCE_QUESTION_INELIGIBLE: Bound source question "${bankQuestion.id}" is ineligible: ${eligibility.detail}`,
      "SOURCE_QUESTION_INELIGIBLE",
    );
  }
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

  // Reject duplicate source question IDs in active bindings
  const seenQuestionIds = new Set<string>();
  for (const binding of activeBindings) {
    if (seenQuestionIds.has(binding.source_question_id)) {
      throw new RepositoryError(
        `DUPLICATE_SOURCE_QUESTION_ID: Duplicate source question ID "${binding.source_question_id}" in candidate bindings`,
        "DUPLICATE_SOURCE_QUESTION_ID",
      );
    }
    seenQuestionIds.add(binding.source_question_id);
  }

  // Read full ordered binding set against one coherent inventory snapshot
  const snapshot = await repository.readQuestionBankQuestionsSnapshot({
    channelId,
    limit: 100000,
    offset: 0,
  });

  const bankQuestionMap = new Map<string, BankQuestionWithCooldown>();
  for (const q of snapshot.questions) {
    bankQuestionMap.set(q.id, q);
  }

  const questions: BankQuestion[] = [];
  const questionIds: string[] = [];
  const sourceContentHashes: string[] = [];

  for (const binding of activeBindings) {
    const questionId = binding.source_question_id;
    const bankQuestion = bankQuestionMap.get(questionId);

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

    // Evaluate full shared eligibility
    if (isShortReel) {
      checkShortReelEligibility(candidate, bankQuestion, Boolean(force));
    } else {
      checkEpisodeEligibility(candidate, bankQuestion, Boolean(force));
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
    snapshotRevision: snapshot.revision,
    snapshotToken: `rev_${snapshot.revision}_${snapshot.total}`,
  };
}
