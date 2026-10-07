import type { BankQuestion } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { runBatchAutoQa } from "./questionBankAutoQa.js";
import { remediateLeakedQuestionsBatch } from "./remediation/index.js";
import { loadAllKnowledgeEntities } from "./knowledgeBaseLoader.js";
import { calculateMatrixCoverageStats, planBatchChunks } from "./matrixCoverageService.js";
import {
  executeBatchChunkScheduler,
  MAX_BATCH_CHUNK_SIZE,
  DEFAULT_BATCH_CONCURRENCY,
  type QuestionBankChunkProgress,
  type GenerateBatchInput,
  type BatchGenerationResult,
  type FailedBatchChunk,
} from "./batch/batchChunkScheduler.js";

export {
  MAX_BATCH_CHUNK_SIZE,
  DEFAULT_BATCH_CONCURRENCY,
  type QuestionBankChunkProgress,
  type GenerateBatchInput,
  type BatchGenerationResult,
  type FailedBatchChunk,
};

export type BankRawCandidateLanguageError = {
  code: "BANK_ENGLISH_ONLY";
  error: string;
};

/** Validates the immutable Bank language boundary before QA, persistence, or provider work. */
export function validateBankRawCandidateLanguages(candidates: readonly unknown[] | undefined): BankRawCandidateLanguageError | null {
  if (!candidates || candidates.length === 0) return null;
  const invalidIndex = candidates.findIndex((candidate) => {
    if (!candidate || typeof candidate !== "object") return true;
    return (candidate as { language?: unknown }).language !== "en";
  });
  if (invalidIndex < 0) return null;
  return {
    code: "BANK_ENGLISH_ONLY",
    error: `Raw Bank candidate at index ${invalidIndex} must declare explicit language 'en'`,
  };
}

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
    const languageError = validateBankRawCandidateLanguages(input.rawCandidatesOverride);
    if (languageError) throw new Error(`${languageError.code}: ${languageError.error}`);
    const existingResult = await repository.queryQuestionBankQuestions({ limit: 10000 });
    const existingQuestions = existingResult.questions;

    const qaReport = runBatchAutoQa(input.rawCandidatesOverride, { existingQuestions });

    let remediatedLeakCount = 0;
    if (input.llmClient && qaReport.rejectedQuestions.length > 0) {
      const leakedItems = qaReport.rejectedQuestions
        .map((r) => {
          const leakIssue = r.issues.find(
            (i) => i.details?.leakType === "eponymous_franchise_leak" || i.details?.leakType === "verbatim_stem_leak",
          );
          return leakIssue ? { question: r.question, issue: leakIssue } : null;
        })
        .filter((item): item is { question: BankQuestion; issue: any } => item !== null);

      if (leakedItems.length > 0) {
        try {
          const remediation = await remediateLeakedQuestionsBatch(leakedItems, {
            llmClient: input.llmClient,
            modelOverride: input.modelOverride,
          });

          if (remediation.remediatedCount > 0) {
            remediatedLeakCount = remediation.remediatedCount;
            const fixedIds = new Set(remediation.remediatedQuestions.map((q) => q.id));

            for (const fixed of remediation.remediatedQuestions) {
              qaReport.approvedQuestions.push(fixed);
              qaReport.passedCount++;
            }

            const remainingRejected = qaReport.rejectedQuestions.filter((r) => !fixedIds.has(r.question.id));
            qaReport.rejectedQuestions = remainingRejected;
            qaReport.rejectedCount = qaReport.rejectedQuestions.length;
          }
        } catch (remErr) {
          console.warn("[QuestionBankBatch] Raw candidates auto-remediation error:", remErr);
        }
      }
    }

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
      remediatedLeakCount,
      qaSummary: qaReport.summary,
      savedQuestions,
      rejectedQuestions: qaReport.rejectedQuestions,
      matrixCoverage:
        persist && savedQuestions.length > 0 ? await repository.getQuestionBankMatrixCoverage() : calculateMatrixCoverageStats(allCurrent),
      failedChunks: [],
      failedChunksCount: 0,
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

  // 4. Chunk Planning: Use dynamic JIT streaming for large batches (>100 questions) or upfront planning for small batches
  const useDynamic = Boolean(input.useDynamicChunks || targetCount > 100);
  const plannedChunks = useDynamic
    ? undefined
    : planBatchChunks(allBankQuestions, {
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
    useDynamicChunks: useDynamic,
    allBankQuestions,
    targetCount,
  });

  const finalCoverage = persist ? await repository.getQuestionBankMatrixCoverage() : calculateMatrixCoverageStats(allBankQuestions);
  const totalChunks = plannedChunks?.length ?? Math.ceil(targetCount / MAX_BATCH_CHUNK_SIZE);
  const hasFailures = scheduled.failedChunks.length > 0;
  const errorSummary = hasFailures
    ? `${scheduled.failedChunks.length} of ${totalChunks} chunk(s) encountered failures during batch generation: ` +
      scheduled.failedChunks.map((f) => `Chunk ${f.chunkIndex + 1}: ${f.error}`).join("; ")
    : undefined;

  return {
    success: !hasFailures,
    mode,
    archetypeId: input.archetypeId,
    domainId: input.domainId,
    subtopicId: input.subtopicId,
    requestedCount: targetCount,
    generatedCount: scheduled.allGenerated.length,
    approvedCount: scheduled.totalApproved,
    rejectedCount: scheduled.totalRejected,
    remediatedLeakCount: scheduled.remediatedLeakCount ?? 0,
    qaSummary: scheduled.combinedSummary,
    savedQuestions: scheduled.allSaved,
    rejectedQuestions: scheduled.allRejected,
    matrixCoverage: finalCoverage,
    failedChunks: scheduled.failedChunks,
    failedChunksCount: scheduled.failedChunks.length,
    errorSummary,
  };
}
