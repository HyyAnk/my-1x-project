import type { BankQuestion } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { runBatchAutoQa } from "./questionBankAutoQa.js";
import { loadAllKnowledgeEntities } from "./knowledgeBaseLoader.js";
import { calculateMatrixCoverageStats, planBatchChunks } from "./matrixCoverageService.js";
import {
  executeBatchChunkScheduler,
  MAX_BATCH_CHUNK_SIZE,
  DEFAULT_BATCH_CONCURRENCY,
  type QuestionBankChunkProgress,
  type GenerateBatchInput,
  type BatchGenerationResult,
} from "./batch/batchChunkScheduler.js";

export {
  MAX_BATCH_CHUNK_SIZE,
  DEFAULT_BATCH_CONCURRENCY,
  type QuestionBankChunkProgress,
  type GenerateBatchInput,
  type BatchGenerationResult,
};

/**
 * Coordinates the entire AI batch question generation workflow:
 * - Chunking execution in groups of <= 20 questions
 * - Auto Coverage Mode or Manual Diversity Mode
 * - Reverse Generation anchored to canonical Knowledge Base entities
 * - 3-layer Auto-QA verification
 * - Real-time persistence and chunk progress reporting
 */
export async function generateQuestionBankBatch(repository: RepositoryService, input: GenerateBatchInput): Promise<BatchGenerationResult> {
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

  // 3. Make sure knowledge base is loaded
  loadAllKnowledgeEntities();

  // 4. Pre-allocate chunks upfront using collision-free Pre-Allocation Matrix Planner
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

  // 5. Dispatch chunk execution via modular batch scheduler
  const scheduled = await executeBatchChunkScheduler({
    repository,
    input,
    plannedChunks,
    allBankQuestions,
    targetCount,
  });

  const finalCoverage = calculateMatrixCoverageStats(allBankQuestions);

  return {
    success: true,
    mode,
    archetypeId: input.archetypeId,
    domainId: input.domainId,
    subtopicId: input.subtopicId,
    requestedCount: targetCount,
    generatedCount: scheduled.allGenerated.length,
    approvedCount: scheduled.totalApproved,
    rejectedCount: scheduled.totalRejected,
    qaSummary: scheduled.combinedSummary,
    savedQuestions: scheduled.allSaved,
    rejectedQuestions: scheduled.allRejected,
    matrixCoverage: finalCoverage,
  };
}
