import {
  hashBankQuestionSource,
  type BankQuestion,
  type BankQuestionWithCooldown,
  type BankTaxonomy,
  type TopicInventoryScanStatus,
  type TopicSourceBinding,
  type TopicSourceShortage,
} from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import {
  evaluateEpisodeQuestionEligibility,
  evaluateShortReelQuestionEligibility,
  type EvaluatedBankQuestionCandidate,
} from "../quiz/bank/bankEligibility.js";
import {
  ARCHETYPE_SLOT_DEFINITIONS,
  CANONICAL_FALLBACK_DOMAINS,
  type TopicMatrixQuizFormat,
  type TopicMatrixSlotArchetype,
  type TopicMatrixSuggestedLayout,
} from "./topicMatrixPlanner.js";

export interface AllocatedSlot {
  slot: number;
  slotId: string;
  name: string;
  contentKind: "episode" | "short_reel";
  archetype: TopicMatrixSlotArchetype;
  suggestedLayout: TopicMatrixSuggestedLayout;
  quizFormat: TopicMatrixQuizFormat;
  domainId: string;
  domainTitle: string;
  subtopicId?: string;
  allocatedQuestions: EvaluatedBankQuestionCandidate[];
  sourceBindings: TopicSourceBinding[];
  isKeySteered: boolean;
  questionCount: number;
}

export interface TopicAllocationResult {
  scanStatus: TopicInventoryScanStatus;
  allocatedSlots: AllocatedSlot[];
  shortages: TopicSourceShortage[];
  totalAllocatedQuestions: number;
}

export interface AllocateTopicSlotsInput {
  questions: BankQuestion[] | BankQuestionWithCooldown[];
  scanStatus: TopicInventoryScanStatus;
  channelId: string;
  topicHint?: string;
  taxonomy?: BankTaxonomy | null;
  episodeQuestionCount?: number;
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function scoreQuestionKeywordMatch(q: BankQuestion, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  const qDomain = normalize(q.domain_id || "");
  const qSubtopic = normalize(q.subtopic_id || "");
  const qText = normalize(q.question || "");
  const qTags = (q.tags || []).map(normalize);

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (qDomain.includes(token)) score += 10;
    if (qSubtopic.includes(token)) score += 8;
    if (qTags.some((t) => t.includes(token))) score += 7;
    if (qText.includes(token)) score += 4;
  }
  return score;
}

function scoreDomainKeywordMatch(domainId: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let score = 0;
  const norm = normalize(domainId);
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (norm.includes(token)) score += 10;
  }
  return score;
}

function selectSteeredCandidates(
  slotCandidates: EvaluatedBankQuestionCandidate[],
  hintTokens: string[],
  requiredCount: number,
): EvaluatedBankQuestionCandidate[] | null {
  const scoredCandidates = slotCandidates
    .map((c) => ({
      candidate: c,
      score: scoreQuestionKeywordMatch(c.question, hintTokens) + scoreDomainKeywordMatch(c.question.domain_id || "", hintTokens),
    }))
    .filter((item) => item.score > 0);

  scoredCandidates.sort((a, b) => b.score - a.score);

  if (scoredCandidates.length < requiredCount) {
    return null;
  }
  return scoredCandidates.slice(0, requiredCount).map((sc) => sc.candidate);
}

function selectDiscoveryCandidates(
  slotCandidates: EvaluatedBankQuestionCandidate[],
  requiredCount: number,
): EvaluatedBankQuestionCandidate[] {
  const bySubtopic = new Map<string, EvaluatedBankQuestionCandidate[]>();
  for (const c of slotCandidates) {
    const sub = c.question.subtopic_id || "default";
    if (!bySubtopic.has(sub)) bySubtopic.set(sub, []);
    bySubtopic.get(sub)!.push(c);
  }
  const viableGroup = Array.from(bySubtopic.values()).find((group) => group.length >= requiredCount);
  return viableGroup ? viableGroup.slice(0, requiredCount) : slotCandidates.slice(0, requiredCount);
}

function createAllocatedSlotRecord(
  def: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number],
  chosenCandidates: EvaluatedBankQuestionCandidate[],
  domainTitleMap: Map<string, string>,
  isKeySteered: boolean,
): AllocatedSlot {
  const firstQ = chosenCandidates[0].question;
  const domainId = firstQ.domain_id || (isKeySteered ? "space_earth" : "general");
  const domainTitle = domainTitleMap.get(domainId) || domainId;

  const sourceBindings: TopicSourceBinding[] = chosenCandidates.map((c) => ({
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
    domainTitle,
    subtopicId: firstQ.subtopic_id,
    allocatedQuestions: chosenCandidates,
    sourceBindings,
    isKeySteered,
    questionCount: chosenCandidates.length,
  };
}

export function allocateSourceBackedTopicSlots(input: AllocateTopicSlotsInput): TopicAllocationResult {
  const { questions, scanStatus, channelId: _channelId, topicHint, taxonomy: _taxonomy, episodeQuestionCount = 8 } = input;

  // 1. Incomplete / unavailable scan validation
  if (scanStatus === "incomplete") {
    throw new RepositoryError("INCOMPLETE_SCAN: question bank scan was incomplete", "INCOMPLETE_SCAN");
  }
  if (scanStatus === "unavailable") {
    throw new RepositoryError("UNAVAILABLE_SCAN: question bank scan was unavailable", "UNAVAILABLE_SCAN");
  }

  // 2. Complete empty fast path
  if (scanStatus === "complete_empty" || questions.length === 0) {
    const shortages: TopicSourceShortage[] = ARCHETYPE_SLOT_DEFINITIONS.map((def) => ({
      content_kind: def.contentKind,
      slot_id: `slot_${def.slot}`,
      requested_count: def.contentKind === "episode" ? episodeQuestionCount : 1,
      available_count: 0,
      reason_code: "NO_ELIGIBLE_SOURCES",
      exclusion_counts: {},
    }));
    return {
      scanStatus: "complete_empty",
      allocatedSlots: [],
      shortages,
      totalAllocatedQuestions: 0,
    };
  }

  // 3. Parse keyword tokens for steering
  const trimmedHint = topicHint?.trim();
  const hintTokens = trimmedHint ? normalize(trimmedHint).split(/\s+/).filter(Boolean) : [];
  const hasKeyword = hintTokens.length > 0;

  // Track globally disjoint allocated question IDs
  const usedQuestionIds = new Set<string>();
  const allocatedSlots: AllocatedSlot[] = [];
  const shortages: TopicSourceShortage[] = [];

  // Helper to find domain title
  const domainTitleMap = new Map<string, string>();
  for (const d of CANONICAL_FALLBACK_DOMAINS) {
    domainTitleMap.set(d.id, d.title);
  }

  for (const def of ARCHETYPE_SLOT_DEFINITIONS) {
    const isEpisode = def.contentKind === "episode";
    const requiredCount = isEpisode ? episodeQuestionCount : 1;
    const isKeySteered = hasKeyword && (def.slot === 1 || def.slot === 4);

    // Evaluate eligible candidates for this slot
    const slotCandidates: EvaluatedBankQuestionCandidate[] = [];
    for (const rawQuestion of questions) {
      if (usedQuestionIds.has(rawQuestion.id)) continue;
      if (rawQuestion.archetype_id !== def.archetype) continue;

      const evalResult = isEpisode
        ? evaluateEpisodeQuestionEligibility(rawQuestion, {
            targetLanguage: "en",
            expectedFormat: def.quizFormat,
          })
        : evaluateShortReelQuestionEligibility(rawQuestion, {
            targetArchetype: def.archetype,
          });

      if (evalResult.eligible) {
        slotCandidates.push(evalResult.candidate);
      }
    }

    if (isKeySteered) {
      const chosenCandidates = selectSteeredCandidates(slotCandidates, hintTokens, requiredCount);
      if (!chosenCandidates) {
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

      for (const c of chosenCandidates) usedQuestionIds.add(c.question.id);
      allocatedSlots.push(createAllocatedSlotRecord(def, chosenCandidates, domainTitleMap, true));
      continue;
    }

    // Non-steered discovery slot:
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

    const chosenCandidates = selectDiscoveryCandidates(slotCandidates, requiredCount);
    for (const c of chosenCandidates) usedQuestionIds.add(c.question.id);
    allocatedSlots.push(createAllocatedSlotRecord(def, chosenCandidates, domainTitleMap, false));
  }

  // Sort allocatedSlots by slot number for stability
  allocatedSlots.sort((a, b) => a.slot - b.slot);

  return {
    scanStatus: "complete_nonempty",
    allocatedSlots,
    shortages,
    totalAllocatedQuestions: usedQuestionIds.size,
  };
}
