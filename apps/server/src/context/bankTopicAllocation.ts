import {
  hashBankQuestionSource,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type TopicSourceBinding,
  type TopicSourceShortage,
} from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type EvaluatedBankQuestionCandidate,
} from "../quiz/bank/bankEligibility.js";
import { ARCHETYPE_SLOT_DEFINITIONS, CANONICAL_FALLBACK_DOMAINS } from "./topicMatrixPlanner.js";
import { extractHintTokens, selectDiscoveryCandidates, selectSteeredCandidates } from "./bankTopicKeywordExtractor.js";
import type { AllocatedSlot, AllocateTopicSlotsInput, TopicAllocationResult } from "./bankTopicAllocation.types.js";

export { STOPWORDS } from "./stopwords.js";
export {
  normalize,
  scoreQuestionKeywordMatch,
  scoreDomainKeywordMatch,
  extractHintTokens,
  selectDiscoveryCandidates,
  selectSteeredCandidates,
} from "./bankTopicKeywordExtractor.js";
export type { AllocatedSlot, AllocateTopicSlotsInput, TopicAllocationResult } from "./bankTopicAllocation.types.js";

function buildEmptyShortages(episodeQuestionCount: number): TopicSourceShortage[] {
  return ARCHETYPE_SLOT_DEFINITIONS.map((def) => ({
    content_kind: def.contentKind,
    slot_id: `slot_${def.slot}`,
    requested_count: def.contentKind === "episode" ? episodeQuestionCount : 1,
    available_count: 0,
    reason_code: "NO_ELIGIBLE_SOURCES",
    exclusion_counts: {},
  }));
}

function evaluateSlotEligibility(
  rawQuestion: BankQuestion | BankQuestionWithCooldown,
  def: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number],
) {
  if (def.contentKind === "episode") {
    return evaluateEpisodeQuestionEligibility(rawQuestion, {
      targetLanguage: "en",
      expectedFormat: def.quizFormat,
    });
  }
  return evaluateShortReelQuestionEligibility(rawQuestion, {
    targetArchetype: def.archetype,
  });
}

function collectSlotCandidates(
  questions: BankQuestion[] | BankQuestionWithCooldown[],
  def: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number],
  usedQuestionIds: ReadonlySet<string>,
): EvaluatedBankQuestionCandidate[] {
  const slotCandidates: EvaluatedBankQuestionCandidate[] = [];
  const candidateIds = new Set<string>();
  for (const rawQuestion of questions) {
    if (usedQuestionIds.has(rawQuestion.id) || candidateIds.has(rawQuestion.id)) continue;
    if (rawQuestion.archetype_id !== def.archetype) continue;

    const evalResult = evaluateSlotEligibility(rawQuestion, def);
    if (evalResult.eligible) {
      candidateIds.add(rawQuestion.id);
      slotCandidates.push(evalResult.candidate);
    }
  }
  return slotCandidates;
}

function createAllocatedSlotRecord(
  def: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number],
  chosen: EvaluatedBankQuestionCandidate[],
  domainTitleMap: Map<string, string>,
  isKeySteered: boolean,
): AllocatedSlot {
  const firstQ = chosen[0].question;
  const domainId = firstQ.domain_id || (isKeySteered ? "space_earth" : "general");
  const sourceBindings: TopicSourceBinding[] = chosen.map((c) => ({
    source_question_id: c.question.id,
    source_hash_version: 1,
    source_content_hash: hashBankQuestionSource(c.question),
    projection_provenance: {
      source_variant: "native",
      resolved_language: "en",
      translation_key: null,
      translation_provenance: "native",
    },
  }));

  return {
    slot: def.slot,
    slotId: `slot_${def.slot}`,
    name: def.name,
    contentKind: def.contentKind,
    archetype: def.archetype,
    suggestedLayout: def.suggestedLayout,
    quizFormat: def.quizFormat,
    domainId,
    domainTitle: domainTitleMap.get(domainId) || domainId,
    subtopicId: firstQ.subtopic_id,
    allocatedQuestions: chosen,
    sourceBindings,
    isKeySteered,
    questionCount: chosen.length,
  };
}

export function allocateSourceBackedTopicSlots(input: AllocateTopicSlotsInput): TopicAllocationResult {
  const { questions, scanStatus, topicHint, episodeQuestionCount = 8 } = input;

  if (scanStatus === "incomplete") {
    throw new RepositoryError("INCOMPLETE_SCAN: question bank scan was incomplete", "INCOMPLETE_SCAN");
  }
  if (scanStatus === "unavailable") {
    throw new RepositoryError("UNAVAILABLE_SCAN: question bank scan was unavailable", "UNAVAILABLE_SCAN");
  }
  if (scanStatus === "complete_empty" || questions.length === 0) {
    return {
      scanStatus: "complete_empty",
      allocatedSlots: [],
      shortages: buildEmptyShortages(episodeQuestionCount),
      totalAllocatedQuestions: 0,
    };
  }

  const { hintTokens, hasKeyword } = extractHintTokens(topicHint);
  const usedQuestionIds = new Set<string>();
  const allocatedSlots: AllocatedSlot[] = [];
  const shortages: TopicSourceShortage[] = [];
  const domainTitleMap = new Map<string, string>(CANONICAL_FALLBACK_DOMAINS.map((d) => [d.id, d.title]));

  for (const def of ARCHETYPE_SLOT_DEFINITIONS) {
    const isEpisode = def.contentKind === "episode";
    const requiredCount = isEpisode ? episodeQuestionCount : 1;
    const isKeySteered = hasKeyword && (def.slot === 1 || def.slot === 4);
    const slotCandidates = collectSlotCandidates(questions, def, usedQuestionIds);

    if (isKeySteered) {
      const chosen = selectSteeredCandidates(slotCandidates, hintTokens, requiredCount);
      if (!chosen) {
        shortages.push({
          content_kind: def.contentKind,
          slot_id: `slot_${def.slot}`,
          requested_count: requiredCount,
          available_count: slotCandidates.length,
          reason_code: "NO_KEYWORD_MATCH",
          exclusion_counts: {},
        });
        continue;
      }
      for (const c of chosen) usedQuestionIds.add(c.question.id);
      allocatedSlots.push(createAllocatedSlotRecord(def, chosen, domainTitleMap, true));
      continue;
    }

    if (slotCandidates.length < requiredCount) {
      shortages.push({
        content_kind: def.contentKind,
        slot_id: `slot_${def.slot}`,
        requested_count: requiredCount,
        available_count: slotCandidates.length,
        reason_code: slotCandidates.length === 0 ? "NO_ELIGIBLE_SOURCES" : "INSUFFICIENT_GROUP_SOURCES",
        exclusion_counts: {},
      });
      continue;
    }

    const chosen = selectDiscoveryCandidates(slotCandidates, requiredCount);
    if (chosen.length !== requiredCount) {
      shortages.push({
        content_kind: def.contentKind,
        slot_id: `slot_${def.slot}`,
        requested_count: requiredCount,
        available_count: slotCandidates.length,
        reason_code: "INSUFFICIENT_GROUP_SOURCES",
        exclusion_counts: {},
      });
      continue;
    }
    for (const c of chosen) usedQuestionIds.add(c.question.id);
    allocatedSlots.push(createAllocatedSlotRecord(def, chosen, domainTitleMap, false));
  }

  allocatedSlots.sort((a, b) => a.slot - b.slot);
  return {
    scanStatus: "complete_nonempty",
    allocatedSlots,
    shortages,
    totalAllocatedQuestions: usedQuestionIds.size,
  };
}
