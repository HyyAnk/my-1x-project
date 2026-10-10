import {
  makeId,
  nowIso,
  QUIZ_SHORT_DEFAULT_QUESTION_COUNT,
  TopicCandidateSchema,
  TopicRunCandidateSchema,
  type QuizShortTopicArchetype,
  type QuizShortTopicCandidate,
  type TopicCandidate,
  type TopicProvenanceOrigin,
  type TopicRunCandidate,
} from "@studio/shared";
import type { TopicMatrixSlotPlan } from "../topicMatrixPlanner.js";
import type { AllocatedSlot } from "../bankTopicAllocation.js";
import { extractCandidateTextFields, type CandidateTextFields } from "./candidateFieldValidator.js";
import { resolveCombinedAgeBand } from "../../quiz/bank/audience/audienceBand.js";
import { deriveSlotSupportingCopy } from "./slotSupportingCopy.js";

export const QUIZ_SHORT_TOPIC_ID_PREFIX = "topic_qs";

type QuizShortCandidateInput = {
  topicId: string;
  channelId: string;
  textFields: CandidateTextFields;
  origin: TopicProvenanceOrigin;
  archetype: QuizShortTopicArchetype;
  questionCount: number;
  ageBand: QuizShortTopicCandidate["age_band"];
  themeHint?: string;
  domainId?: string;
  subtopicId?: string;
};

function buildQuizShortCandidate(input: QuizShortCandidateInput): QuizShortTopicCandidate {
  return {
    topic_id: input.topicId,
    channel_id: input.channelId,
    content_kind: "quiz_short",
    title: input.textFields.title,
    premise: input.textFields.premise,
    why_it_fits: input.textFields.whyItFits,
    hook: input.textFields.hook,
    estimated_potential: input.textFields.estimatedPotential,
    generated_at: nowIso(),
    selected: false,
    origin: input.origin,
    question_count: input.questionCount,
    aspect_ratio: "9:16",
    age_band: input.ageBand,
    archetype: input.archetype,
    ...(input.themeHint ? { theme_hint: input.themeHint } : {}),
    ...(input.domainId ? { domain_id: input.domainId } : {}),
    ...(input.subtopicId ? { subtopic_id: input.subtopicId } : {}),
  };
}

function readAgeBand(item: Record<string, unknown>): QuizShortTopicCandidate["age_band"] {
  return typeof item.age_band === "string" ? (item.age_band as QuizShortTopicCandidate["age_band"]) : "7-9";
}

/**
 * Builds a validated Quiz Short TopicCandidate for a fallback (non bank-backed) matrix slot.
 */
export function buildQuizShortSlotCandidate(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  textFields: CandidateTextFields,
  channelId: string,
  origin: TopicProvenanceOrigin,
  themeHint?: string,
): TopicCandidate {
  const topicId = typeof item.topic_id === "string" && item.topic_id.trim() ? item.topic_id.trim() : makeId(QUIZ_SHORT_TOPIC_ID_PREFIX);
  const domainId = typeof item.domain_id === "string" ? item.domain_id.trim() : slotPlan.domainId;
  const subtopicId = typeof item.subtopic_id === "string" ? item.subtopic_id.trim() : undefined;

  const candidate = buildQuizShortCandidate({
    topicId,
    channelId,
    textFields,
    origin,
    archetype: slotPlan.archetype as QuizShortTopicArchetype,
    questionCount: QUIZ_SHORT_DEFAULT_QUESTION_COUNT,
    ageBand: readAgeBand(item),
    themeHint,
    domainId,
    subtopicId,
  });
  return TopicCandidateSchema.parse(candidate);
}

/**
 * Builds a Quiz Short TopicRunCandidate for an allocated slot: the question count equals the bound sources.
 */
export function buildQuizShortRunCandidate(slot: AllocatedSlot, item: Record<string, unknown>, channelId: string): TopicRunCandidate {
  const textFields = extractCandidateTextFields(item, slot.slot, deriveSlotSupportingCopy(slot));
  const origin: TopicProvenanceOrigin = slot.isKeySteered ? "keyword" : "discovery";
  // The audience follows the allocated questions: the youngest band every one of them suits.
  const ageBand = resolveCombinedAgeBand(slot.allocatedQuestions.map((candidate) => candidate.question.age_band));

  const candidate = buildQuizShortCandidate({
    topicId: makeId(QUIZ_SHORT_TOPIC_ID_PREFIX),
    channelId,
    textFields,
    origin,
    archetype: slot.archetype as QuizShortTopicArchetype,
    questionCount: slot.questionCount,
    ageBand,
    themeHint: slot.isKeySteered ? slot.domainTitle : undefined,
    domainId: slot.domainId,
    subtopicId: slot.subtopicId,
  });

  return TopicRunCandidateSchema.parse({
    ...TopicCandidateSchema.parse(candidate),
    slot_id: slot.slotId,
    source_bindings: slot.sourceBindings,
  });
}
