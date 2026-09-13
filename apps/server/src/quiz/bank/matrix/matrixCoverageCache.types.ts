import type { BankGameplayArchetypeId, BankIndex, BankQuestion, MatrixCoverageStats } from "@studio/shared";
import type { KnowledgeEntity } from "../knowledgeBaseLoader.js";

/**
 * Metadata representing the state of a question prior to or after mutation.
 */
export interface QuestionMutationMeta {
  id?: string;
  archetype_id: string;
  domain_id: string;
  entity_id?: string | null;
  status?: string;
}

/**
 * Options for configuring and warming the Matrix Coverage Cache.
 */
export interface MatrixCoverageCacheOptions {
  baseDir?: string;
  entities?: KnowledgeEntity[];
  targetTotal?: number;
}

/**
 * Internal accumulator structure for domain-level matrix aggregations.
 */
export interface MatrixDomainAccumulator {
  total_entities: number;
  total_combos: number;
  covered_combos: number;
  total_variants: number;
  coverage_percent: number;
}

/**
 * Internal accumulator structure for archetype-level matrix aggregations.
 */
export interface MatrixArchetypeAccumulator {
  total_combos: number;
  covered_combos: number;
  total_variants: number;
  coverage_percent: number;
}

/**
 * Aggregated SQL row returned by the fast warming query.
 */
export interface SqliteAggregationRow {
  archetype_id: string;
  domain_id: string;
  entity_id: string | null;
  count: number;
}

/**
 * Interface contract for the Question Bank In-Memory Matrix & Stats Cache.
 */
export interface IMatrixCoverageCache {
  isWarmed(): boolean;
  warmUpFromSqlite(rows: SqliteAggregationRow[], targetTotal?: number): void;
  getStats(): BankIndex;
  getMatrixCoverage(): MatrixCoverageStats;
  getComboVariantCount(archetypeId: BankGameplayArchetypeId | string, entityId: string): number;
  getComboMap(): ReadonlyMap<string, number>;
  onQuestionSaved(question: BankQuestion, previousMeta?: QuestionMutationMeta | null): void;
  onQuestionDeleted(questionId: string, meta: QuestionMutationMeta): void;
  onBankCleared(): void;
  reset(): void;
}
