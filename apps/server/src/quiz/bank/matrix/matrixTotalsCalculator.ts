import type { BankQuestion } from "@studio/shared";
import type { KnowledgeEntity } from "../knowledgeBaseLoader.js";
import { ALL_MATRIX_ARCHETYPES } from "./matrixCoverageCalculator.js";

export interface VariantTotals {
  domainVariantTotals: Map<string, number>;
  archVariantTotals: Map<string, number>;
  entityVariantTotals: Map<string, number>;
}

/**
 * Calculates aggregated question variant totals by domain, archetype, and entity
 * across the question bank or from a pre-computed matrix coverage map.
 */
export function calculateTotals(
  questions: BankQuestion[],
  coverageMap?: ReadonlyMap<string, number>,
  entities?: KnowledgeEntity[],
): VariantTotals {
  const domainVariantTotals = new Map<string, number>();
  const archVariantTotals = new Map<string, number>();
  const entityVariantTotals = new Map<string, number>();

  if (questions.length > 0) {
    for (const q of questions) {
      if (q.domain_id) {
        domainVariantTotals.set(q.domain_id, (domainVariantTotals.get(q.domain_id) || 0) + 1);
      }
      if (q.archetype_id) {
        archVariantTotals.set(q.archetype_id, (archVariantTotals.get(q.archetype_id) || 0) + 1);
      }
      if (q.entity_id) {
        entityVariantTotals.set(q.entity_id, (entityVariantTotals.get(q.entity_id) || 0) + 1);
      }
    }
  } else if (coverageMap && entities) {
    for (const ent of entities) {
      let entTotal = 0;
      for (const arch of ALL_MATRIX_ARCHETYPES) {
        const count = coverageMap.get(`${arch}:${ent.id}`) || 0;
        if (count > 0) {
          entTotal += count;
          archVariantTotals.set(arch, (archVariantTotals.get(arch) || 0) + count);
          domainVariantTotals.set(ent.domain_id, (domainVariantTotals.get(ent.domain_id) || 0) + count);
        }
      }
      if (entTotal > 0) {
        entityVariantTotals.set(ent.id, entTotal);
      }
    }
  }

  return { domainVariantTotals, archVariantTotals, entityVariantTotals };
}
