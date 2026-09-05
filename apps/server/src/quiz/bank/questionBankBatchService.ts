import type { BankGameplayArchetypeId, BankQuestion } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { buildBatchGenerationPrompt, parseBatchGenerationOutput } from "./batchGeneratorPrompt.js";
import { runBatchAutoQa, type BatchAutoQaReport } from "./questionBankAutoQa.js";

export interface GenerateBatchInput {
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  subtopicTitle?: string;
  count?: number;
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  persist?: boolean;
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  rawCandidatesOverride?: BankQuestion[];
}

export interface BatchGenerationResult {
  success: boolean;
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  requestedCount: number;
  generatedCount: number;
  approvedCount: number;
  rejectedCount: number;
  qaSummary: BatchAutoQaReport["summary"];
  savedQuestions: BankQuestion[];
  rejectedQuestions: BatchAutoQaReport["rejectedQuestions"];
}

/**
 * Coordinates the entire AI batch question generation workflow, Auto-QA verification, and persistence to Question Bank.
 */
export async function generateQuestionBankBatch(repository: RepositoryService, input: GenerateBatchInput): Promise<BatchGenerationResult> {
  const count = Math.max(1, Math.min(input.count || 5, 50));
  const archetypeId = input.archetypeId;
  const domainId = input.domainId;
  const subtopicId = input.subtopicId;
  const subtopicTitle = input.subtopicTitle || subtopicId.replaceAll("_", " ");
  const persist = input.persist !== false;

  // 1. Load existing questions in the same Archetype & Domain for deduplication
  const existingResult = await repository.queryQuestionBankQuestions({
    archetypeId,
    domainId,
    limit: 10000,
  });
  const existingQuestions = existingResult.questions;

  // 2. Gather samples of existing questions to inject into prompt to prevent duplicates
  const sampleExisting = existingQuestions
    .filter((q) => q.subtopic_id === subtopicId)
    .slice(0, 10)
    .map((q) => q.question);

  let candidates: BankQuestion[] = [];

  // 3. Initialize candidate list (from override or via AI LLM call)
  if (input.rawCandidatesOverride && input.rawCandidatesOverride.length > 0) {
    candidates = input.rawCandidatesOverride;
  } else if (input.llmClient) {
    const prompt = buildBatchGenerationPrompt({
      archetypeId,
      domainId,
      subtopicId,
      subtopicTitle,
      count,
      language: input.language,
      difficulty: input.difficulty,
      ageBand: input.ageBand,
      existingQuestionSamples: sampleExisting,
    });

    const rawOutput = await executeSinglePromptText(input.llmClient, prompt, {
      signal: input.signal,
      timeoutMs: 60_000,
    });

    candidates = parseBatchGenerationOutput(rawOutput, {
      archetypeId,
      domainId,
      subtopicId,
      difficulty: input.difficulty,
      ageBand: input.ageBand,
    });
  } else {
    throw new Error("No AI engine client or candidates provided for batch generation");
  }

  // 4. Run 3-layer Auto-QA filter (Copyright, Deduplication, Schema & Quality)
  const qaReport = runBatchAutoQa(candidates, {
    existingQuestions,
  });

  // 5. Save approved questions to batch JSON on disk
  const savedQuestions: BankQuestion[] = [];
  if (persist && qaReport.approvedQuestions.length > 0) {
    for (const q of qaReport.approvedQuestions) {
      const saved = await repository.saveQuestionBankQuestion(q);
      savedQuestions.push(saved);
    }
  } else {
    savedQuestions.push(...qaReport.approvedQuestions);
  }

  return {
    success: true,
    archetypeId,
    domainId,
    subtopicId,
    requestedCount: count,
    generatedCount: candidates.length,
    approvedCount: qaReport.passedCount,
    rejectedCount: qaReport.rejectedCount,
    qaSummary: qaReport.summary,
    savedQuestions,
    rejectedQuestions: qaReport.rejectedQuestions,
  };
}
