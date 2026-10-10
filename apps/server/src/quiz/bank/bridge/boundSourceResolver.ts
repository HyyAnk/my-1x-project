import { hashBankQuestionSource, type BankQuestion, type BankQuestionWithCooldown, type TopicRunCandidate } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import type { BankCooldownScope } from "../../../repository/quizArtifacts.js";
import { checkBoundSourceEligibility } from "./boundSourceEligibility.js";

export { checkEpisodeEligibility, checkQuizShortEligibility, checkShortReelEligibility } from "./boundSourceEligibility.js";

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

async function findBoundCandidate(repository: RepositoryService, channelId: string, topicId: string): Promise<TopicRunCandidate> {
  await repository.getChannel(channelId);
  const topics = await repository.listTopics(channelId);
  const candidate = topics.find((t) => t.topic_id === topicId) as TopicRunCandidate | undefined;
  if (!candidate || candidate.channel_id !== channelId) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }
  if (!candidate.source_bindings || candidate.source_bindings.length === 0) {
    throw new RepositoryError(
      "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
      "UNBOUND_LEGACY_TOPIC",
    );
  }
  return candidate;
}

/** Short Reels always bind one source; Quiz Shorts and Episodes take the requested count or the candidate's own. */
function resolveSelectedCount(candidate: TopicRunCandidate, requestedQuestionCount: number | undefined): number {
  if (candidate.content_kind === "short_reel") return 1;
  if (candidate.content_kind === "quiz_short") return requestedQuestionCount ?? candidate.question_count;
  return requestedQuestionCount ?? candidate.question_count ?? candidate.source_bindings.length;
}

function assertSourceCapacity(candidate: TopicRunCandidate, selectedCount: number): void {
  if (selectedCount <= 0) {
    throw new RepositoryError("Invalid question count requested", "INVALID_QUESTION_COUNT");
  }
  if (selectedCount > candidate.source_bindings.length) {
    throw new RepositoryError(
      `INSUFFICIENT_SOURCE_CAPACITY: Requested question count (${selectedCount}) exceeds supported source capacity (${candidate.source_bindings.length})`,
      "INSUFFICIENT_SOURCE_CAPACITY",
    );
  }
}

function assertUniqueBindings(bindings: TopicRunCandidate["source_bindings"]): void {
  const seenQuestionIds = new Set<string>();
  for (const binding of bindings) {
    if (seenQuestionIds.has(binding.source_question_id)) {
      throw new RepositoryError(
        `DUPLICATE_SOURCE_QUESTION_ID: Duplicate source question ID "${binding.source_question_id}" in candidate bindings`,
        "DUPLICATE_SOURCE_QUESTION_ID",
      );
    }
    seenQuestionIds.add(binding.source_question_id);
  }
}

function cooldownScopeFor(candidate: TopicRunCandidate): BankCooldownScope {
  if (candidate.content_kind === "short_reel") return "short_reel";
  if (candidate.content_kind === "quiz_short") return "quiz_short";
  return "episode";
}

function verifyBoundQuestion(
  binding: TopicRunCandidate["source_bindings"][number],
  bankQuestion: BankQuestionWithCooldown | undefined,
): BankQuestionWithCooldown {
  const questionId = binding.source_question_id;
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
  if (hashBankQuestionSource(bankQuestion) !== binding.source_content_hash) {
    throw new RepositoryError(
      `SOURCE_QUESTION_MODIFIED: Bound source question "${questionId}" was modified after topic suggestion. Re-suggest topics to synchronize canonical content.`,
      "SOURCE_QUESTION_MODIFIED",
    );
  }
  return bankQuestion;
}

/**
 * Authoritatively resolves and validates bound source questions for a topic candidate.
 * Guarantees zero JIT question creation, zero client binding forgery, and immutable
 * canonical snapshot verification against Question Bank storage.
 */
export async function resolveBoundTopicSources(input: ResolveBoundTopicSourcesInput): Promise<ResolvedBoundTopicSources> {
  const { repository, channelId, topicId, requestedQuestionCount, force } = input;
  const candidate = await findBoundCandidate(repository, channelId, topicId);

  const selectedCount = resolveSelectedCount(candidate, requestedQuestionCount);
  assertSourceCapacity(candidate, selectedCount);
  const activeBindings = candidate.source_bindings.slice(0, selectedCount);
  assertUniqueBindings(activeBindings);

  // Read the full ordered binding set against one coherent inventory snapshot.
  const snapshot = await repository.readQuestionBankQuestionsSnapshot({
    channelId,
    scope: cooldownScopeFor(candidate),
    limit: 100000,
    offset: 0,
  });
  const bankQuestionMap = new Map<string, BankQuestionWithCooldown>(snapshot.questions.map((q) => [q.id, q]));

  const questions: BankQuestion[] = [];
  const questionIds: string[] = [];
  const sourceContentHashes: string[] = [];
  for (const binding of activeBindings) {
    const bankQuestion = verifyBoundQuestion(binding, bankQuestionMap.get(binding.source_question_id));
    checkBoundSourceEligibility(candidate, bankQuestion, Boolean(force));
    questions.push(bankQuestion);
    questionIds.push(binding.source_question_id);
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
