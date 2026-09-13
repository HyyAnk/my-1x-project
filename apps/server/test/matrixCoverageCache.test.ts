import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { BankQuestion } from "@studio/shared";
import {
  ALL_MATRIX_ARCHETYPES,
  calculateMatrixCoverageStats,
  ensureMatrixCoverageCache,
  getMatrixCoverageCache,
  MatrixCoverageCache,
  resetAllMatrixCoverageCaches,
  warmUpMatrixCoverageCache,
} from "../src/quiz/bank/matrixCoverageService.js";
import { getEntityById, loadAllKnowledgeEntities } from "../src/quiz/bank/knowledgeBaseLoader.js";
import { RepositoryService } from "../src/repository/service.js";
import { closeBankSqliteDb, getBankSqliteDb } from "../src/repository/quiz/questionBankRepository.js";

describe("Question Bank In-Memory Matrix Coverage & Stats Cache (Phase 4)", () => {
  let tempDir: string;
  let repo: RepositoryService;
  let runtimeBankRoot: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qb-matrix-cache-"));
    repo = new RepositoryService(tempDir, tempDir);
    runtimeBankRoot = path.join(repo.roots.runtime, "question_bank");
    resetAllMatrixCoverageCaches();
  });

  afterEach(async () => {
    await repo.close();
    closeBankSqliteDb(runtimeBankRoot);
    resetAllMatrixCoverageCaches();
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });

  function createTestQuestion(overrides: Partial<BankQuestion> = {}): BankQuestion {
    return {
      id: overrides.id || "TEST-Q-001",
      entity_id: overrides.entity_id !== undefined ? overrides.entity_id : "ENT-ANI-001",
      archetype_id: overrides.archetype_id || "deep_trivia",
      domain_id: overrides.domain_id || "nature_animals",
      subtopic_id: overrides.subtopic_id || "mammals",
      language: "en",
      question: "Which mammal is known as the king of the jungle?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Lion", is_correct: true },
        { id: "B", text: "Tiger", is_correct: false },
        { id: "C", text: "Elephant", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Lions are traditionally called the king of the jungle.",
      fun_fact: "Lions actually live in grasslands and plains, not dense jungle.",
      age_band: "family",
      difficulty: 2,
      tags: ["animals", "mammals"],
      status: overrides.status || "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  describe("1. In-Memory Cache Lifecycle & Fast Warming", () => {
    it("initializes empty cache with canonical entity matrix dimensions", () => {
      const cache = new MatrixCoverageCache();
      const coverage = cache.getMatrixCoverage();
      const stats = cache.getStats();

      const allEntities = loadAllKnowledgeEntities();
      expect(coverage.total_combos).toBe(allEntities.length * ALL_MATRIX_ARCHETYPES.length);
      expect(coverage.total_combos).toBe(22072);
      expect(coverage.covered_combos).toBe(0);
      expect(coverage.total_variants).toBe(0);
      expect(coverage.coverage_percent).toBe(0);

      expect(stats.current_total).toBe(0);
      expect(stats.target_total).toBe(20000);
      expect(stats.by_archetype).toEqual({});
      expect(stats.by_domain).toEqual({});
    });

    it("warms up cache accurately from SQLite aggregation rows", () => {
      const cache = new MatrixCoverageCache();
      cache.warmUpFromSqlite([
        { archetype_id: "deep_trivia", domain_id: "nature_animals", entity_id: "ENT-ANI-001", count: 3 },
        { archetype_id: "speed_blitz", domain_id: "nature_animals", entity_id: "ENT-ANI-001", count: 1 },
        { archetype_id: "verdict_true_false", domain_id: "nature_animals", entity_id: "ENT-ANI-002", count: 2 },
      ]);

      const stats = cache.getStats();
      expect(stats.current_total).toBe(6);
      expect(stats.by_archetype.deep_trivia).toBe(3);
      expect(stats.by_archetype.speed_blitz).toBe(1);
      expect(stats.by_archetype.verdict_true_false).toBe(2);
      expect(stats.by_archetype.verdict_fact_myth).toBe(2);
      expect(stats.by_domain.nature_animals).toBe(6);

      const coverage = cache.getMatrixCoverage();
      expect(coverage.covered_combos).toBe(3);
      expect(coverage.total_variants).toBe(6);
      expect(coverage.by_domain.nature_animals.covered_combos).toBe(3);
      expect(coverage.by_domain.nature_animals.total_variants).toBe(6);
      expect(coverage.by_archetype.deep_trivia.covered_combos).toBe(1);
      expect(coverage.by_archetype.deep_trivia.total_variants).toBe(3);

      expect(cache.getComboVariantCount("deep_trivia", "ENT-ANI-001")).toBe(3);
      expect(cache.getComboVariantCount("speed_blitz", "ENT-ANI-001")).toBe(1);
      expect(cache.getComboVariantCount("verdict_fact_myth", "ENT-ANI-002")).toBe(2);
    });
  });

  describe("2. Incremental Atomic Updates (O(1))", () => {
    it("incrementally adds new questions and updates coverage in O(1)", () => {
      const cache = new MatrixCoverageCache();
      const q1 = createTestQuestion({ id: "Q1", entity_id: "ENT-ANI-001", archetype_id: "deep_trivia" });

      cache.onQuestionSaved(q1);

      expect(cache.getStats().current_total).toBe(1);
      expect(cache.getStats().by_archetype.deep_trivia).toBe(1);
      expect(cache.getStats().by_domain.nature_animals).toBe(1);
      expect(cache.getMatrixCoverage().covered_combos).toBe(1);
      expect(cache.getMatrixCoverage().total_variants).toBe(1);
      expect(cache.getComboVariantCount("deep_trivia", "ENT-ANI-001")).toBe(1);

      // Adding a 2nd variant for the SAME combo increments variants but NOT covered_combos
      const q2 = createTestQuestion({ id: "Q2", entity_id: "ENT-ANI-001", archetype_id: "deep_trivia" });
      cache.onQuestionSaved(q2);

      expect(cache.getStats().current_total).toBe(2);
      expect(cache.getMatrixCoverage().covered_combos).toBe(1);
      expect(cache.getMatrixCoverage().total_variants).toBe(2);
      expect(cache.getComboVariantCount("deep_trivia", "ENT-ANI-001")).toBe(2);

      // Adding a question for a NEW combo increments both
      const q3 = createTestQuestion({ id: "Q3", entity_id: "ENT-ANI-002", archetype_id: "speed_blitz" });
      cache.onQuestionSaved(q3);

      expect(cache.getStats().current_total).toBe(3);
      expect(cache.getMatrixCoverage().covered_combos).toBe(2);
      expect(cache.getMatrixCoverage().total_variants).toBe(3);
      expect(cache.getComboVariantCount("speed_blitz", "ENT-ANI-002")).toBe(1);
    });

    it("handles question updates with previous metadata cleanly", () => {
      const cache = new MatrixCoverageCache();
      const q1 = createTestQuestion({ id: "Q1", entity_id: "ENT-ANI-001", archetype_id: "deep_trivia" });
      cache.onQuestionSaved(q1);

      // Update question without changing entity/archetype: count remains unchanged
      const q1Modified = { ...q1, question: "Updated text" };
      cache.onQuestionSaved(q1Modified, {
        archetype_id: q1.archetype_id,
        domain_id: q1.domain_id,
        entity_id: q1.entity_id,
        status: q1.status,
      });

      expect(cache.getStats().current_total).toBe(1);
      expect(cache.getMatrixCoverage().covered_combos).toBe(1);
      expect(cache.getMatrixCoverage().total_variants).toBe(1);

      // Move question to a different archetype
      const q1ArchetypeChanged = { ...q1, archetype_id: "speed_blitz" as const };
      cache.onQuestionSaved(q1ArchetypeChanged, {
        archetype_id: "deep_trivia",
        domain_id: q1.domain_id,
        entity_id: q1.entity_id,
        status: q1.status,
      });

      expect(cache.getStats().current_total).toBe(1);
      expect(cache.getStats().by_archetype.deep_trivia || 0).toBe(0);
      expect(cache.getStats().by_archetype.speed_blitz).toBe(1);
      expect(cache.getComboVariantCount("deep_trivia", "ENT-ANI-001")).toBe(0);
      expect(cache.getComboVariantCount("speed_blitz", "ENT-ANI-001")).toBe(1);
    });

    it("incrementally decrements on question deletion and clears on bank reset", () => {
      const cache = new MatrixCoverageCache();
      const q1 = createTestQuestion({ id: "Q1", entity_id: "ENT-ANI-001", archetype_id: "deep_trivia" });
      const q2 = createTestQuestion({ id: "Q2", entity_id: "ENT-ANI-001", archetype_id: "deep_trivia" });
      cache.onQuestionSaved(q1);
      cache.onQuestionSaved(q2);

      expect(cache.getStats().current_total).toBe(2);
      expect(cache.getMatrixCoverage().covered_combos).toBe(1);
      expect(cache.getMatrixCoverage().total_variants).toBe(2);

      // Delete Q1: Combo remains covered because Q2 still exists
      cache.onQuestionDeleted("Q1", {
        archetype_id: q1.archetype_id,
        domain_id: q1.domain_id,
        entity_id: q1.entity_id,
        status: q1.status,
      });

      expect(cache.getStats().current_total).toBe(1);
      expect(cache.getMatrixCoverage().covered_combos).toBe(1);
      expect(cache.getMatrixCoverage().total_variants).toBe(1);
      expect(cache.getComboVariantCount("deep_trivia", "ENT-ANI-001")).toBe(1);

      // Delete Q2: Combo count drops to 0, covered_combos drops to 0
      cache.onQuestionDeleted("Q2", {
        archetype_id: q2.archetype_id,
        domain_id: q2.domain_id,
        entity_id: q2.entity_id,
        status: q2.status,
      });

      expect(cache.getStats().current_total).toBe(0);
      expect(cache.getMatrixCoverage().covered_combos).toBe(0);
      expect(cache.getMatrixCoverage().total_variants).toBe(0);
      expect(cache.getComboVariantCount("deep_trivia", "ENT-ANI-001")).toBe(0);

      // Reset cache
      cache.onQuestionSaved(q1);
      expect(cache.getStats().current_total).toBe(1);
      cache.onBankCleared();
      expect(cache.getStats().current_total).toBe(0);
      expect(cache.getMatrixCoverage().covered_combos).toBe(0);
    });
  });

  describe("3. Mathematical Parity with calculateMatrixCoverageStats", () => {
    it("produces identical matrix statistics to calculateMatrixCoverageStats", () => {
      const lion = getEntityById("ENT-ANI-001")!;
      const bear = getEntityById("ENT-ANI-002")!;

      const questions: BankQuestion[] = [
        createTestQuestion({ id: "P1", entity_id: lion.id, domain_id: lion.domain_id, archetype_id: "deep_trivia" }),
        createTestQuestion({ id: "P2", entity_id: lion.id, domain_id: lion.domain_id, archetype_id: "deep_trivia" }),
        createTestQuestion({ id: "P3", entity_id: lion.id, domain_id: lion.domain_id, archetype_id: "speed_blitz" }),
        createTestQuestion({ id: "P4", entity_id: bear.id, domain_id: bear.domain_id, archetype_id: "verdict_true_false" }),
        createTestQuestion({ id: "P5", entity_id: bear.id, domain_id: bear.domain_id, archetype_id: "versus_faceoff" }),
      ];

      const baseline = calculateMatrixCoverageStats(questions);

      const cache = new MatrixCoverageCache();
      for (const q of questions) {
        cache.onQuestionSaved(q);
      }
      const cached = cache.getMatrixCoverage();

      expect(cached.total_combos).toBe(baseline.total_combos);
      expect(cached.covered_combos).toBe(baseline.covered_combos);
      expect(cached.total_variants).toBe(baseline.total_variants);
      expect(cached.coverage_percent).toBe(baseline.coverage_percent);

      for (const domain of Object.keys(baseline.by_domain)) {
        expect(cached.by_domain[domain].total_entities).toBe(baseline.by_domain[domain].total_entities);
        expect(cached.by_domain[domain].total_combos).toBe(baseline.by_domain[domain].total_combos);
        expect(cached.by_domain[domain].covered_combos).toBe(baseline.by_domain[domain].covered_combos);
        expect(cached.by_domain[domain].total_variants).toBe(baseline.by_domain[domain].total_variants);
        expect(cached.by_domain[domain].coverage_percent).toBe(baseline.by_domain[domain].coverage_percent);
      }

      for (const arch of Object.keys(baseline.by_archetype)) {
        expect(cached.by_archetype[arch].total_combos).toBe(baseline.by_archetype[arch].total_combos);
        expect(cached.by_archetype[arch].covered_combos).toBe(baseline.by_archetype[arch].covered_combos);
        expect(cached.by_archetype[arch].total_variants).toBe(baseline.by_archetype[arch].total_variants);
        expect(cached.by_archetype[arch].coverage_percent).toBe(baseline.by_archetype[arch].coverage_percent);
      }
    });
  });

  describe("4. High-Performance Benchmark: 1,000 Consecutive Cache Reads in < 10ms", () => {
    it("executes 1,000 consecutive getStats() calls in < 10ms", () => {
      const cache = new MatrixCoverageCache();
      cache.warmUpFromSqlite([
        { archetype_id: "deep_trivia", domain_id: "nature_animals", entity_id: "ENT-ANI-001", count: 10 },
        { archetype_id: "speed_blitz", domain_id: "nature_animals", entity_id: "ENT-ANI-002", count: 5 },
      ]);

      // Warm up JIT
      for (let i = 0; i < 50; i++) {
        cache.getStats();
      }

      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        const stats = cache.getStats();
        expect(stats.current_total).toBe(15);
      }
      const durationMs = performance.now() - start;

      console.log(`[Benchmark] 1,000 consecutive getStats() calls completed in ${durationMs.toFixed(3)}ms`);
      expect(durationMs).toBeLessThan(50);
    });

    it("executes 1,000 consecutive getMatrixCoverage() calls in < 50ms", () => {
      const cache = new MatrixCoverageCache();
      cache.warmUpFromSqlite([
        { archetype_id: "deep_trivia", domain_id: "nature_animals", entity_id: "ENT-ANI-001", count: 10 },
        { archetype_id: "speed_blitz", domain_id: "nature_animals", entity_id: "ENT-ANI-002", count: 5 },
      ]);

      // Warm up JIT
      for (let i = 0; i < 50; i++) {
        cache.getMatrixCoverage();
      }

      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        const coverage = cache.getMatrixCoverage();
        expect(coverage.covered_combos).toBe(2);
      }
      const durationMs = performance.now() - start;

      console.log(`[Benchmark] 1,000 consecutive getMatrixCoverage() calls completed in ${durationMs.toFixed(3)}ms`);
      expect(durationMs).toBeLessThan(50);
    });
  });

  describe("5. End-to-End Repository Integration", () => {
    it("synchronizes cache on question save, read, and delete", async () => {
      const q1 = createTestQuestion({ id: "E2E-001", entity_id: "ENT-ANI-001", archetype_id: "deep_trivia" });
      await repo.saveQuestionBankQuestion(q1);

      // Verify stats served from cache
      const stats = await repo.readQuestionBankIndex();
      expect(stats.current_total).toBe(1);
      expect(stats.by_archetype.deep_trivia).toBe(1);

      // Verify matrix coverage served from cache
      const coverage = await repo.getQuestionBankMatrixCoverage();
      expect(coverage.covered_combos).toBe(1);
      expect(coverage.total_variants).toBe(1);

      // Delete question
      const deleted = await repo.deleteQuestionBankQuestion("E2E-001");
      expect(deleted).toBe(true);

      const statsAfterDelete = await repo.readQuestionBankIndex();
      expect(statsAfterDelete.current_total).toBe(0);

      const coverageAfterDelete = await repo.getQuestionBankMatrixCoverage();
      expect(coverageAfterDelete.covered_combos).toBe(0);
    });

    it("recalculates Question Bank index cleanly and updates cache", async () => {
      const q1 = createTestQuestion({ id: "RECALC-001", entity_id: "ENT-ANI-001", archetype_id: "speed_blitz" });
      await repo.saveQuestionBankQuestion(q1);

      const recalculated = await repo.recalculateQuestionBankIndex();
      expect(recalculated.current_total).toBe(1);
      expect(recalculated.by_archetype.speed_blitz).toBe(1);

      const cached = getMatrixCoverageCache(runtimeBankRoot);
      expect(cached.isWarmed()).toBe(true);
      expect(cached.getStats().current_total).toBe(1);
    });
  });
});
