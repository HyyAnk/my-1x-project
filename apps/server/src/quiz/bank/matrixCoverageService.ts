import type {
  BankGameplayArchetypeId,
  BankQuestion,
  MatrixComboCandidate,
  MatrixCoverageStats,
} from "@studio/shared";
import {
  loadAllKnowledgeEntities,
  type KnowledgeEntity,
} from "./knowledgeBaseLoader.js";

export const ALL_MATRIX_ARCHETYPES: readonly BankGameplayArchetypeId[] = [
  "verdict_fact_myth",
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

export interface SelectAutoCandidatesOptions extends MatrixCoverageServiceOptions {
  count: number;
  domain_id?: string;
  archetype_ids?: BankGameplayArchetypeId[];
}

export interface SelectManualCandidatesOptions extends MatrixCoverageServiceOptions {
  count: number;
  domain_id?: string;
  subtopic_id?: string;
  archetype_ids?: BankGameplayArchetypeId[];
  difficulty?: number;
}

/**
 * Builds a fast lookup map of (archetype_id + entity_id) -> variant count from existing bank questions.
 */
export function buildMatrixCoverageMap(questions: BankQuestion[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const q of questions) {
    if (q.entity_id && q.archetype_id) {
      const key = `${q.archetype_id}:${q.entity_id}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return map;
}

/**
 * Calculates comprehensive coverage statistics across the 2,500 entity x 8 archetype matrix (20,000 total combos).
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

/**
 * Auto Mode: Selects a cohesive chunk (batch) anchored to exactly ONE Domain and ONE Archetype,
 * picking up to `count` distinct entities within that domain.
 *
 * Algorithm:
 * 1. Evaluates all candidate (Domain, Archetype) pairs.
 * 2. Selects the optimal pair using Balanced Round-Robin:
 *    - Prioritizes pairs with unfilled matrix cells (variant_count == 0).
 *    - Prioritizes pairs with the fewest total existing variants.
 *    - Balances across domains and archetypes so consecutive batches cycle through diverse topics and gameplays.
 * 3. Within the selected (Domain, Archetype):
 *    - Gathers all entities in that domain.
 *    - Partitions entities into:
 *      a) Unfilled entities (variant_count == 0 for this archetype)
 *      b) Populated entities (variant_count > 0), sorted ascending by variant_count (least-variant-first)
 *    - Takes up to `count` distinct entities:
 *      - Fills with unfilled entities first.
 *      - If unfilled count < targetCount, backfills remaining slots from populated entities (least-variant-first).
 * 4. Ensures all entities in the returned batch are 100% unique.
 */
export function selectAutoCandidates(
  questions: BankQuestion[],
  options: SelectAutoCandidatesOptions,
): MatrixComboCandidate[] {
  const targetCount = Math.max(1, options.count);
  const entities = options.entities || loadAllKnowledgeEntities({ baseDir: options.baseDir });
  const coverageMap = buildMatrixCoverageMap(questions);

  // Group entities by domain
  const entitiesByDomain = new Map<string, KnowledgeEntity[]>();
  for (const e of entities) {
    const list = entitiesByDomain.get(e.domain_id) || [];
    list.push(e);
    entitiesByDomain.set(e.domain_id, list);
  }

  const candidateDomains = options.domain_id
    ? [options.domain_id]
    : Array.from(entitiesByDomain.keys()).sort();

  const candidateArchetypes =
    options.archetype_ids && options.archetype_ids.length > 0
      ? options.archetype_ids
      : ALL_MATRIX_ARCHETYPES;

  // Calculate totals per domain and per archetype for global balancing
  const domainVariantTotals = new Map<string, number>();
  const archVariantTotals = new Map<string, number>();
  const entityVariantTotals = new Map<string, number>();

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

  interface DomainArchEvaluation {
    domainId: string;
    archetypeId: BankGameplayArchetypeId;
    unfilledEntities: KnowledgeEntity[];
    populatedEntities: Array<{ entity: KnowledgeEntity; variants: number }>;
    pairVariants: number;
    domainTotalVariants: number;
    archTotalVariants: number;
    domainIndex: number;
    archIndex: number;
    allDomainEntities: KnowledgeEntity[];
  }

  const evaluations: DomainArchEvaluation[] = [];

  for (let dIdx = 0; dIdx < candidateDomains.length; dIdx++) {
    const domainId = candidateDomains[dIdx];
    const domEntities = entitiesByDomain.get(domainId) || [];
    if (domEntities.length === 0) continue;

    for (let aIdx = 0; aIdx < candidateArchetypes.length; aIdx++) {
      const archId = candidateArchetypes[aIdx];

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

      unfilled.sort((a, b) => {
        const aTotal = entityVariantTotals.get(a.id) || 0;
        const bTotal = entityVariantTotals.get(b.id) || 0;
        if (aTotal !== bTotal) return aTotal - bTotal;
        return a.id.localeCompare(b.id);
      });

      populated.sort((a, b) => {
        if (a.variants !== b.variants) return a.variants - b.variants;
        const aTotal = entityVariantTotals.get(a.entity.id) || 0;
        const bTotal = entityVariantTotals.get(b.entity.id) || 0;
        if (aTotal !== bTotal) return aTotal - bTotal;
        return a.entity.id.localeCompare(b.entity.id);
      });

      evaluations.push({
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
      });
    }
  }

  if (evaluations.length === 0) {
    return [];
  }

  // Balanced Round-Robin sorting:
  // 1. Pairs with unfilled combos come before fully covered pairs
  // 2. Lowest total pair variants (least questions generated for this specific domain+archetype)
  // 3. Lowest domain total variants (rotates away from recently generated domains)
  // 4. Lowest archetype total variants (rotates away from recently generated archetypes)
  // 5. Diagonal tie-breaker (domainIndex + archIndex) to ensure smooth interleaving across both axes
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

    const maxDim = Math.max(candidateDomains.length, candidateArchetypes.length);
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

  const best = evaluations[0];
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
  // for entities with the lowest existing variant counts until targetCount is met
  if (selectedEntities.length < targetCount && best.allDomainEntities.length > 0) {
    const candidatesPool = [...best.allDomainEntities].sort((a, b) => {
      const vA = coverageMap.get(`${best.archetypeId}:${a.id}`) || 0;
      const vB = coverageMap.get(`${best.archetypeId}:${b.id}`) || 0;
      if (vA !== vB) return vA - vB;
      return a.id.localeCompare(b.id);
    });
    let poolIndex = 0;
    while (selectedEntities.length < targetCount && candidatesPool.length > 0) {
      const ent = candidatesPool[poolIndex % candidatesPool.length];
      const count = coverageMap.get(`${best.archetypeId}:${ent.id}`) || 0;
      selectedEntities.push({ entity: ent, variants: count });
      poolIndex++;
    }
  }

  return selectedEntities.map(({ entity, variants }) => ({
    entity_id: entity.id,
    archetype_id: best.archetypeId,
    domain_id: best.domainId,
    subtopic_id: entity.subtopic_id,
    entity_name: entity.name,
    current_variants: variants,
  }));
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
  const coverageMap = buildMatrixCoverageMap(questions);

  let filtered = entities;
  if (options.domain_id) {
    filtered = filtered.filter((e) => e.domain_id === options.domain_id);
  }
  if (options.subtopic_id) {
    filtered = filtered.filter((e) => e.subtopic_id === options.subtopic_id);
  }
  if (options.difficulty !== undefined) {
    filtered = filtered.filter((e) => e.difficulty === options.difficulty);
  }

  const candidateArchetypes =
    options.archetype_ids && options.archetype_ids.length > 0
      ? options.archetype_ids
      : ALL_MATRIX_ARCHETYPES;

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

  // Least-Variant-First sort with deterministic tie breaking
  candidates.sort((a, b) => {
    if (a.current_variants !== b.current_variants) {
      return a.current_variants - b.current_variants;
    }
    if (a.entity_id !== b.entity_id) {
      return a.entity_id.localeCompare(b.entity_id);
    }
    return a.archetype_id.localeCompare(b.archetype_id);
  });

  return candidates.slice(0, targetCount);
}

export interface PlannedBatchChunk {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  domainId: string;
  archetypeId: BankGameplayArchetypeId;
  subtopicId?: string;
  candidates: MatrixComboCandidate[];
}

export interface PlanBatchChunksOptions extends MatrixCoverageServiceOptions {
  mode?: "auto" | "manual";
  targetCount: number;
  chunkSize?: number;
  domainId?: string;
  subtopicId?: string;
  subtopicTitle?: string;
  archetypeId?: BankGameplayArchetypeId;
  difficulty?: number;
}

/**
 * Pre-Allocation Matrix Planner: Plans and reserves multi-chunk candidate batches upfront
 * using virtual coverage tracking.
 *
 * Guarantees:
 * 1. Zero entity collisions across all chunks in the planned batch.
 * 2. Balanced multi-dimensional round-robin across domains and archetypes.
 * 3. Thread-safe execution ready for concurrent multi-worker processing.
 */
export function planBatchChunks(
  questions: BankQuestion[],
  options: PlanBatchChunksOptions,
): PlannedBatchChunk[] {
  const targetCount = Math.max(1, options.targetCount);
  const chunkSize = Math.max(1, options.chunkSize || 20);
  const totalChunks = Math.ceil(targetCount / chunkSize);
  const mode = options.mode || "auto";

  // In-memory virtual question state for reservation tracking across chunks
  const virtualQuestions: BankQuestion[] = [...questions];
  const plannedChunks: PlannedBatchChunk[] = [];

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const thisChunkSize = Math.min(chunkSize, targetCount - chunkIdx * chunkSize);
    if (thisChunkSize <= 0) break;

    let candidatesForChunk: MatrixComboCandidate[] = [];

    if (mode === "manual") {
      candidatesForChunk = selectManualCandidates(virtualQuestions, {
        count: thisChunkSize,
        domain_id: options.domainId,
        subtopic_id: options.subtopicId,
        archetype_ids: options.archetypeId ? [options.archetypeId] : undefined,
        difficulty: options.difficulty,
        entities: options.entities,
        baseDir: options.baseDir,
      });
    } else {
      candidatesForChunk = selectAutoCandidates(virtualQuestions, {
        count: thisChunkSize,
        domain_id: options.domainId,
        archetype_ids: options.archetypeId ? [options.archetypeId] : undefined,
        entities: options.entities,
        baseDir: options.baseDir,
      });
    }

    const domainId =
      candidatesForChunk[0]?.domain_id || options.domainId || "general";
    const archetypeId =
      candidatesForChunk[0]?.archetype_id || options.archetypeId || "speed_blitz";
    const subtopicId =
      candidatesForChunk[0]?.subtopic_id || options.subtopicId || "general";

    // Reserve chosen candidates in virtualQuestions so subsequent chunks select distinct entities and rotate domains/archetypes
    const nowIso = new Date().toISOString();
    for (const c of candidatesForChunk) {
      virtualQuestions.push({
        id: `virtual_plan_${chunkIdx}_${c.entity_id}`,
        entity_id: c.entity_id,
        archetype_id: c.archetype_id,
        domain_id: c.domain_id,
        subtopic_id: c.subtopic_id,
        language: "en",
        question: `Virtual reservation for ${c.entity_name}`,
        format: "multiple_choice",
        choices: [
          { id: "c1", text: "Choice 1" },
          { id: "c2", text: "Choice 2" },
        ],
        correct_choice_id: "c1",
        explanation: "Virtual reservation explanation",
        fun_fact: "",
        age_band: "family",
        difficulty: options.difficulty ?? 2,
        tags: [],
        status: "approved",
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    plannedChunks.push({
      chunkIndex: chunkIdx,
      totalChunks,
      chunkSize: thisChunkSize,
      domainId,
      archetypeId,
      subtopicId,
      candidates: candidatesForChunk,
    });
  }

  return plannedChunks;
}

