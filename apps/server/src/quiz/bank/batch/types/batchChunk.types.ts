import type { BankGameplayArchetypeId, BankQuestion, MatrixCoverageStats } from "@studio/shared";
import type { RepositoryService } from "../../../../repository/service.js";
import type { LLMClient } from "../../../../utils/promptSanitizer.js";
import type { BatchAutoQaReport } from "../../questionBankAutoQa.js";
import type { PlannedBatchChunk } from "../../matrixCoverageService.js";
import type { AdaptiveRateLimiter } from "../adaptiveRateLimiter.js";

export interface FailedBatchChunk {
  chunkIndex: number;
  error: string;
  archetypeId?: BankGameplayArchetypeId;
  domainId?: string;
  subtopicId?: string;
}

export interface QuestionBankChunkProgress {
  totalRequested: number;
  completedCount: number;
  currentChunk: number;
  totalChunks: number;
  chunkSize: number;
  approvedInChunk: number;
  rejectedInChunk: number;
  failedChunksCount?: number;
}

export interface GenerateBatchInput {
  mode?: "auto" | "manual";
  archetypeId?: BankGameplayArchetypeId;
  domainId?: string;
  subtopicId?: string;
  subtopicTitle?: string;
  count?: number;
  concurrency?: number;
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  persist?: boolean;
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  rawCandidatesOverride?: BankQuestion[];
  onChunkProgress?: (progress: QuestionBankChunkProgress) => void;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
  rateLimiter?: AdaptiveRateLimiter;
  useDynamicChunks?: boolean;
}

export interface BatchGenerationResult {
  success: boolean;
  mode: "auto" | "manual";
  archetypeId?: BankGameplayArchetypeId;
  domainId?: string;
  subtopicId?: string;
  requestedCount: number;
  generatedCount: number;
  approvedCount: number;
  rejectedCount: number;
  qaSummary: BatchAutoQaReport["summary"];
  savedQuestions: BankQuestion[];
  rejectedQuestions: BatchAutoQaReport["rejectedQuestions"];
  matrixCoverage?: MatrixCoverageStats;
  failedChunks?: FailedBatchChunk[];
  failedChunksCount?: number;
  errorSummary?: string;
}

export interface ScheduleBatchChunksOptions {
  repository: RepositoryService;
  input: GenerateBatchInput;
  plannedChunks?: PlannedBatchChunk[];
  allBankQuestions: BankQuestion[];
  targetCount: number;
  rateLimiter?: AdaptiveRateLimiter;
  useDynamicChunks?: boolean;
}

export interface ScheduledBatchExecutionOutput {
  allGenerated: BankQuestion[];
  allSaved: BankQuestion[];
  allRejected: BatchAutoQaReport["rejectedQuestions"];
  totalApproved: number;
  totalRejected: number;
  combinedSummary: BatchAutoQaReport["summary"];
  failedChunks: FailedBatchChunk[];
}

export interface ChunkRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  signal?: AbortSignal;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}
