import type {
  BankGameplayArchetypeId,
  BankQuestion,
  MatrixCoverageStats,
} from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  parseBatchGenerationOutput,
  parseReverseBatchGenerationOutput,
  type TargetEntityForGeneration,
} from "./batchGeneratorPrompt.js";
import { runBatchAutoQa, type BatchAutoQaReport } from "./questionBankAutoQa.js";
import { getEntityById, loadAllKnowledgeEntities } from "./knowledgeBaseLoader.js";
import {
  calculateMatrixCoverageStats,
  planBatchChunks,
  type PlannedBatchChunk,
} from "./matrixCoverageService.js";

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

/**
 * Coordinates the entire AI batch question generation workflow:
 * - Chunking execution in groups of <= 20 questions
 * - Auto Coverage Mode (unfilled matrix cells) or Manual Diversity Mode (Least-Variant-First)
 * - Reverse Generation anchored to canonical Knowledge Base entities
 * - 3-layer Auto-QA verification
 * - Real-time persistence and chunk progress reporting
 */
export async function generateQuestionBankBatch(
  repository: RepositoryService,
  input: GenerateBatchInput,
): Promise<BatchGenerationResult> {
  const targetCount = Math.max(1, input.count || 20);
  const mode = input.mode || (input.domainId || input.archetypeId ? "manual" : "auto");
  const persist = input.persist !== false;

  // 1. Fast path for raw candidates override (offline tests / direct imports)
  if (input.rawCandidatesOverride && input.rawCandidatesOverride.length > 0) {
    const existingResult = await repository.queryQuestionBankQuestions({ limit: 10000 });
    const existingQuestions = existingResult.questions;

    const qaReport = runBatchAutoQa(input.rawCandidatesOverride, { existingQuestions });
    const savedQuestions: BankQuestion[] = [];

    if (persist && qaReport.approvedQuestions.length > 0) {
      for (const q of qaReport.approvedQuestions) {
        const saved = await repository.saveQuestionBankQuestion(q);
        savedQuestions.push(saved);
      }
    } else {
      savedQuestions.push(...qaReport.approvedQuestions);
    }

    input.onChunkProgress?.({
      totalRequested: input.rawCandidatesOverride.length,
      completedCount: savedQuestions.length,
      currentChunk: 1,
      totalChunks: 1,
      chunkSize: input.rawCandidatesOverride.length,
      approvedInChunk: qaReport.passedCount,
      rejectedInChunk: qaReport.rejectedCount,
    });

    const allCurrent = [...existingQuestions, ...savedQuestions];
    return {
      success: true,
      mode,
      archetypeId: input.archetypeId,
      domainId: input.domainId,
      subtopicId: input.subtopicId,
      requestedCount: input.rawCandidatesOverride.length,
      generatedCount: input.rawCandidatesOverride.length,
      approvedCount: qaReport.passedCount,
      rejectedCount: qaReport.rejectedCount,
      qaSummary: qaReport.summary,
      savedQuestions,
      rejectedQuestions: qaReport.rejectedQuestions,
      matrixCoverage: calculateMatrixCoverageStats(allCurrent),
    };
  }

  if (!input.llmClient) {
    throw new Error("No AI engine client or candidates provided for batch generation");
  }

  // 2. Load existing bank questions to maintain active matrix coverage
  const existingResult = await repository.queryQuestionBankQuestions({ limit: 50000 });
  const allBankQuestions: BankQuestion[] = [...existingResult.questions];

  // 3. Pre-allocate chunks upfront using collision-free Pre-Allocation Matrix Planner
  const plannedChunks = planBatchChunks(allBankQuestions, {
    mode,
    targetCount,
    chunkSize: MAX_BATCH_CHUNK_SIZE,
    domainId: input.domainId,
    subtopicId: input.subtopicId,
    subtopicTitle: input.subtopicTitle,
    archetypeId: input.archetypeId,
    difficulty: input.difficulty,
  });

  const totalChunks = plannedChunks.length;
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

  // Make sure knowledge base is loaded
  loadAllKnowledgeEntities();

  // Async Mutex to ensure thread-safe persistence and progress callbacks
  class AsyncMutex {
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
  const persistenceMutex = new AsyncMutex();

  // Single prompt execution with transient rate-limit retry
  async function executeWithRetry(prompt: string): Promise<string> {
    try {
      return await executeSinglePromptText(input.llmClient!, prompt, {
        signal: input.signal,
        timeoutMs: 180_000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = /(?:429|resource[_\s]?exhausted|rate[_\s]?limit|too many requests)/i.test(message);
      if (isRateLimit && !input.signal?.aborted) {
        await new Promise((res) => setTimeout(res, 2000 + Math.random() * 1500));
        return await executeSinglePromptText(input.llmClient!, prompt, {
          signal: input.signal,
          timeoutMs: 180_000,
        });
      }
      throw err;
    }
  }

  // 4. Chunk worker processing function
  async function processPlannedChunk(chunk: PlannedBatchChunk): Promise<void> {
    if (input.signal?.aborted) return;

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

      try {
        const rawOutput = await executeWithRetry(prompt);
        const parsed = parseBatchGenerationOutput(rawOutput, {
          archetypeId: archId,
          domainId: domId,
          subtopicId: subId,
          difficulty: input.difficulty,
          ageBand: input.ageBand,
        });
        chunkCandidates.push(...parsed);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[QuestionBankBatch] LLM generation error (fallback):`, err);
      }
    } else {
      // Transform into target entity format
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

      try {
        const rawOutput = await executeWithRetry(prompt);
        const parsed = parseReverseBatchGenerationOutput(rawOutput, targets, {
          archetypeId: chunk.archetypeId,
          difficulty: input.difficulty,
          ageBand: input.ageBand,
        });
        chunkCandidates.push(...parsed);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[QuestionBankBatch] Reverse generation LLM error for archetype ${chunk.archetypeId}:`, err);
      }
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

  // 5. Dispatch across Concurrency Worker Pool (default: 5 concurrent workers)
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

  const finalCoverage = calculateMatrixCoverageStats(allBankQuestions);

  return {
    success: true,
    mode,
    archetypeId: input.archetypeId,
    domainId: input.domainId,
    subtopicId: input.subtopicId,
    requestedCount: targetCount,
    generatedCount: allGenerated.length,
    approvedCount: totalApproved,
    rejectedCount: totalRejected,
    qaSummary: combinedSummary,
    savedQuestions: allSaved,
    rejectedQuestions: allRejected,
    matrixCoverage: finalCoverage,
  };
}
