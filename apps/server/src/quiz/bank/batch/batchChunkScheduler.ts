import type {
  BankGameplayArchetypeId,
  BankQuestion,
  MatrixCoverageStats,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository/service.js";
import { executeSinglePromptText, type LLMClient } from "../../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../../utils/retryWithBackoff.js";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  parseBatchGenerationOutput,
  parseReverseBatchGenerationOutput,
  type TargetEntityForGeneration,
} from "../batchGeneratorPrompt.js";
import { runBatchAutoQa, type BatchAutoQaReport } from "../questionBankAutoQa.js";
import { getEntityById } from "../knowledgeBaseLoader.js";
import type { PlannedBatchChunk } from "../matrixCoverageService.js";

export const MAX_BATCH_CHUNK_SIZE = 20;
export const DEFAULT_BATCH_CONCURRENCY = 5;

export interface QuestionBankChunkProgress {
  totalRequested: number;
  completedCount: number;
  currentChunk: number;
  totalChunks: number;
  chunkSize: number;
  approvedInChunk: number;
  rejectedInChunk: number;
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
export async function executePromptWithRetry(
  llmClient: LLMClient,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  return retryWithBackoff(
    () =>
      executeSinglePromptText(llmClient, prompt, {
        signal,
        timeoutMs: 180_000,
      }),
    { attempts: 2, baseDelayMs: 2000, jitterMs: 1500 },
  );
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
export async function executeBatchChunkScheduler(
  options: ScheduleBatchChunksOptions,
): Promise<ScheduledBatchExecutionOutput> {
  const { repository, input, plannedChunks, allBankQuestions, targetCount } = options;
  const totalChunks = plannedChunks.length;
  const persist = input.persist !== false;

  const allGenerated: BankQuestion[] = [];
  const allSaved: BankQuestion[] = [];
  const allRejected: BatchAutoQaReport["rejectedQuestions"] = [];
  let totalApproved = 0;
  let totalRejected = 0;
  let completedChunksCount = 0;
  let lastError: string | null = null;

  const combinedSummary: BatchAutoQaReport["summary"] = {
    copyrightRejections: 0,
    duplicateRejections: 0,
    schemaRejections: 0,
    qualityRejections: 0,
  };

  const persistenceMutex = new AsyncMutex();

  async function processPlannedChunk(chunk: PlannedBatchChunk): Promise<void> {
    if (input.signal?.aborted) return;

    let chunkCandidates: BankQuestion[] = [];
    try {
      chunkCandidates = await generateChunkCandidates(chunk, input, allBankQuestions);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[QuestionBankBatch] LLM generation error:`, err);
    }

    if (input.signal?.aborted) return;

    // Run Auto-QA on this chunk's generated candidates
    const qaReport = runBatchAutoQa(chunkCandidates, {
      existingQuestions: allBankQuestions,
    });

    // Safely persist to disk & update state sequentially via Mutex to avoid file write race conditions
    await persistenceMutex.run(async () => {
      allGenerated.push(...chunkCandidates);
      const savedInThisChunk: BankQuestion[] = [];
      if (persist && qaReport.approvedQuestions.length > 0) {
        for (const q of qaReport.approvedQuestions) {
          const saved = await repository.saveQuestionBankQuestion(q);
          savedInThisChunk.push(saved);
          allBankQuestions.push(saved);
        }
      } else {
        savedInThisChunk.push(...qaReport.approvedQuestions);
        allBankQuestions.push(...qaReport.approvedQuestions);
      }

      allSaved.push(...savedInThisChunk);
      totalApproved += qaReport.passedCount;
      totalRejected += qaReport.rejectedCount;
      allRejected.push(...qaReport.rejectedQuestions);
      combinedSummary.copyrightRejections += qaReport.summary.copyrightRejections;
      combinedSummary.duplicateRejections += qaReport.summary.duplicateRejections;
      combinedSummary.schemaRejections += qaReport.summary.schemaRejections;
      combinedSummary.qualityRejections += qaReport.summary.qualityRejections;
      completedChunksCount++;

      // Emit real-time chunk progress
      input.onChunkProgress?.({
        totalRequested: targetCount,
        completedCount: allSaved.length,
        currentChunk: completedChunksCount,
        totalChunks,
        chunkSize: chunk.chunkSize,
        approvedInChunk: qaReport.passedCount,
        rejectedInChunk: qaReport.rejectedCount,
      });
    });
  }

  const concurrency = Math.max(
    1,
    Math.min(input.concurrency ?? DEFAULT_BATCH_CONCURRENCY, plannedChunks.length),
  );
  let nextChunkIndex = 0;
  let workerFatalError: Error | null = null;

  const runWorker = async () => {
    while (nextChunkIndex < plannedChunks.length) {
      if (input.signal?.aborted || workerFatalError) break;
      const chunk = plannedChunks[nextChunkIndex++];
      try {
        await processPlannedChunk(chunk);
      } catch (err) {
        workerFatalError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => runWorker());
  await Promise.all(workers);

  if (workerFatalError && allGenerated.length === 0) {
    throw workerFatalError;
  }

  if (allGenerated.length === 0 && lastError) {
    throw new Error(lastError);
  }

  return {
    allGenerated,
    allSaved,
    allRejected,
    totalApproved,
    totalRejected,
    combinedSummary,
  };
}
