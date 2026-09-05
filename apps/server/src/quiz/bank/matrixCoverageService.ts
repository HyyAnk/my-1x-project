/**
 * Matrix Coverage Service Facade
 * Provides backward-compatible re-exports for matrix coverage calculations,
 * candidate selection, and multi-chunk batch planning.
 */

export {
  ALL_MATRIX_ARCHETYPES,
  buildMatrixCoverageMap,
  calculateMatrixCoverageStats,
  type MatrixCoverageServiceOptions,
} from "./matrix/matrixCoverageCalculator.js";

export {
  selectAutoCandidates,
  selectMatrixCandidatesAuto,
  selectManualCandidates,
  selectMatrixCandidatesManual,
  planBatchChunks,
  type SelectAutoCandidatesOptions,
  type SelectManualCandidatesOptions,
  type PlannedBatchChunk,
  type PlanBatchChunksOptions,
} from "./matrix/matrixDeficitPlanner.js";

export * from "./matrix/index.js";
