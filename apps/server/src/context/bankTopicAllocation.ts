import {
  hashBankQuestionSource,
  QUIZ_SHORT_DEFAULT_QUESTION_COUNT,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type QuizShortTopicArchetype,
  type ReelArchetype,
  type TopicContentKind,
  type TopicShortageReasonCode,
  type TopicSourceBinding,
  type TopicSourceShortage,
} from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateQuizShortQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type EvaluatedBankQuestionCandidate,
} from "../quiz/bank/bankEligibility.js";
import { ARCHETYPE_SLOT_DEFINITIONS, CANONICAL_FALLBACK_DOMAINS, type TopicSlotDefinition } from "./topicMatrixPlanner.js";
import { extractHintTokens, selectDiscoveryCandidates, selectSteeredCandidates } from "./bankTopicKeywordExtractor.js";
import type {
  AllocatedSlot,
  AllocateTopicSlotsInput,
  TopicAllocationResult,
  TopicSlotRequiredCounts,
} from "./bankTopicAllocation.types.js";

export { STOPWORDS } from "./stopwords.js";
export {
  normalize,
  scoreQuestionKeywordMatch,
  scoreDomainKeywordMatch,
  extractHintTokens,
  selectDiscoveryCandidates,
  selectSteeredCandidates,
} from "./bankTopicKeywordExtractor.js";
export type {
  AllocatedSlot,
  AllocateTopicSlotsInput,
  TopicAllocationResult,
  TopicSlotRequiredCounts,
} from "./bankTopicAllocation.types.js";

const DEFAULT_EPISODE_QUESTION_COUNT = 8;

function buildShortage(
  def: TopicSlotDefinition,
  requestedCount: number,
  availableCount: number,
  reasonCode: TopicShortageReasonCode,
): TopicSourceShortage {
  return {
    content_kind: def.contentKind,
    slot_id: `slot_${def.slot}`,
    requested_count: requestedCount,
    available_count: availableCount,
    reason_code: reasonCode,
    exclusion_counts: {},
  };
}

function buildEmptyShortages(
  requiredCounts: TopicSlotRequiredCounts,
  slotDefinitions: ReadonlyArray<TopicSlotDefinition> = ARCHETYPE_SLOT_DEFINITIONS,
): TopicSourceShortage[] {
  return slotDefinitions.map((def) => buildShortage(def, requiredCounts[def.contentKind], 0, "NO_ELIGIBLE_SOURCES"));
}

function evaluateSlotEligibility(rawQuestion: BankQuestion | BankQuestionWithCooldown, def: TopicSlotDefinition) {
  if (def.contentKind === "episode") {
    return evaluateEpisodeQuestionEligibility(rawQuestion, { targetLanguage: "en", expectedFormat: def.quizFormat });
  }
  if (def.contentKind === "quiz_short") {
    return evaluateQuizShortQuestionEligibility(rawQuestion, { targetArchetype: def.archetype as QuizShortTopicArchetype });
  }
  return evaluateShortReelQuestionEligibility(rawQuestion, { targetArchetype: def.archetype as ReelArchetype });
}

function collectSlotCandidates(
  questions: BankQuestion[] | BankQuestionWithCooldown[],
  def: TopicSlotDefinition,
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
  def: TopicSlotDefinition,
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

/** The first slot of every content kind is keyword-steered when a hint is present. */
function resolveSteeredSlots(slotDefinitions: ReadonlyArray<TopicSlotDefinition>): Set<number> {
  const firstSlotByKind = new Map<TopicContentKind, number>();
  for (const def of slotDefinitions) {
    if (!firstSlotByKind.has(def.contentKind)) firstSlotByKind.set(def.contentKind, def.slot);
  }
  return new Set(firstSlotByKind.values());
}

function allocateSlot(
  def: TopicSlotDefinition,
  slotCandidates: EvaluatedBankQuestionCandidate[],
  requiredCount: number,
  hintTokens: string[],
  isKeySteered: boolean,
): EvaluatedBankQuestionCandidate[] | TopicSourceShortage {
  if (isKeySteered) {
    const chosen = selectSteeredCandidates(slotCandidates, hintTokens, requiredCount);
    return chosen ?? buildShortage(def, requiredCount, slotCandidates.length, "NO_KEYWORD_MATCH");
  }
  if (slotCandidates.length < requiredCount) {
    const reason = slotCandidates.length === 0 ? "NO_ELIGIBLE_SOURCES" : "INSUFFICIENT_GROUP_SOURCES";
    return buildShortage(def, requiredCount, slotCandidates.length, reason);
  }
  const chosen = selectDiscoveryCandidates(slotCandidates, requiredCount);
  if (chosen.length !== requiredCount) return buildShortage(def, requiredCount, slotCandidates.length, "INSUFFICIENT_GROUP_SOURCES");
  return chosen;
}

function assertScanUsable(scanStatus: AllocateTopicSlotsInput["scanStatus"]): void {
  if (scanStatus === "incomplete") {
    throw new RepositoryError("INCOMPLETE_SCAN: question bank scan was incomplete", "INCOMPLETE_SCAN");
  }
  if (scanStatus === "unavailable") {
    throw new RepositoryError("UNAVAILABLE_SCAN: question bank scan was unavailable", "UNAVAILABLE_SCAN");
  }
}

export function allocateSourceBackedTopicSlots(input: AllocateTopicSlotsInput): TopicAllocationResult {
  const { questions, scanStatus, topicHint, slotDefinitions: customSlots } = input;
  const slotDefinitions = customSlots || ARCHETYPE_SLOT_DEFINITIONS;
  const requiredCounts: TopicSlotRequiredCounts = {
    episode: input.episodeQuestionCount ?? DEFAULT_EPISODE_QUESTION_COUNT,
    quiz_short: input.quizShortQuestionCount ?? QUIZ_SHORT_DEFAULT_QUESTION_COUNT,
    short_reel: 1,
  };

  assertScanUsable(scanStatus);
  if (scanStatus === "complete_empty" || questions.length === 0) {
    return {
      scanStatus: "complete_empty",
      allocatedSlots: [],
      shortages: buildEmptyShortages(requiredCounts, slotDefinitions),
      totalAllocatedQuestions: 0,
    };
  }

  const { hintTokens, hasKeyword } = extractHintTokens(topicHint);
  const usedQuestionIds = new Set<string>();
  const allocatedSlots: AllocatedSlot[] = [];
  const shortages: TopicSourceShortage[] = [];
  const domainTitleMap = new Map<string, string>(CANONICAL_FALLBACK_DOMAINS.map((d) => [d.id, d.title]));
  const steeredSlots = hasKeyword ? resolveSteeredSlots(slotDefinitions) : new Set<number>();

  for (const def of slotDefinitions) {
    const isKeySteered = steeredSlots.has(def.slot);
    const slotCandidates = collectSlotCandidates(questions, def, usedQuestionIds);
    const outcome = allocateSlot(def, slotCandidates, requiredCounts[def.contentKind], hintTokens, isKeySteered);
    if (!Array.isArray(outcome)) {
      shortages.push(outcome);
      continue;
    }
    for (const c of outcome) usedQuestionIds.add(c.question.id);
    allocatedSlots.push(createAllocatedSlotRecord(def, outcome, domainTitleMap, isKeySteered));
  }

  allocatedSlots.sort((a, b) => a.slot - b.slot);
  return {
    scanStatus: "complete_nonempty",
    allocatedSlots,
    shortages,
    totalAllocatedQuestions: usedQuestionIds.size,
  };
}
