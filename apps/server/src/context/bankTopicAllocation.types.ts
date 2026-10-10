import type {
  BankQuestion,
  BankQuestionWithCooldown,
  BankTaxonomy,
  TopicContentKind,
  TopicInventoryScanStatus,
  TopicSourceBinding,
  TopicSourceShortage,
} from "@studio/shared";
import type { EvaluatedBankQuestionCandidate } from "../quiz/bank/bankEligibility.js";
import type { TopicMatrixQuizFormat, TopicMatrixSlotArchetype, TopicMatrixSuggestedLayout } from "./topicMatrixPlanner.js";
import type { TopicSlotArchetypeDefinition } from "./topicMatrix.constants.js";

export interface AllocatedSlot {
  slot: number;
  slotId: string;
  name: string;
  contentKind: TopicContentKind;
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

/** Source questions required per slot, keyed by content kind. */
export interface TopicSlotRequiredCounts {
  episode: number;
  quiz_short: number;
  short_reel: number;
}

export interface AllocateTopicSlotsInput {
  questions: BankQuestion[] | BankQuestionWithCooldown[];
  scanStatus: TopicInventoryScanStatus;
  channelId: string;
  topicHint?: string;
  taxonomy?: BankTaxonomy | null;
  episodeQuestionCount?: number;
  /** Questions bound to each Quiz Short slot; defaults to QUIZ_SHORT_DEFAULT_QUESTION_COUNT. */
  quizShortQuestionCount?: number;
  slotDefinitions?: ReadonlyArray<TopicSlotArchetypeDefinition & { slot: number }>;
}
