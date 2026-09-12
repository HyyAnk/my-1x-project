import {
  QUIZ_MIN_QUESTION_COUNT,
  TopicAvailabilityBatchSchema,
  hashBankQuestionSource,
  nowIso,
  type BankQuestionWithCooldown,
  type TopicAvailability,
  type TopicAvailabilityBatch,
  type TopicCandidate,
  type TopicInventoryScanStatus,
  type TopicSourceBinding,
} from "@studio/shared";
import { scanBankInventory } from "./bankInventory.js";
import { evaluateEpisodeQuestionEligibility, evaluateShortReelQuestionEligibility } from "./bankEligibility.js";
import type { RepositoryRuntime } from "../../repository/runtime.js";
import type { RepositoryService } from "../../repository/service.js";

export type TopicAvailabilityBatchOptions = {
  overrides?: Record<string, { question_count?: number }>;
};

export function calculateRequiredSourceCount(
  candidate: TopicCandidate,
  options?: TopicAvailabilityBatchOptions,
): number {
  if (candidate.content_kind === "short_reel") {
    return 1;
  }
  const overrideCount = options?.overrides?.[candidate.topic_id]?.question_count;
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

    const evalResult =
      candidate.content_kind === "short_reel"
        ? evaluateShortReelQuestionEligibility(question, {
            targetArchetype: candidate.archetype,
          })
        : evaluateEpisodeQuestionEligibility(question, {
            targetLanguage: "en",
            expectedFormat: candidate.quiz_format,
            targetArchetype: candidate.archetype,
          });

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

function buildUnavailableScanAvailability(
  candidate: TopicCandidate,
  scanStatus: "unavailable" | "incomplete",
): TopicAvailability {
  const isUnavailable = scanStatus === "unavailable";
  return {
    topic_id: candidate.topic_id,
    content_kind: candidate.content_kind === "short_reel" ? "short_reel" : "episode",
    can_confirm: false,
    reason_code: isUnavailable ? "UNAVAILABLE_SCAN" : "INCOMPLETE_SCAN",
    retryable: true,
    recovery_action: isUnavailable
      ? "Bank inventory is currently unavailable. Try again later."
      : "Bank inventory scan was incomplete. Re-scan or retry.",
    source_capacity: 0,
  };
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

  const contentKind = candidate.content_kind === "short_reel" ? "short_reel" : "episode";
  const bindings = (candidate as { source_bindings?: TopicSourceBinding[] }).source_bindings;
  if (!bindings || bindings.length === 0) {
    return {
      topic_id: candidate.topic_id,
      content_kind: contentKind,
      can_confirm: false,
      reason_code: "UNBOUND_LEGACY_TOPIC",
      retryable: true,
      recovery_action: "Re-suggest topics to bind canonical sources.",
      source_capacity: 0,
    };
  }

  const { sourceCapacity, hasModified, hasCooldown } = evaluateCandidateSources(candidate, bindings, questionMap);
  if (hasModified) {
    return {
      topic_id: candidate.topic_id,
      content_kind: contentKind,
      can_confirm: false,
      reason_code: "SOURCE_CHANGED",
      retryable: true,
      recovery_action: "Re-suggest topics to synchronize canonical content.",
      source_capacity: 0,
    };
  }

  const requiredCount = calculateRequiredSourceCount(candidate, options);
  if (sourceCapacity >= requiredCount) {
    return {
      topic_id: candidate.topic_id,
      content_kind: contentKind,
      can_confirm: true,
      reason_code: "AVAILABLE",
      retryable: false,
      recovery_action: "Ready to confirm.",
      source_capacity: sourceCapacity,
    };
  }

  return {
    topic_id: candidate.topic_id,
    content_kind: contentKind,
    can_confirm: false,
    reason_code: "NO_ELIGIBLE_SOURCES",
    retryable: true,
    recovery_action: hasCooldown
      ? "Sources are currently in cooldown. Wait for cooldown expiry or re-suggest topics."
      : "Re-suggest topics to allocate fresh sources.",
    source_capacity: sourceCapacity,
  };
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
    repo: repositoryOrChannelId as RepositoryRuntime,
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
