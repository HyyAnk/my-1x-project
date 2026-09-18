import type { BankQuestion } from "@studio/shared";
import { buildMatrixCoverageMap } from "./matrixCoverageCalculator.js";
import { selectAutoCandidates, selectMatrixCandidatesAuto } from "./selectors/matrixAutoSelector.js";
import { selectManualCandidates, selectMatrixCandidatesManual } from "./selectors/matrixManualSelector.js";
import { planBatchChunks } from "./matrixBatchPrePlanner.js";
import { calculateTotals } from "./matrixTotalsCalculator.js";
import type {
  SelectAutoCandidatesOptions,
  SelectManualCandidatesOptions,
  PlannedBatchChunk,
  PlanBatchChunksOptions,
  DynamicDeficitChunkOptions,
  DomainArchEvaluation,
} from "./types/matrixPlanner.types.js";

export type {
  SelectAutoCandidatesOptions,
  SelectManualCandidatesOptions,
  PlannedBatchChunk,
  PlanBatchChunksOptions,
  DynamicDeficitChunkOptions,
  DomainArchEvaluation,
};
export {
  calculateTotals,
  selectAutoCandidates,
  selectMatrixCandidatesAuto,
  selectManualCandidates,
  selectMatrixCandidatesManual,
  planBatchChunks,
};

/**
 * Just-In-Time (JIT) Dynamic Deficit Chunk Planner
 * Evaluates the question bank's current state on-demand and selects the single highest-deficit chunk.
 */
export function getDynamicDeficitChunk(questions: BankQuestion[] = [], options: DynamicDeficitChunkOptions = {}): PlannedBatchChunk {
  const chunkSize = Math.max(1, options.chunkSize || 20);
  const chunkIndex = options.chunkIndex ?? 0;
  const totalChunks = Math.max(1, options.totalChunks ?? 1);
  const mode = options.mode || "auto";

  let coverageMap = options.coverageMap;
  if (!coverageMap && options.coverageCache) coverageMap = options.coverageCache.getComboMap();
  if (!coverageMap && questions.length > 0) coverageMap = buildMatrixCoverageMap(questions);

  const selectorOpts = {
    count: chunkSize,
    domain_id: options.domainId,
    archetype_ids: options.archetypeId ? [options.archetypeId] : undefined,
    entities: options.entities,
    baseDir: options.baseDir,
    coverageMap,
    excludeEntityIds: options.excludeEntityIds,
  };

  const candidates =
    mode === "manual"
      ? selectManualCandidates(questions, {
          ...selectorOpts,
          subtopic_id: options.subtopicId,
          difficulty: options.difficulty,
        })
      : selectAutoCandidates(questions, selectorOpts);

  return {
    chunkIndex,
    totalChunks,
    chunkSize,
    domainId: candidates[0]?.domain_id || options.domainId || "general",
    archetypeId: candidates[0]?.archetype_id || options.archetypeId || "speed_blitz",
    subtopicId: candidates[0]?.subtopic_id || options.subtopicId || "general",
    candidates,
  };
}
