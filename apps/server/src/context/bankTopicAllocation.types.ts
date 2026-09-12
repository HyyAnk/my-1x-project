import type {
  BankQuestion,
  BankQuestionWithCooldown,
  BankTaxonomy,
  TopicInventoryScanStatus,
  TopicSourceBinding,
  TopicSourceShortage,
} from "@studio/shared";
import type { EvaluatedBankQuestionCandidate } from "../quiz/bank/bankEligibility.js";
import type {
  TopicMatrixQuizFormat,
  TopicMatrixSlotArchetype,
  TopicMatrixSuggestedLayout,
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
