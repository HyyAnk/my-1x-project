import type { BankGameplayArchetypeId, BankQuestion, MatrixComboCandidate } from "@studio/shared";
import { loadAllKnowledgeEntities, type KnowledgeEntity } from "../../knowledgeBaseLoader.js";
import { ALL_MATRIX_ARCHETYPES, buildMatrixCoverageMap } from "../matrixCoverageCalculator.js";
import { calculateTotals } from "../matrixTotalsCalculator.js";
import type { DomainArchEvaluation, SelectAutoCandidatesOptions } from "../types/matrixPlanner.types.js";

/**
 * Groups knowledge entities by domain, respecting optional exclusion criteria.
 * Falls back to all entities if all available entities were excluded.
 */
function groupEntitiesByDomain(entities: KnowledgeEntity[], excludedSet: Set<string> | null): Map<string, KnowledgeEntity[]> {
  const entitiesByDomain = new Map<string, KnowledgeEntity[]>();
  for (const e of entities) {
    if (excludedSet && excludedSet.has(e.id)) continue;
    const list = entitiesByDomain.get(e.domain_id) || [];
    list.push(e);
    entitiesByDomain.set(e.domain_id, list);
  }

  // Fallback to all entities if all available entities were excluded
  if (entitiesByDomain.size === 0) {
    for (const e of entities) {
      const list = entitiesByDomain.get(e.domain_id) || [];
      list.push(e);
      entitiesByDomain.set(e.domain_id, list);
    }
  }

  return entitiesByDomain;
}

/**
 * Compares two knowledge entities using enhanced priority:
 * 1. Subtopic priority: entities in "iconic_franchises" have high priority
 * 2. Entity difficulty: Tier 1 household icons (difficulty: 1) before difficulty: 2
 * 3. Total variants across all archetypes (when available)
 * 4. Deterministic tie-breaking by entity id
 */
export function compareEntityPriority(a: KnowledgeEntity, b: KnowledgeEntity, entityVariantTotals?: Map<string, number>): number {
  const aIconic = a.subtopic_id === "iconic_franchises" ? 0 : 1;
  const bIconic = b.subtopic_id === "iconic_franchises" ? 0 : 1;
  if (aIconic !== bIconic) return aIconic - bIconic;

  const aDiff = a.difficulty ?? 2;
  const bDiff = b.difficulty ?? 2;
  if (aDiff !== bDiff) return aDiff - bDiff;

  if (entityVariantTotals) {
    const aTotal = entityVariantTotals.get(a.id) || 0;
    const bTotal = entityVariantTotals.get(b.id) || 0;
    if (aTotal !== bTotal) return aTotal - bTotal;
  }

  return a.id.localeCompare(b.id);
}

/**
 * Evaluates unfilled and populated entities for a domain-archetype pair.
 */
function evaluateDomainArchPair(
  domainId: string,
  archId: BankGameplayArchetypeId,
  dIdx: number,
  aIdx: number,
  domEntities: KnowledgeEntity[],
  coverageMap: ReadonlyMap<string, number>,
  domainVariantTotals: Map<string, number>,
  archVariantTotals: Map<string, number>,
  entityVariantTotals: Map<string, number>,
): DomainArchEvaluation {
  const unfilled: KnowledgeEntity[] = [];
  const populated: Array<{ entity: KnowledgeEntity; variants: number }> = [];
  let pairVariants = 0;

  for (const ent of domEntities) {
    const key = `${archId}:${ent.id}`;
    const count = coverageMap.get(key) || 0;
    pairVariants += count;
    if (count === 0) {
      unfilled.push(ent);
    } else {
      populated.push({ entity: ent, variants: count });
    }
  }

  unfilled.sort((a, b) => compareEntityPriority(a, b, entityVariantTotals));

  populated.sort((a, b) => {
    if (a.variants !== b.variants) return a.variants - b.variants;
    return compareEntityPriority(a.entity, b.entity, entityVariantTotals);
  });

  return {
    domainId,
    archetypeId: archId,
    unfilledEntities: unfilled,
    populatedEntities: populated,
    allDomainEntities: domEntities,
    pairVariants,
    domainTotalVariants: domainVariantTotals.get(domainId) || 0,
    archTotalVariants: archVariantTotals.get(archId) || 0,
    domainIndex: dIdx,
    archIndex: aIdx,
  };
}

/**
 * Balanced Round-Robin sorting:
 * 1. Pairs with unfilled combos come before fully covered pairs
 * 2. Lowest total pair variants
 * 3. Lowest domain total variants
 * 4. Lowest archetype total variants
 * 5. Diagonal tie-breaker (domainIndex + archIndex)
 */
function sortEvaluations(evaluations: DomainArchEvaluation[], candidateDomainsLength: number, candidateArchetypesLength: number): void {
  evaluations.sort((a, b) => {
    const aHasUnfilled = a.unfilledEntities.length > 0;
    const bHasUnfilled = b.unfilledEntities.length > 0;
    if (aHasUnfilled !== bHasUnfilled) {
      return aHasUnfilled ? -1 : 1;
    }

    if (a.pairVariants !== b.pairVariants) {
      return a.pairVariants - b.pairVariants;
    }

    if (a.domainTotalVariants !== b.domainTotalVariants) {
      return a.domainTotalVariants - b.domainTotalVariants;
    }

    if (a.archTotalVariants !== b.archTotalVariants) {
      return a.archTotalVariants - b.archTotalVariants;
    }

    const maxDim = Math.max(candidateDomainsLength, candidateArchetypesLength);
    const diagA = (a.domainIndex + a.archIndex) % maxDim;
    const diagB = (b.domainIndex + b.archIndex) % maxDim;
    if (diagA !== diagB) {
      return diagA - diagB;
    }

    if (a.domainIndex !== b.domainIndex) {
      return a.domainIndex - b.domainIndex;
    }

    return a.archIndex - b.archIndex;
  });
}

/**
 * Picks candidates up to targetCount from the best evaluated domain-archetype pair.
 */
function pickSelectedEntities(
  best: DomainArchEvaluation,
  targetCount: number,
  coverageMap: ReadonlyMap<string, number>,
): Array<{ entity: KnowledgeEntity; variants: number }> {
  const selectedEntities: Array<{ entity: KnowledgeEntity; variants: number }> = [];

  // Pick up to targetCount from unfilled
  for (const ent of best.unfilledEntities) {
    if (selectedEntities.length >= targetCount) break;
    selectedEntities.push({ entity: ent, variants: 0 });
  }

  // Backfill if unfilled is fewer than targetCount
  if (selectedEntities.length < targetCount) {
    for (const pop of best.populatedEntities) {
      if (selectedEntities.length >= targetCount) break;
      if (!selectedEntities.some((s) => s.entity.id === pop.entity.id)) {
        selectedEntities.push(pop);
      }
    }
  }

  // If domain entities total is strictly less than targetCount, allow additional variants
  if (selectedEntities.length < targetCount && best.allDomainEntities.length > 0) {
    const candidatesPool = [...best.allDomainEntities].sort((a, b) => {
      const vA = coverageMap.get(`${best.archetypeId}:${a.id}`) || 0;
      const vB = coverageMap.get(`${best.archetypeId}:${b.id}`) || 0;
      if (vA !== vB) return vA - vB;
      return compareEntityPriority(a, b);
    });
    let poolIndex = 0;
    while (selectedEntities.length < targetCount && candidatesPool.length > 0) {
      const ent = candidatesPool[poolIndex % candidatesPool.length];
      const count = coverageMap.get(`${best.archetypeId}:${ent.id}`) || 0;
      selectedEntities.push({ entity: ent, variants: count });
      poolIndex++;
    }
  }

  return selectedEntities;
}

/**
 * Auto Mode: Selects a cohesive chunk (batch) anchored to exactly ONE Domain and ONE Archetype,
 * picking up to `count` distinct entities within that domain.
 */
export function selectAutoCandidates(questions: BankQuestion[], options: SelectAutoCandidatesOptions): MatrixComboCandidate[] {
  const targetCount = Math.max(1, options.count);
  const entities = options.entities || loadAllKnowledgeEntities({ baseDir: options.baseDir });
  const coverageMap = options.coverageMap || buildMatrixCoverageMap(questions);

  const excludedSet = options.excludeEntityIds
    ? options.excludeEntityIds instanceof Set
      ? options.excludeEntityIds
      : new Set(options.excludeEntityIds)
    : null;

  const entitiesByDomain = groupEntitiesByDomain(entities, excludedSet);

  const candidateDomains = options.domain_id ? [options.domain_id] : Array.from(entitiesByDomain.keys()).sort();
  const candidateArchetypes = options.archetype_ids && options.archetype_ids.length > 0 ? options.archetype_ids : ALL_MATRIX_ARCHETYPES;

  const { domainVariantTotals, archVariantTotals, entityVariantTotals } = calculateTotals(questions, coverageMap, entities);

  const evaluations: DomainArchEvaluation[] = [];

  for (let dIdx = 0; dIdx < candidateDomains.length; dIdx++) {
    const domainId = candidateDomains[dIdx];
    const domEntities = entitiesByDomain.get(domainId) || [];
    if (domEntities.length === 0) continue;

    for (let aIdx = 0; aIdx < candidateArchetypes.length; aIdx++) {
      const archId = candidateArchetypes[aIdx];
      evaluations.push(
        evaluateDomainArchPair(
          domainId,
          archId,
          dIdx,
          aIdx,
          domEntities,
          coverageMap,
          domainVariantTotals,
          archVariantTotals,
          entityVariantTotals,
        ),
      );
    }
  }

  if (evaluations.length === 0) {
    return [];
  }

  sortEvaluations(evaluations, candidateDomains.length, candidateArchetypes.length);

  const best = evaluations[0];
  const selectedEntities = pickSelectedEntities(best, targetCount, coverageMap);

  return selectedEntities.map(({ entity, variants }) => ({
    entity_id: entity.id,
    archetype_id: best.archetypeId,
    domain_id: best.domainId,
    subtopic_id: entity.subtopic_id,
    entity_name: entity.name,
    current_variants: variants,
  }));
}

export const selectMatrixCandidatesAuto = selectAutoCandidates;
