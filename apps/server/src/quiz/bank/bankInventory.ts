import {
  sourceCanonicalJsonStringify,
  hashBankQuestionSource,
  sourceSha256Hex,
  type BankQuestionWithCooldown,
  type TopicSourceExclusionReasonCode,
  type TopicInventoryScanStatus,
} from "@studio/shared";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type EvaluatedBankQuestionCandidate,
} from "./bankEligibility.js";

export interface BankInventoryReader {
  queryQuestionBankQuestions(params: {
    channelId: string;
    limit: number;
    offset: number;
  }): Promise<{ questions: BankQuestionWithCooldown[]; total: number }>;
  readQuestionBankQuestionsSnapshot?(params: {
    channelId: string;
    limit: number;
    offset: number;
  }): Promise<{ questions: BankQuestionWithCooldown[]; total: number; revision: number }>;
}

export interface BankInventoryScanOptions {
  channelId: string;
  targetLanguage: string;
  episodeExpectedFormat?: "knowledge" | "image_guess" | "multiple_choice" | "true_false" | "odd_one_out";
  pageSize?: number;
  maxPages?: number;
}

export interface BankInventoryScan {
  scan_status: TopicInventoryScanStatus;
  checked_at: string;
  snapshot_token: string;
  scanned_count: number;
  total_reported: number;
  eligible_by_policy: { episode: number; short_reel: number };
  exclusion_counts: Partial<Record<TopicSourceExclusionReasonCode, number>>;
  eligible_sources: Array<{ policy: "episode" | "short_reel"; candidate: EvaluatedBankQuestionCandidate; source_content_hash: string }>;
  error_code?: "BANK_READ_FAILED" | "BANK_SCAN_TRUNCATED" | "BANK_SCAN_INCONSISTENT";
}

function increment(target: Partial<Record<TopicSourceExclusionReasonCode, number>>, reason: TopicSourceExclusionReasonCode): void {
  target[reason] = (target[reason] ?? 0) + 1;
}

function hashEligibleSource(candidate: EvaluatedBankQuestionCandidate): string {
  return hashBankQuestionSource(candidate.question);
}

function classifyStatus(scanned: number, total: number): TopicInventoryScanStatus {
  return scanned === 0 && total === 0 ? "complete_empty" : "complete_nonempty";
}

function createResult(
  status: TopicInventoryScanStatus,
  checkedAt: string,
  scanned: BankQuestionWithCooldown[],
  total: number,
  exclusions: Partial<Record<TopicSourceExclusionReasonCode, number>>,
  targetLanguage: string,
  expectedFormat: BankInventoryScanOptions["episodeExpectedFormat"],
  errorCode?: BankInventoryScan["error_code"],
): BankInventoryScan {
  const eligibleByPolicy = { episode: 0, short_reel: 0 };
  const eligibleSources: BankInventoryScan["eligible_sources"] = [];
  for (const question of scanned) {
    const episode = evaluateEpisodeQuestionEligibility(question, { targetLanguage, expectedFormat });
    if (episode.eligible) {
      eligibleByPolicy.episode += 1;
      eligibleSources.push({
        policy: "episode",
        candidate: episode.candidate,
        source_content_hash: hashEligibleSource(episode.candidate),
      });
    }
    if (question.archetype_id === "deep_trivia" || question.archetype_id === "versus_faceoff") {
      const shortReel = evaluateShortReelQuestionEligibility(question, { targetArchetype: question.archetype_id });
      if (shortReel.eligible) {
        eligibleByPolicy.short_reel += 1;
        eligibleSources.push({
          policy: "short_reel",
          candidate: shortReel.candidate,
          source_content_hash: hashEligibleSource(shortReel.candidate),
        });
      }
    }
  }
  const digest = sourceSha256Hex(
    sourceCanonicalJsonStringify({
      sources: scanned
        .map((question) => ({ id: question.id, hash: hashBankQuestionSource(question) }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      total,
      status,
      exclusions,
      policies: ["episode", "short_reel"],
      episode_expected_format: expectedFormat ?? null,
    }),
  );
  return {
    scan_status: status,
    checked_at: checkedAt,
    snapshot_token: digest,
    scanned_count: scanned.length,
    total_reported: total,
    eligible_by_policy: eligibleByPolicy,
    exclusion_counts: exclusions,
    eligible_sources: eligibleSources,
    ...(errorCode ? { error_code: errorCode } : {}),
  };
}

/** Reads a bounded, coherent Bank snapshot and distinguishes failures from empty inventory. */
export async function scanBankInventory(reader: BankInventoryReader, options: BankInventoryScanOptions): Promise<BankInventoryScan> {
  const pageSize = Math.max(1, options.pageSize ?? 100);
  const maxPages = Math.max(1, options.maxPages ?? 1000);
  const checkedAt = new Date().toISOString();
  const scanned: BankQuestionWithCooldown[] = [];
  const exclusions: Partial<Record<TopicSourceExclusionReasonCode, number>> = {};
  let offset = 0;
  let total = 0;
  const seenIds = new Set<string>();
  try {
    if (reader.readQuestionBankQuestionsSnapshot) {
      const snapshot = await reader.readQuestionBankQuestionsSnapshot({
        channelId: options.channelId,
        limit: pageSize * maxPages,
        offset: 0,
      });
      if (!Number.isInteger(snapshot.total) || snapshot.total < 0 || snapshot.questions.length > snapshot.total) {
        return createResult(
          "incomplete",
          checkedAt,
          snapshot.questions,
          snapshot.total,
          exclusions,
          options.targetLanguage,
          options.episodeExpectedFormat,
          "BANK_SCAN_INCONSISTENT",
        );
      }
      if (snapshot.questions.length < snapshot.total) {
        return createResult(
          "incomplete",
          checkedAt,
          snapshot.questions,
          snapshot.total,
          exclusions,
          options.targetLanguage,
          options.episodeExpectedFormat,
          "BANK_SCAN_TRUNCATED",
        );
      }
      for (const question of snapshot.questions) {
        if (seenIds.has(question.id)) {
          return createResult(
            "incomplete",
            checkedAt,
            snapshot.questions,
            snapshot.total,
            exclusions,
            options.targetLanguage,
            options.episodeExpectedFormat,
            "BANK_SCAN_INCONSISTENT",
          );
        }
        seenIds.add(question.id);
        const episode = evaluateEpisodeQuestionEligibility(question, {
          targetLanguage: options.targetLanguage,
          expectedFormat: options.episodeExpectedFormat,
        });
        if (!episode.eligible) increment(exclusions, episode.reason);
        if (question.archetype_id === "deep_trivia" || question.archetype_id === "versus_faceoff") {
          const shortReel = evaluateShortReelQuestionEligibility(question, { targetArchetype: question.archetype_id });
          if (!shortReel.eligible) increment(exclusions, shortReel.reason);
        }
      }
      return createResult(
        classifyStatus(snapshot.questions.length, snapshot.total),
        checkedAt,
        snapshot.questions,
        snapshot.total,
        exclusions,
        options.targetLanguage,
        options.episodeExpectedFormat,
      );
    }

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      const page = await reader.queryQuestionBankQuestions({ channelId: options.channelId, limit: pageSize, offset });
      if (
        !Number.isInteger(page.total) ||
        page.total < 0 ||
        page.questions.length > pageSize ||
        page.questions.length > Math.max(0, page.total - offset) ||
        (offset > 0 && page.total !== total)
      ) {
        return createResult(
          "incomplete",
          checkedAt,
          scanned,
          page.total,
          exclusions,
          options.targetLanguage,
          options.episodeExpectedFormat,
          "BANK_SCAN_INCONSISTENT",
        );
      }
      total = page.total;
      for (const question of page.questions) {
        if (seenIds.has(question.id))
          return createResult(
            "incomplete",
            checkedAt,
            scanned,
            total,
            exclusions,
            options.targetLanguage,
            options.episodeExpectedFormat,
            "BANK_SCAN_INCONSISTENT",
          );
        seenIds.add(question.id);
        scanned.push(question);
        const episode = evaluateEpisodeQuestionEligibility(question, {
          targetLanguage: options.targetLanguage,
          expectedFormat: options.episodeExpectedFormat,
        });
        if (!episode.eligible) increment(exclusions, episode.reason);
        if (question.archetype_id === "deep_trivia" || question.archetype_id === "versus_faceoff") {
          const shortReel = evaluateShortReelQuestionEligibility(question, { targetArchetype: question.archetype_id });
          if (!shortReel.eligible) increment(exclusions, shortReel.reason);
        }
      }
      offset += page.questions.length;
      if (offset >= total)
        return createResult(
          classifyStatus(scanned.length, total),
          checkedAt,
          scanned,
          total,
          exclusions,
          options.targetLanguage,
          options.episodeExpectedFormat,
        );
      if (page.questions.length === 0)
        return createResult(
          "incomplete",
          checkedAt,
          scanned,
          total,
          exclusions,
          options.targetLanguage,
          options.episodeExpectedFormat,
          "BANK_SCAN_INCONSISTENT",
        );
    }
    return createResult(
      "incomplete",
      checkedAt,
      scanned,
      total,
      exclusions,
      options.targetLanguage,
      options.episodeExpectedFormat,
      "BANK_SCAN_TRUNCATED",
    );
  } catch {
    return createResult(
      "unavailable",
      checkedAt,
      scanned,
      total,
      exclusions,
      options.targetLanguage,
      options.episodeExpectedFormat,
      "BANK_READ_FAILED",
    );
  }
}
