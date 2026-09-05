import type {
  BankGameplayArchetypeId,
  BankQuestion,
  MatrixCoverageStats,
} from "@studio/shared";
import {
  loadAllKnowledgeEntities,
  type KnowledgeEntity,
} from "../knowledgeBaseLoader.js";

export const ALL_MATRIX_ARCHETYPES: readonly BankGameplayArchetypeId[] = [
  "verdict_true_false",
  "speed_blitz",
  "deep_trivia",
  "versus_faceoff",
  "visual_spotting",
  "visual_identification",
  "mystery_reveal",
  "clue_deduction",
] as const;

export interface MatrixCoverageServiceOptions {
  baseDir?: string;
  entities?: KnowledgeEntity[];
}

/**
 * Builds a fast lookup map of (archetype_id + entity_id) -> variant count from existing bank questions.
 */
export function buildMatrixCoverageMap(questions: BankQuestion[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const q of questions) {
    if (q.entity_id && q.archetype_id) {
      const archId = q.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : q.archetype_id;
      const key = `${archId}:${q.entity_id}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return map;
}

/**
 * Calculates comprehensive coverage statistics across the knowledge entity x archetype matrix.
 */
export function calculateMatrixCoverageStats(
  questions: BankQuestion[],
  options?: MatrixCoverageServiceOptions,
): MatrixCoverageStats {
  const entities = options?.entities || loadAllKnowledgeEntities({ baseDir: options?.baseDir });
  const coverageMap = buildMatrixCoverageMap(questions);

  const totalEntities = entities.length;
  const totalCombos = totalEntities * ALL_MATRIX_ARCHETYPES.length;

  let coveredCombos = 0;
  let totalVariants = 0;

  // Initialize domain aggregators
  const domainAggregators = new Map<
    string,
    { total_entities: number; total_combos: number; covered_combos: number; total_variants: number }
  >();

  for (const entity of entities) {
    if (!domainAggregators.has(entity.domain_id)) {
      domainAggregators.set(entity.domain_id, {
        total_entities: 0,
        total_combos: 0,
        covered_combos: 0,
        total_variants: 0,
      });
    }
    const domainAgg = domainAggregators.get(entity.domain_id)!;
    domainAgg.total_entities += 1;
    domainAgg.total_combos += ALL_MATRIX_ARCHETYPES.length;
  }

  // Initialize archetype aggregators
  const archetypeAggregators = new Map<
    string,
    { total_combos: number; covered_combos: number; total_variants: number }
  >();

  for (const arch of ALL_MATRIX_ARCHETYPES) {
    archetypeAggregators.set(arch, {
      total_combos: totalEntities,
      covered_combos: 0,
      total_variants: 0,
    });
  }

  // Iterate over all matrix cells
  for (const entity of entities) {
    const domainAgg = domainAggregators.get(entity.domain_id);

    for (const arch of ALL_MATRIX_ARCHETYPES) {
      const key = `${arch}:${entity.id}`;
      const count = coverageMap.get(key) || 0;

      if (count > 0) {
        coveredCombos += 1;
        totalVariants += count;

        if (domainAgg) {
          domainAgg.covered_combos += 1;
          domainAgg.total_variants += count;
        }

        const archAgg = archetypeAggregators.get(arch);
        if (archAgg) {
          archAgg.covered_combos += 1;
          archAgg.total_variants += count;
        }
      }
    }
  }

  const coveragePercent = totalCombos > 0 ? Number(((coveredCombos / totalCombos) * 100).toFixed(1)) : 0;

  const byDomain: MatrixCoverageStats["by_domain"] = {};
  for (const [domainId, agg] of domainAggregators.entries()) {
    const pct = agg.total_combos > 0 ? Number(((agg.covered_combos / agg.total_combos) * 100).toFixed(1)) : 0;
    byDomain[domainId] = {
      total_entities: agg.total_entities,
      total_combos: agg.total_combos,
      covered_combos: agg.covered_combos,
      total_variants: agg.total_variants,
      coverage_percent: pct,
    };
  }

  const byArchetype: MatrixCoverageStats["by_archetype"] = {};
  for (const [archId, agg] of archetypeAggregators.entries()) {
    const pct = agg.total_combos > 0 ? Number(((agg.covered_combos / agg.total_combos) * 100).toFixed(1)) : 0;
    byArchetype[archId] = {
      total_combos: agg.total_combos,
      covered_combos: agg.covered_combos,
      total_variants: agg.total_variants,
      coverage_percent: pct,
    };
  }

  return {
    total_combos: totalCombos,
    covered_combos: coveredCombos,
    total_variants: totalVariants,
    coverage_percent: coveragePercent,
    by_domain: byDomain,
    by_archetype: byArchetype,
    updated_at: new Date().toISOString(),
  };
}
