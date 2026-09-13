import type { BankQuestion } from "@studio/shared";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  parseBatchGenerationOutput,
  parseReverseBatchGenerationOutput,
  type TargetEntityForGeneration,
} from "../../batchGeneratorPrompt.js";
import { getEntityById } from "../../knowledgeBaseLoader.js";
import type { PlannedBatchChunk } from "../../matrixCoverageService.js";
import type { AdaptiveRateLimiter } from "../adaptiveRateLimiter.js";
import type { GenerateBatchInput } from "../types/batchChunk.types.js";
import { executePromptWithRetry } from "../utils/batchAsyncUtils.js";

/**
 * Maps planned chunk candidates to TargetEntityForGeneration objects with canonical knowledge traits.
 */
export function resolveChunkTargets(chunk: PlannedBatchChunk): TargetEntityForGeneration[] {
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
export async function generateChunkCandidates(
  chunk: PlannedBatchChunk,
  input: GenerateBatchInput,
  allBankQuestions: BankQuestion[],
  rateLimiter?: AdaptiveRateLimiter,
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

    const rawOutput = await executePromptWithRetry(input.llmClient!, prompt, input.signal, rateLimiter);
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

    const rawOutput = await executePromptWithRetry(input.llmClient!, prompt, input.signal, rateLimiter);
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
