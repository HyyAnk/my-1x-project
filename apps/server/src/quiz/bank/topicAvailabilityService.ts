import {
  QUIZ_MIN_QUESTION_COUNT,
  TopicAvailabilityBatchSchema,
  hashBankQuestionSource,
  nowIso,
  type BankQuestionWithCooldown,
  type TopicAvailability,
  type TopicAvailabilityBatch,
  type TopicAvailabilityReasonCode,
  type TopicCandidate,
  type TopicInventoryScanStatus,
  type TopicSourceBinding,
} from "@studio/shared";
import { scanBankInventory } from "./bankInventory.js";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateQuizShortQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type BankQuestionEligibilityResult,
} from "./bankEligibility.js";
import type { RepositoryRuntime } from "../../repository/runtime.js";
import type { RepositoryService } from "../../repository/service.js";

export type TopicAvailabilityBatchOptions = {
  overrides?: Record<string, { question_count?: number }>;
};

/** Short Reels bind one source; Quiz Shorts and Episodes bind their (possibly overridden) question count. */
export function calculateRequiredSourceCount(candidate: TopicCandidate, options?: TopicAvailabilityBatchOptions): number {
  if (candidate.content_kind === "short_reel") {
    return 1;
  }
  const overrideCount = options?.overrides?.[candidate.topic_id]?.question_count;
  if (candidate.content_kind === "quiz_short") {
    return overrideCount ?? candidate.question_count;
  }
  return overrideCount ?? candidate.question_count ?? candidate.source_bindings?.length ?? QUIZ_MIN_QUESTION_COUNT;
}

export function calculateSourceDeficit(requiredCount: number, sourceCapacity: number): number {
  return Math.max(0, requiredCount - sourceCapacity);
}

interface SourceCapacityEvaluation {
  sourceCapacity: number;
  hasModified: boolean;
  hasCooldown: boolean;
}

function evaluateBoundSource(candidate: TopicCandidate, question: BankQuestionWithCooldown): BankQuestionEligibilityResult {
  if (candidate.content_kind === "short_reel") {
    return evaluateShortReelQuestionEligibility(question, { targetArchetype: candidate.archetype });
  }
  if (candidate.content_kind === "quiz_short") {
    return evaluateQuizShortQuestionEligibility(question, { targetArchetype: candidate.archetype });
  }
  return evaluateEpisodeQuestionEligibility(question, {
    targetLanguage: "en",
    expectedFormat: candidate.quiz_format,
    targetArchetype: candidate.archetype,
  });
}

function evaluateCandidateSources(
  candidate: TopicCandidate,
  bindings: TopicSourceBinding[],
  questionMap: Map<string, BankQuestionWithCooldown>,
): SourceCapacityEvaluation {
  let sourceCapacity = 0;
  let hasModified = false;
  let hasCooldown = false;

  for (const binding of bindings) {
    const question = questionMap.get(binding.source_question_id);
    if (!question || hashBankQuestionSource(question) !== binding.source_content_hash) {
      hasModified = true;
      break;
    }

    const evalResult = evaluateBoundSource(candidate, question);
    if (!evalResult.eligible) {
      if (question.channel_cooldown?.is_cooldown || evalResult.reason === "IN_COOLDOWN") {
        hasCooldown = true;
      }
      break;
    }
    sourceCapacity += 1;
  }

  return { sourceCapacity, hasModified, hasCooldown };
}

function buildAvailability(
  candidate: TopicCandidate,
  reasonCode: TopicAvailabilityReasonCode,
  recoveryAction: string,
  sourceCapacity = 0,
): TopicAvailability {
  return {
    topic_id: candidate.topic_id,
    content_kind: candidate.content_kind,
    can_confirm: reasonCode === "AVAILABLE",
    reason_code: reasonCode,
    retryable: reasonCode !== "AVAILABLE",
    recovery_action: recoveryAction,
    source_capacity: sourceCapacity,
  };
}

function buildUnavailableScanAvailability(candidate: TopicCandidate, scanStatus: "unavailable" | "incomplete"): TopicAvailability {
  if (scanStatus === "unavailable") {
    return buildAvailability(candidate, "UNAVAILABLE_SCAN", "Bank inventory is currently unavailable. Try again later.");
  }
  return buildAvailability(candidate, "INCOMPLETE_SCAN", "Bank inventory scan was incomplete. Re-scan or retry.");
}

function assessSingleCandidateAvailability(
  candidate: TopicCandidate,
  scanStatus: TopicInventoryScanStatus,
  questionMap: Map<string, BankQuestionWithCooldown>,
  options?: TopicAvailabilityBatchOptions,
): TopicAvailability {
  if (scanStatus === "unavailable" || scanStatus === "incomplete") {
    return buildUnavailableScanAvailability(candidate, scanStatus);
  }

  const bindings = (candidate as { source_bindings?: TopicSourceBinding[] }).source_bindings;
  if (!bindings || bindings.length === 0) {
    return buildAvailability(candidate, "UNBOUND_LEGACY_TOPIC", "Re-suggest topics to bind canonical sources.");
  }

  const { sourceCapacity, hasModified, hasCooldown } = evaluateCandidateSources(candidate, bindings, questionMap);
  if (hasModified) {
    return buildAvailability(candidate, "SOURCE_CHANGED", "Re-suggest topics to synchronize canonical content.");
  }

  const requiredCount = calculateRequiredSourceCount(candidate, options);
  if (sourceCapacity >= requiredCount) {
    return buildAvailability(candidate, "AVAILABLE", "Ready to confirm.", sourceCapacity);
  }

  return buildAvailability(
    candidate,
    "NO_ELIGIBLE_SOURCES",
    hasCooldown
      ? "Sources are currently in cooldown. Wait for cooldown expiry or re-suggest topics."
      : "Re-suggest topics to allocate fresh sources.",
    sourceCapacity,
  );
}

function resolveBatchTarget(
  runtime: RepositoryRuntime | void,
  repositoryOrChannelId: RepositoryService | RepositoryRuntime | string,
  channelIdOrOptions?: string | TopicAvailabilityBatchOptions,
  optionsParam?: TopicAvailabilityBatchOptions,
): { repo: RepositoryRuntime; channelId: string; options?: TopicAvailabilityBatchOptions } {
  if (typeof repositoryOrChannelId === "string") {
    return {
      repo: runtime as RepositoryRuntime,
      channelId: repositoryOrChannelId,
      options: channelIdOrOptions as TopicAvailabilityBatchOptions | undefined,
    };
  }
  return {
    repo: repositoryOrChannelId,
    channelId: channelIdOrOptions as string,
    options: optionsParam,
  };
}

export async function getTopicAvailabilityBatch(
  this: RepositoryRuntime | void,
  repositoryOrChannelId: RepositoryService | RepositoryRuntime | string,
  channelIdOrOptions?: string | TopicAvailabilityBatchOptions,
  optionsParam?: TopicAvailabilityBatchOptions,
): Promise<TopicAvailabilityBatch> {
  const { repo, channelId, options } = resolveBatchTarget(this, repositoryOrChannelId, channelIdOrOptions, optionsParam);
  await repo.getChannel(channelId);
  const candidates = await repo.listTopics(channelId);

  let scan;
  try {
    scan = await scanBankInventory(repo, { channelId, targetLanguage: "en" });
  } catch {
    scan = {
      scan_status: "unavailable" as const,
      checked_at: nowIso(),
      snapshot_token: "unavailable",
      error_code: "BANK_READ_FAILED" as const,
    };
  }

  const questionMap = new Map<string, BankQuestionWithCooldown>();
  if (scan.scanned_questions) {
    for (const question of scan.scanned_questions) {
      questionMap.set(question.id, question);
    }
  }

  const topicsAvailability = candidates.map((candidate) =>
    assessSingleCandidateAvailability(candidate, scan.scan_status, questionMap, options),
  );

  return TopicAvailabilityBatchSchema.parse({
    scan_status: scan.scan_status,
    checked_at: scan.checked_at || nowIso(),
    snapshot_token: scan.snapshot_token,
    topics: topicsAvailability,
    ...(scan.error_code ? { error_code: scan.error_code } : {}),
  });
}
