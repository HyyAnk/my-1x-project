import type { BankGameplayArchetypeId, BankIndex, BankQuestion, MatrixCoverageStats } from "@studio/shared";
import { ALL_MATRIX_ARCHETYPES } from "./matrixCoverageCalculator.js";
import { loadAllKnowledgeEntities, type KnowledgeEntity } from "../knowledgeBaseLoader.js";
import type {
  IMatrixCoverageCache,
  MatrixArchetypeAccumulator,
  MatrixCoverageCacheOptions,
  MatrixDomainAccumulator,
  QuestionMutationMeta,
  SqliteAggregationRow,
} from "./matrixCoverageCache.types.js";

/**
 * In-memory aggregation cache providing instantaneous (< 1ms) responses to
 * Question Bank stats and matrix coverage queries with O(1) atomic updates.
 */
export class MatrixCoverageCache implements IMatrixCoverageCache {
  private warmed = false;
  private currentTotal = 0;
  private targetTotal = 20000;
  private readonly byArchetype: Record<string, number> = {};
  private readonly byDomain: Record<string, number> = {};
  private readonly comboMap = new Map<string, number>();

  private readonly entityDomainMap = new Map<string, string>();
  private readonly domainAggregators = new Map<string, MatrixDomainAccumulator>();
  private readonly archetypeAggregators = new Map<string, MatrixArchetypeAccumulator>();

  private totalCombos = 0;
  private coveredCombos = 0;
  private totalVariants = 0;
  private coveragePercent = 0;
  private updatedAt = new Date().toISOString();

  constructor(options?: MatrixCoverageCacheOptions) {
    if (options?.targetTotal && options.targetTotal >= 20000) {
      this.targetTotal = options.targetTotal;
    }
    this.initializeEntities(options?.entities || loadAllKnowledgeEntities({ baseDir: options?.baseDir }));
  }

  private initializeEntities(entities: KnowledgeEntity[]): void {
    this.entityDomainMap.clear();
    this.domainAggregators.clear();
    this.archetypeAggregators.clear();

    const totalEntities = entities.length;
    this.totalCombos = totalEntities * ALL_MATRIX_ARCHETYPES.length;

    for (const ent of entities) {
      this.entityDomainMap.set(ent.id, ent.domain_id);
      if (!this.domainAggregators.has(ent.domain_id)) {
        this.domainAggregators.set(ent.domain_id, {
          total_entities: 0,
          total_combos: 0,
          covered_combos: 0,
          total_variants: 0,
          coverage_percent: 0,
        });
      }
      const dom = this.domainAggregators.get(ent.domain_id)!;
      dom.total_entities += 1;
      dom.total_combos += ALL_MATRIX_ARCHETYPES.length;
      this.byDomain[ent.domain_id] = 0;
    }

    for (const arch of ALL_MATRIX_ARCHETYPES) {
      this.archetypeAggregators.set(arch, {
        total_combos: totalEntities,
        covered_combos: 0,
        total_variants: 0,
        coverage_percent: 0,
      });
      this.byArchetype[arch] = 0;
    }
    this.byArchetype.verdict_fact_myth = 0;
  }

  public isWarmed(): boolean {
    return this.warmed;
  }

  public warmUpFromSqlite(rows: SqliteAggregationRow[], targetTotal?: number): void {
    this.resetState(targetTotal);

    for (const row of rows) {
      const count = Number(row.count || 0);
      if (count <= 0) continue;

      const arch = row.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : row.archetype_id;
      this.currentTotal += count;
      this.byArchetype[arch] = (this.byArchetype[arch] || 0) + count;
      if (arch === "verdict_true_false") {
        this.byArchetype.verdict_fact_myth = (this.byArchetype.verdict_fact_myth || 0) + count;
      }
      this.byDomain[row.domain_id] = (this.byDomain[row.domain_id] || 0) + count;

      if (row.entity_id) {
        const key = `${arch}:${row.entity_id}`;
        this.comboMap.set(key, count);

        const entityDomain = this.entityDomainMap.get(row.entity_id);
        if (entityDomain) {
          this.coveredCombos += 1;
          this.totalVariants += count;

          const domAgg = this.domainAggregators.get(entityDomain);
          if (domAgg) {
            domAgg.covered_combos += 1;
            domAgg.total_variants += count;
          }

          const archAgg = this.archetypeAggregators.get(arch);
          if (archAgg) {
            archAgg.covered_combos += 1;
            archAgg.total_variants += count;
          }
        }
      }
    }

    this.recalculateAllPercentages();
    this.warmed = true;
    this.updatedAt = new Date().toISOString();
  }

  public getStats(): BankIndex {
    const byArch: Record<string, number> = {};
    for (const [key, count] of Object.entries(this.byArchetype)) {
      if (count > 0) {
        byArch[key] = count;
      }
    }
    const byDom: Record<string, number> = {};
    for (const [key, count] of Object.entries(this.byDomain)) {
      if (count > 0) {
        byDom[key] = count;
      }
    }
    return {
      schema_version: 2,
      target_total: this.targetTotal,
      current_total: this.currentTotal,
      by_archetype: byArch,
      by_domain: byDom,
      updated_at: this.updatedAt,
    };
  }

  public getMatrixCoverage(): MatrixCoverageStats {
    const byDomain: MatrixCoverageStats["by_domain"] = {};
    for (const [domId, agg] of this.domainAggregators.entries()) {
      byDomain[domId] = {
        total_entities: agg.total_entities,
        total_combos: agg.total_combos,
        covered_combos: agg.covered_combos,
        total_variants: agg.total_variants,
        coverage_percent: agg.coverage_percent,
      };
    }

    const byArchetype: MatrixCoverageStats["by_archetype"] = {};
    for (const [archId, agg] of this.archetypeAggregators.entries()) {
      byArchetype[archId] = {
        total_combos: agg.total_combos,
        covered_combos: agg.covered_combos,
        total_variants: agg.total_variants,
        coverage_percent: agg.coverage_percent,
      };
    }

    return {
      total_combos: this.totalCombos,
      covered_combos: this.coveredCombos,
      total_variants: this.totalVariants,
      coverage_percent: this.coveragePercent,
      by_domain: byDomain,
      by_archetype: byArchetype,
      updated_at: this.updatedAt,
    };
  }

  public getComboVariantCount(archetypeId: BankGameplayArchetypeId | string, entityId: string): number {
    const arch = archetypeId === "verdict_fact_myth" ? "verdict_true_false" : archetypeId;
    return this.comboMap.get(`${arch}:${entityId}`) || 0;
  }

  public getComboMap(): ReadonlyMap<string, number> {
    return this.comboMap;
  }

  public onQuestionSaved(question: BankQuestion, previousMeta?: QuestionMutationMeta | null): void {
    if (previousMeta) {
      this.applyDelta(previousMeta, -1);
    }
    this.applyDelta(
      {
        archetype_id: question.archetype_id,
        domain_id: question.domain_id,
        entity_id: question.entity_id,
        status: question.status,
      },
      1,
    );
    this.updatedAt = new Date().toISOString();
  }

  public onQuestionDeleted(_questionId: string, meta: QuestionMutationMeta): void {
    this.applyDelta(meta, -1);
    this.updatedAt = new Date().toISOString();
  }

  public onBankCleared(): void {
    this.resetState();
    this.updatedAt = new Date().toISOString();
  }

  public reset(): void {
    this.resetState();
    this.warmed = false;
    this.updatedAt = new Date().toISOString();
  }

  private applyDelta(meta: QuestionMutationMeta, sign: 1 | -1): void {
    if (meta.status && meta.status !== "approved") return;

    const arch = meta.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : meta.archetype_id;
    this.currentTotal = Math.max(0, this.currentTotal + sign);

    this.byArchetype[arch] = Math.max(0, (this.byArchetype[arch] || 0) + sign);
    if (arch === "verdict_true_false") {
      this.byArchetype.verdict_fact_myth = Math.max(0, (this.byArchetype.verdict_fact_myth || 0) + sign);
    }

    this.byDomain[meta.domain_id] = Math.max(0, (this.byDomain[meta.domain_id] || 0) + sign);

    if (meta.entity_id) {
      const key = `${arch}:${meta.entity_id}`;
      const oldCount = this.comboMap.get(key) || 0;
      const newCount = Math.max(0, oldCount + sign);

      if (newCount === 0) {
        this.comboMap.delete(key);
      } else {
        this.comboMap.set(key, newCount);
      }

      const entityDomain = this.entityDomainMap.get(meta.entity_id);
      if (entityDomain) {
        const domAgg = this.domainAggregators.get(entityDomain);
        const archAgg = this.archetypeAggregators.get(arch);

        this.totalVariants = Math.max(0, this.totalVariants + sign);
        if (domAgg) domAgg.total_variants = Math.max(0, domAgg.total_variants + sign);
        if (archAgg) archAgg.total_variants = Math.max(0, archAgg.total_variants + sign);

        if (oldCount === 0 && newCount > 0) {
          this.coveredCombos += 1;
          if (domAgg) domAgg.covered_combos += 1;
          if (archAgg) archAgg.covered_combos += 1;
        } else if (oldCount > 0 && newCount === 0) {
          this.coveredCombos = Math.max(0, this.coveredCombos - 1);
          if (domAgg) domAgg.covered_combos = Math.max(0, domAgg.covered_combos - 1);
          if (archAgg) archAgg.covered_combos = Math.max(0, archAgg.covered_combos - 1);
        }

        if (domAgg) {
          domAgg.coverage_percent = domAgg.total_combos > 0 ? Number(((domAgg.covered_combos / domAgg.total_combos) * 100).toFixed(1)) : 0;
        }
        if (archAgg) {
          archAgg.coverage_percent = archAgg.total_combos > 0 ? Number(((archAgg.covered_combos / archAgg.total_combos) * 100).toFixed(1)) : 0;
        }
        this.coveragePercent = this.totalCombos > 0 ? Number(((this.coveredCombos / this.totalCombos) * 100).toFixed(1)) : 0;
      }
    }
  }

  private recalculateAllPercentages(): void {
    this.coveragePercent = this.totalCombos > 0 ? Number(((this.coveredCombos / this.totalCombos) * 100).toFixed(1)) : 0;

    for (const agg of this.domainAggregators.values()) {
      agg.coverage_percent = agg.total_combos > 0 ? Number(((agg.covered_combos / agg.total_combos) * 100).toFixed(1)) : 0;
    }

    for (const agg of this.archetypeAggregators.values()) {
      agg.coverage_percent = agg.total_combos > 0 ? Number(((agg.covered_combos / agg.total_combos) * 100).toFixed(1)) : 0;
    }
  }

  private resetState(targetTotal?: number): void {
    this.currentTotal = 0;
    if (targetTotal && targetTotal >= 20000) {
      this.targetTotal = targetTotal;
    }
    this.comboMap.clear();

    for (const key of Object.keys(this.byArchetype)) {
      this.byArchetype[key] = 0;
    }
    for (const key of Object.keys(this.byDomain)) {
      this.byDomain[key] = 0;
    }

    this.coveredCombos = 0;
    this.totalVariants = 0;
    this.coveragePercent = 0;

    for (const agg of this.domainAggregators.values()) {
      agg.covered_combos = 0;
      agg.total_variants = 0;
      agg.coverage_percent = 0;
    }

    for (const agg of this.archetypeAggregators.values()) {
      agg.covered_combos = 0;
      agg.total_variants = 0;
      agg.coverage_percent = 0;
    }
  }
}

/**
 * Scoped cache registry per runtime bank directory.
 */
const cacheRegistry = new Map<string, MatrixCoverageCache>();

export function getMatrixCoverageCache(runtimeBankRoot?: string, options?: MatrixCoverageCacheOptions): MatrixCoverageCache {
  const key = runtimeBankRoot || "default";
  let cache = cacheRegistry.get(key);
  if (!cache) {
    cache = new MatrixCoverageCache(options);
    cacheRegistry.set(key, cache);
  }
  return cache;
}

export function resetMatrixCoverageCache(runtimeBankRoot?: string): void {
  const key = runtimeBankRoot || "default";
  const cache = cacheRegistry.get(key);
  if (cache) {
    cache.reset();
  }
  cacheRegistry.delete(key);
}

export function resetAllMatrixCoverageCaches(): void {
  for (const cache of cacheRegistry.values()) {
    cache.reset();
  }
  cacheRegistry.clear();
}
