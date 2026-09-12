import type { BankGameplayArchetypeId, BankQuestion, MatrixCoverageStats } from "@studio/shared";
import type { RepositoryService } from "../../../repository/service.js";
import { executeSinglePromptText, type LLMClient } from "../../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../../utils/retryWithBackoff.js";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  parseBatchGenerationOutput,
  parseReverseBatchGenerationOutput,
  normalizeGenerationLanguage,
  type TargetEntityForGeneration,
} from "../batchGeneratorPrompt.js";
import { runBatchAutoQa, type BatchAutoQaReport } from "../questionBankAutoQa.js";
import { getEntityById } from "../knowledgeBaseLoader.js";
import type { PlannedBatchChunk } from "../matrixCoverageService.js";

export const MAX_BATCH_CHUNK_SIZE = 20;
export const DEFAULT_BATCH_CONCURRENCY = 5;

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
  plannedChunks: PlannedBatchChunk[];
  allBankQuestions: BankQuestion[];
  targetCount: number;
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

/**
 * Async Mutex to ensure thread-safe persistence and progress callbacks across concurrent workers.
 */
export class AsyncMutex {
  private mutex: Promise<void> = Promise.resolve();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.mutex;
    let release: () => void;
    this.mutex = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

/**
 * Single prompt execution with transient rate-limit retry (429 / resource exhausted).
 */
export async function executePromptWithRetry(llmClient: LLMClient, prompt: string, signal?: AbortSignal): Promise<string> {
  return retryWithBackoff(
    () =>
      executeSinglePromptText(llmClient, prompt, {
        signal,
        timeoutMs: 180_000,
      }),
    { attempts: 2, baseDelayMs: 2000, jitterMs: 1500 },
  );
}

export interface ChunkRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  signal?: AbortSignal;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Retries an asynchronous chunk operation with exponential backoff and jitter.
 * Aborts immediately without retrying if the abort signal is triggered.
 */
export async function retryChunkOperation<T>(
  operation: (attempt: number) => Promise<T>,
  options: ChunkRetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 500);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 4000);
  const jitterMs = Math.max(0, options.jitterMs ?? 200);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      const abortError = new Error("Batch generation cancelled by user");
      abortError.name = "AbortError";
      throw abortError;
    }
    try {
      return await operation(attempt);
    } catch (err) {
      lastError = err;
      if (options.signal?.aborted || attempt >= maxAttempts) {
        throw err;
      }
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)) + Math.random() * jitterMs;
      options.onRetry?.(err, attempt, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Maps planned chunk candidates to TargetEntityForGeneration objects with canonical knowledge traits.
 */
function resolveChunkTargets(chunk: PlannedBatchChunk): TargetEntityForGeneration[] {
  const targets: TargetEntityForGeneration[] = [];
  for (const item of chunk.candidates) {
    const entity = getEntityById(item.entity_id);
    if (entity) {
      targets.push({
        entity_id: entity.id,
        name: entity.name,
        domain_id: entity.domain_id,
        subtopic_id: entity.subtopic_id,
        visual_anchor: entity.visual_anchor,
        core_traits: entity.core_traits,
        distractor_pool: entity.distractor_pool,
        facts_and_myths: entity.facts_and_myths,
        versus_candidates: entity.versus_candidates,
      });
    } else {
      targets.push({
        entity_id: item.entity_id,
        name: item.entity_name,
        domain_id: item.domain_id,
        subtopic_id: item.subtopic_id,
        visual_anchor: `Cinematic vertical shot of ${item.entity_name}`,
        core_traits: [`Iconic subject in ${item.domain_id}`],
        facts_and_myths: [],
      });
    }
  }
  return targets;
}

/**
 * Executes a single planned batch chunk: builds prompt, calls LLM, and parses candidates.
 */
async function generateChunkCandidates(
  chunk: PlannedBatchChunk,
  input: GenerateBatchInput,
  allBankQuestions: BankQuestion[],
): Promise<BankQuestion[]> {
  const chunkCandidates: BankQuestion[] = [];

  if (chunk.candidates.length === 0) {
    // Fallback to open archetype batch generation for custom or legacy subtopics
    const archId = chunk.archetypeId;
    const domId = chunk.domainId;
    const subId = chunk.subtopicId || "general";
    const subTitle = input.subtopicTitle || subId.replaceAll("_", " ");

    const sampleExisting = allBankQuestions
      .filter((q) => q.archetype_id === archId && q.domain_id === domId)
      .slice(0, 5)
      .map((q) => q.question);

    const prompt = buildBatchGenerationPrompt({
      archetypeId: archId,
      domainId: domId,
      subtopicId: subId,
      subtopicTitle: subTitle,
      count: chunk.chunkSize,
      language: input.language,
      difficulty: input.difficulty,
      ageBand: input.ageBand,
      existingQuestionSamples: sampleExisting,
    });

    const rawOutput = await executePromptWithRetry(input.llmClient!, prompt, input.signal);
    const parsed = parseBatchGenerationOutput(rawOutput, {
      archetypeId: archId,
      domainId: domId,
      subtopicId: subId,
      language: input.language,
      difficulty: input.difficulty,
      ageBand: input.ageBand,
    });
    chunkCandidates.push(...parsed);
  } else {
    const targets = resolveChunkTargets(chunk);
    const sampleExisting = allBankQuestions
      .filter((q) => q.archetype_id === chunk.archetypeId && targets.some((t) => t.domain_id === q.domain_id))
      .slice(0, 5)
      .map((q) => q.question);

    const prompt = buildReverseGenerationPrompt({
      archetypeId: chunk.archetypeId,
      targets,
      language: input.language,
      difficulty: input.difficulty,
      ageBand: input.ageBand,
      existingQuestionSamples: sampleExisting,
    });

    const rawOutput = await executePromptWithRetry(input.llmClient!, prompt, input.signal);
    const parsed = parseReverseBatchGenerationOutput(rawOutput, targets, {
      archetypeId: chunk.archetypeId,
      language: input.language,
      difficulty: input.difficulty,
      ageBand: input.ageBand,
    });
    chunkCandidates.push(...parsed);
  }

  return chunkCandidates;
}

/**
 * Chunk execution scheduler managing worker concurrency throttling, LLM calls,
 * Auto-QA verification, mutexed persistence, chunk progress reporting, and cancellation.
 */
export async function executeBatchChunkScheduler(options: ScheduleBatchChunksOptions): Promise<ScheduledBatchExecutionOutput> {
  const { repository, input, plannedChunks, allBankQuestions, targetCount } = options;
  const generationLanguage = normalizeGenerationLanguage(input.language);
  const normalizedInput = generationLanguage === input.language ? input : { ...input, language: generationLanguage };
  const totalChunks = plannedChunks.length;
  const persist = normalizedInput.persist !== false;

  const allGenerated: BankQuestion[] = [];
  const allSaved: BankQuestion[] = [];
  const allRejected: BatchAutoQaReport["rejectedQuestions"] = [];
  const failedChunks: FailedBatchChunk[] = [];
  let totalApproved = 0;
  let totalRejected = 0;
  let completedChunksCount = 0;

  const combinedSummary: BatchAutoQaReport["summary"] = {
    duplicateRejections: 0,
    schemaRejections: 0,
    qualityRejections: 0,
  };

  const persistenceMutex = new AsyncMutex();

  async function recordFailedChunk(chunk: PlannedBatchChunk, chunkIndex: number, errorMsg: string): Promise<void> {
    await persistenceMutex.run(async () => {
      failedChunks.push({
        chunkIndex,
        error: errorMsg,
        archetypeId: chunk.archetypeId,
        domainId: chunk.domainId,
        subtopicId: chunk.subtopicId,
      });
      completedChunksCount++;
      normalizedInput.onChunkProgress?.({
        totalRequested: targetCount,
        completedCount: allSaved.length,
        currentChunk: completedChunksCount,
        totalChunks,
        chunkSize: chunk.chunkSize,
        approvedInChunk: 0,
        rejectedInChunk: 0,
        failedChunksCount: failedChunks.length,
      });
    });
  }

  async function processPlannedChunk(chunk: PlannedBatchChunk, chunkIndex: number): Promise<void> {
    if (normalizedInput.signal?.aborted) return;

    const retryAttempts = normalizedInput.retryAttempts ?? 3;
    const retryBaseDelayMs = normalizedInput.retryBaseDelayMs ?? 500;
    const retryOpts: ChunkRetryOptions = {
      attempts: retryAttempts,
      baseDelayMs: retryBaseDelayMs,
      signal: normalizedInput.signal,
    };

    let chunkCandidates: BankQuestion[] = [];
    try {
      chunkCandidates = await retryChunkOperation(
        () => generateChunkCandidates(chunk, normalizedInput, allBankQuestions),
        {
          ...retryOpts,
          onRetry: (err, attempt, delay) => {
            console.warn(
              `[QuestionBankBatch] Chunk ${chunkIndex + 1} candidate generation attempt ${attempt} failed, retrying in ${Math.round(delay)}ms: ${err instanceof Error ? err.message : String(err)}`,
            );
          },
        },
      );
    } catch (err) {
      if (normalizedInput.signal?.aborted) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[QuestionBankBatch] Chunk ${chunkIndex + 1} candidate generation failed after ${retryAttempts} attempts:`, errorMsg);
      await recordFailedChunk(chunk, chunkIndex, errorMsg);
      return;
    }

    if (normalizedInput.signal?.aborted) return;

    // Run Auto-QA on this chunk's generated candidates
    const qaReport = runBatchAutoQa(chunkCandidates, {
      existingQuestions: allBankQuestions,
    });

    try {
      // Safely persist to disk & update state sequentially via Mutex to avoid file write race conditions
      await retryChunkOperation(
        async () => {
          await persistenceMutex.run(async () => {
            const savedMap = new Map<string, BankQuestion>();
            if (persist && qaReport.approvedQuestions.length > 0) {
              for (const q of qaReport.approvedQuestions) {
                if (savedMap.has(q.id)) continue;
                const saved = await repository.saveQuestionBankQuestion(q);
                savedMap.set(saved.id, saved);
              }
            } else {
              for (const q of qaReport.approvedQuestions) {
                savedMap.set(q.id, q);
              }
            }

            const savedInThisChunk = Array.from(savedMap.values());
            allGenerated.push(...chunkCandidates);
            allSaved.push(...savedInThisChunk);
            allBankQuestions.push(...savedInThisChunk);
            totalApproved += qaReport.passedCount;
            totalRejected += qaReport.rejectedCount;
            allRejected.push(...qaReport.rejectedQuestions);
            combinedSummary.duplicateRejections += qaReport.summary.duplicateRejections;
            combinedSummary.schemaRejections += qaReport.summary.schemaRejections;
            combinedSummary.qualityRejections += qaReport.summary.qualityRejections;
            completedChunksCount++;

            // Emit real-time chunk progress
            normalizedInput.onChunkProgress?.({
              totalRequested: targetCount,
              completedCount: allSaved.length,
              currentChunk: completedChunksCount,
              totalChunks,
              chunkSize: chunk.chunkSize,
              approvedInChunk: qaReport.passedCount,
              rejectedInChunk: qaReport.rejectedCount,
              failedChunksCount: failedChunks.length,
            });
          });
        },
        {
          ...retryOpts,
          onRetry: (err, attempt, delay) => {
            console.warn(
              `[QuestionBankBatch] Chunk ${chunkIndex + 1} persistence attempt ${attempt} failed, retrying in ${Math.round(delay)}ms: ${err instanceof Error ? err.message : String(err)}`,
            );
          },
        },
      );
    } catch (err) {
      if (normalizedInput.signal?.aborted) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[QuestionBankBatch] Chunk ${chunkIndex + 1} persistence failed after ${retryAttempts} attempts:`, errorMsg);
      await recordFailedChunk(chunk, chunkIndex, errorMsg);
      return;
    }
  }

  const concurrency = Math.max(1, Math.min(input.concurrency ?? DEFAULT_BATCH_CONCURRENCY, plannedChunks.length));
  let nextChunkIndex = 0;

  const runWorker = async () => {
    while (nextChunkIndex < plannedChunks.length) {
      if (normalizedInput.signal?.aborted) break;
      const currentIndex = nextChunkIndex++;
      const chunk = plannedChunks[currentIndex];
      await processPlannedChunk(chunk, currentIndex);
    }
  };

  const workers = Array.from({ length: concurrency }, () => runWorker());
  await Promise.all(workers);

  if (normalizedInput.signal?.aborted) {
    return {
      allGenerated,
      allSaved,
      allRejected,
      totalApproved,
      totalRejected,
      combinedSummary,
      failedChunks,
    };
  }

  // If all planned chunks failed completely, throw an error with aggregated details
  if (allGenerated.length === 0 && failedChunks.length > 0) {
    const details = failedChunks.map((f) => `Chunk ${f.chunkIndex + 1}: ${f.error}`).join("; ");
    throw new Error(`Batch generation failed: all ${failedChunks.length} chunk(s) encountered errors. Details: ${details}`);
  }

  return {
    allGenerated,
    allSaved,
    allRejected,
    totalApproved,
    totalRejected,
    combinedSummary,
    failedChunks,
  };
}
