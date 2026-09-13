import type { BankQuestion, MatrixComboCandidate } from "@studio/shared";
import { loadAllKnowledgeEntities, type KnowledgeEntity } from "../../knowledgeBaseLoader.js";
import { ALL_MATRIX_ARCHETYPES, buildMatrixCoverageMap } from "../matrixCoverageCalculator.js";
import type { SelectManualCandidatesOptions } from "../types/matrixPlanner.types.js";

/**
 * Filters knowledge entities according to optional criteria (domain, subtopic, difficulty, exclusions).
 */
function filterManualEntities(
  entities: KnowledgeEntity[],
  options: SelectManualCandidatesOptions,
): KnowledgeEntity[] {
  const excludedSet = options.excludeEntityIds
    ? (options.excludeEntityIds instanceof Set ? options.excludeEntityIds : new Set(options.excludeEntityIds))
    : null;

  let filtered = entities;
  if (excludedSet) {
    const unexcluded = filtered.filter((e) => !excludedSet.has(e.id));
    if (unexcluded.length > 0) {
      filtered = unexcluded;
    }
  }

  if (options.domain_id) {
    filtered = filtered.filter((e) => e.domain_id === options.domain_id);
  }
  if (options.subtopic_id) {
    filtered = filtered.filter((e) => e.subtopic_id === options.subtopic_id);
  }
  if (options.difficulty !== undefined) {
    filtered = filtered.filter((e) => e.difficulty === options.difficulty);
  }

  return filtered;
}

/**
 * Manual Diversity Mode: Filters entities by user criteria and prioritizes combinations
 * with the fewest existing variants (Least-Variant-First priority queue).
 */
export function selectManualCandidates(
  questions: BankQuestion[],
  options: SelectManualCandidatesOptions,
): MatrixComboCandidate[] {
  const targetCount = Math.max(1, options.count);
  const entities = options.entities || loadAllKnowledgeEntities({ baseDir: options.baseDir });
  const coverageMap = options.coverageMap || buildMatrixCoverageMap(questions);

  const filtered = filterManualEntities(entities, options);
  const candidateArchetypes =
    options.archetype_ids && options.archetype_ids.length > 0 ? options.archetype_ids : ALL_MATRIX_ARCHETYPES;

  const entityMap = new Map<string, KnowledgeEntity>(filtered.map((e) => [e.id, e]));
  const candidates: MatrixComboCandidate[] = [];

  for (const entity of filtered) {
    for (const arch of candidateArchetypes) {
      const key = `${arch}:${entity.id}`;
      const count = coverageMap.get(key) || 0;

      candidates.push({
        entity_id: entity.id,
        archetype_id: arch,
        domain_id: entity.domain_id,
        subtopic_id: entity.subtopic_id,
        entity_name: entity.name,
        current_variants: count,
      });
    }
  }

  // Enhanced Least-Variant-First sort:
  // 1. Lowest current_variants count
  // 2. Subtopic priority: iconic_franchises has high priority when selecting for broad or general topics
  // 3. Entity difficulty: Tier 1 household icons (difficulty: 1) before difficulty: 2
  // 4. Deterministic tie breaking: entity_id, then archetype_id
  candidates.sort((a, b) => {
    if (a.current_variants !== b.current_variants) {
      return a.current_variants - b.current_variants;
    }

    const aIconic = a.subtopic_id === "iconic_franchises" ? 0 : 1;
    const bIconic = b.subtopic_id === "iconic_franchises" ? 0 : 1;
    if (aIconic !== bIconic) return aIconic - bIconic;

    const entA = entityMap.get(a.entity_id);
    const entB = entityMap.get(b.entity_id);
    const aDiff = entA?.difficulty ?? 2;
    const bDiff = entB?.difficulty ?? 2;
    if (aDiff !== bDiff) return aDiff - bDiff;

    if (a.entity_id !== b.entity_id) {
      return a.entity_id.localeCompare(b.entity_id);
    }
    return a.archetype_id.localeCompare(b.archetype_id);
  });

  return candidates.slice(0, targetCount);
}

export const selectMatrixCandidatesManual = selectManualCandidates;
