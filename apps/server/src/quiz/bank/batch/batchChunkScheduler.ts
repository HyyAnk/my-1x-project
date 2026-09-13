import type { BankQuestion } from "@studio/shared";
import { normalizeGenerationLanguage } from "../batchGeneratorPrompt.js";
import { runBatchAutoQa, QuestionBankAutoQaIndex, type BatchAutoQaReport } from "../questionBankAutoQa.js";
import type { PlannedBatchChunk } from "../matrixCoverageService.js";
import { AdaptiveRateLimiter } from "./adaptiveRateLimiter.js";
import { getDynamicDeficitChunk } from "../matrix/matrixDeficitPlanner.js";
import {
  type FailedBatchChunk,
  type QuestionBankChunkProgress,
  type GenerateBatchInput,
  type BatchGenerationResult,
  type ScheduleBatchChunksOptions,
  type ScheduledBatchExecutionOutput,
  type ChunkRetryOptions,
} from "./types/batchChunk.types.js";
import { AsyncMutex, retryChunkOperation, executePromptWithRetry } from "./utils/batchAsyncUtils.js";
import { resolveChunkTargets, generateChunkCandidates } from "./services/batchCandidateGenerator.js";

export const MAX_BATCH_CHUNK_SIZE = 20;
export const DEFAULT_BATCH_CONCURRENCY = 5;

export {
  type FailedBatchChunk,
  type QuestionBankChunkProgress,
  type GenerateBatchInput,
  type BatchGenerationResult,
  type ScheduleBatchChunksOptions,
  type ScheduledBatchExecutionOutput,
  type ChunkRetryOptions,
  AsyncMutex,
  retryChunkOperation,
  executePromptWithRetry,
  resolveChunkTargets,
  generateChunkCandidates,
};

/**
 * Chunk execution scheduler managing worker concurrency throttling, LLM calls,
 * Auto-QA verification, mutexed persistence, chunk progress reporting, and cancellation.
 */
export async function executeBatchChunkScheduler(
  options: ScheduleBatchChunksOptions,
): Promise<ScheduledBatchExecutionOutput> {
  const { repository, input, allBankQuestions, targetCount } = options;
  const rateLimiter = options.rateLimiter ?? input.rateLimiter ?? new AdaptiveRateLimiter();
  const generationLanguage = normalizeGenerationLanguage(input.language);
  const normalizedInput = generationLanguage === input.language ? input : { ...input, language: generationLanguage };

  const isDynamic = Boolean(
    options.useDynamicChunks || input.useDynamicChunks || !options.plannedChunks || options.plannedChunks.length === 0,
  );
  const plannedChunks = options.plannedChunks && options.plannedChunks.length > 0 ? options.plannedChunks : [];
  const chunkSize = Math.min(MAX_BATCH_CHUNK_SIZE, targetCount);
  const totalChunks = isDynamic ? Math.ceil(targetCount / chunkSize) : plannedChunks.length;
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
  const sharedQaIndex = new QuestionBankAutoQaIndex(allBankQuestions);

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
    const retryOpts: ChunkRetryOptions = {
      attempts: retryAttempts,
      baseDelayMs: normalizedInput.retryBaseDelayMs ?? 500,
      signal: normalizedInput.signal,
    };

    let chunkCandidates: BankQuestion[] = [];
    try {
      chunkCandidates = await retryChunkOperation(
        () => generateChunkCandidates(chunk, normalizedInput, allBankQuestions, rateLimiter),
        {
          ...retryOpts,
          onRetry: (err, attempt, delay) => {
            console.warn(`[QuestionBankBatch] Chunk ${chunkIndex + 1} candidate generation attempt ${attempt} failed, retrying in ${Math.round(delay)}ms: ${err instanceof Error ? err.message : String(err)}`);
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

    const qaReport = runBatchAutoQa(chunkCandidates, { existingQuestions: allBankQuestions, existingIndex: sharedQaIndex });

    try {
      await retryChunkOperation(
        async () => {
          await persistenceMutex.run(async () => {
            const savedMap = new Map<string, BankQuestion>();
            for (const q of qaReport.approvedQuestions) {
              if (savedMap.has(q.id)) continue;
              const saved = persist ? await repository.saveQuestionBankQuestion(q) : q;
              savedMap.set(saved.id, saved);
            }

            const savedInThisChunk = Array.from(savedMap.values());
            allGenerated.push(...chunkCandidates);
            allSaved.push(...savedInThisChunk);
            allBankQuestions.push(...savedInThisChunk);
            for (const q of savedInThisChunk) sharedQaIndex.add(q);

            totalApproved += qaReport.passedCount;
            totalRejected += qaReport.rejectedCount;
            allRejected.push(...qaReport.rejectedQuestions);
            combinedSummary.duplicateRejections += qaReport.summary.duplicateRejections;
            combinedSummary.schemaRejections += qaReport.summary.schemaRejections;
            combinedSummary.qualityRejections += qaReport.summary.qualityRejections;
            completedChunksCount++;

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
            console.warn(`[QuestionBankBatch] Chunk ${chunkIndex + 1} persistence attempt ${attempt} failed, retrying in ${Math.round(delay)}ms: ${err instanceof Error ? err.message : String(err)}`);
          },
        },
      );
    } catch (err) {
      if (normalizedInput.signal?.aborted) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[QuestionBankBatch] Chunk ${chunkIndex + 1} persistence failed after ${retryAttempts} attempts:`, errorMsg);
      await recordFailedChunk(chunk, chunkIndex, errorMsg);
    }
  }

  const concurrency = Math.max(1, Math.min(input.concurrency ?? DEFAULT_BATCH_CONCURRENCY, totalChunks || 1));
  let nextChunkIndex = 0;
  const inFlightEntityIds = new Set<string>();

  const runWorker = async () => {
    while (!normalizedInput.signal?.aborted) {
      let chunkToProcess: PlannedBatchChunk | null = null;
      let currentIndex = 0;

      if (!isDynamic) {
        if (nextChunkIndex >= plannedChunks.length) break;
        currentIndex = nextChunkIndex++;
        chunkToProcess = plannedChunks[currentIndex];
      } else {
        if (allSaved.length >= targetCount || nextChunkIndex >= totalChunks) break;
        await persistenceMutex.run(async () => {
          if (allSaved.length >= targetCount || nextChunkIndex >= totalChunks) return;
          currentIndex = nextChunkIndex++;
          const remainingNeeded = targetCount - allSaved.length;
          chunkToProcess = getDynamicDeficitChunk(allBankQuestions, {
            mode: normalizedInput.mode,
            chunkIndex: currentIndex,
            totalChunks,
            chunkSize: Math.min(MAX_BATCH_CHUNK_SIZE, remainingNeeded),
            domainId: normalizedInput.domainId,
            subtopicId: normalizedInput.subtopicId,
            subtopicTitle: normalizedInput.subtopicTitle,
            archetypeId: normalizedInput.archetypeId,
            difficulty: normalizedInput.difficulty,
            excludeEntityIds: inFlightEntityIds,
          });
          for (const c of chunkToProcess.candidates) inFlightEntityIds.add(c.entity_id);
        });
        if (!chunkToProcess) break;
      }

      try {
        await processPlannedChunk(chunkToProcess, currentIndex);
      } finally {
        if (isDynamic && chunkToProcess) {
          await persistenceMutex.run(async () => {
            for (const c of chunkToProcess!.candidates) inFlightEntityIds.delete(c.entity_id);
          });
        }
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => runWorker());
  await Promise.all(workers);

  const output: ScheduledBatchExecutionOutput = {
    allGenerated,
    allSaved,
    allRejected,
    totalApproved,
    totalRejected,
    combinedSummary,
    failedChunks,
  };

  if (normalizedInput.signal?.aborted) return output;

  if (allGenerated.length === 0 && failedChunks.length > 0) {
    const details = failedChunks.map((f) => `Chunk ${f.chunkIndex + 1}: ${f.error}`).join("; ");
    throw new Error(`Batch generation failed: all ${failedChunks.length} chunk(s) encountered errors. Details: ${details}`);
  }

  return output;
}
