import type { BankGameplayArchetypeId, BankIndex, BankQuestion, BankQuestionWithCooldown, BankTaxonomy, BankTranslationContent } from "@studio/shared";

export type CooldownFilterOption = "all" | "ready" | "cooldown";
export type TranslationFilterOption = "all" | "has_translation" | "needs_translation";

export interface QuestionBankFilters {
  channelId: string;
  archetypeId: string;
  domainId: string;
  subtopicId: string;
  status: string;
  cooldownFilter: CooldownFilterOption;
  languageFilter: string;
  translationFilter: TranslationFilterOption;
  search: string;
  page: number;
  pageSize: number;
}

export interface QuestionBankModalState {
  type: "create" | "edit" | "ai_generate" | null;
  question?: BankQuestionWithCooldown | null;
}

export interface QuestionBankBatchGenPayload {
  archetype_id: BankGameplayArchetypeId;
  domain_id: string;
  subtopic_id: string;
  subtopic_title?: string;
  count: number;
  difficulty?: number;
  age_band?: "kids" | "family" | "teen" | "mature";
  persist?: boolean;
}

export interface QuestionBankBatchGenResponse {
  success: boolean;
  archetypeId: string;
  domainId: string;
  subtopicId: string;
  requestedCount: number;
  generatedCount: number;
  approvedCount: number;
  rejectedCount: number;
  qaSummary: {
    copyrightRejections: number;
    duplicateRejections: number;
    schemaRejections: number;
    qualityRejections: number;
  };
  savedQuestions: BankQuestion[];
  rejectedQuestions: Array<{
    question: BankQuestion;
    issues: Array<{ type: string; message: string }>;
  }>;
}

export type { BankGameplayArchetypeId, BankIndex, BankQuestion, BankQuestionWithCooldown, BankTaxonomy, BankTranslationContent };
