import type {
  BankGameplayArchetypeId,
  BankIndex,
  BankQuestion,
  BankQuestionWithCooldown,
  BankTaxonomy,
  BankTranslationContent,
  MatrixCoverageStats,
} from "@studio/shared";

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
  type: "create" | "edit" | "ai_generate" | "clear_all" | null;
  question?: BankQuestionWithCooldown | null;
}

export interface QuestionBankBatchGenPayload {
  mode?: "auto" | "manual";
  archetype_id?: BankGameplayArchetypeId;
  domain_id?: string;
  subtopic_id?: string;
  subtopic_title?: string;
  count: number;
  target_count?: number;
  difficulty?: number;
  age_band?: "kids" | "family" | "teen" | "mature";
  persist?: boolean;
}

export interface QuestionBankBatchGenResponse {
  success: boolean;
  mode?: "auto" | "manual";
  archetypeId?: string;
  domainId?: string;
  subtopicId?: string;
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
  matrixCoverage?: MatrixCoverageStats;
  job?: QuestionBankJobState;
}

export interface QuestionBankJobProgress {
  totalRequested: number;
  completedCount: number;
  currentChunk: number;
  totalChunks: number;
  chunkSize: number;
  approvedInChunk: number;
  rejectedInChunk: number;
  approvedTotal: number;
  rejectedTotal: number;
}

export interface QuestionBankJobState {
  jobId: string;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  mode: "auto" | "manual";
  archetypeId?: BankGameplayArchetypeId;
  domainId?: string;
  subtopicId?: string;
  targetCount: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  progress: QuestionBankJobProgress;
  error?: string;
  result?: QuestionBankBatchGenResponse;
}

export type {
  BankGameplayArchetypeId,
  BankIndex,
  BankQuestion,
  BankQuestionWithCooldown,
  BankTaxonomy,
  BankTranslationContent,
  MatrixCoverageStats,
};

