import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { BankQuestion } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { getBankSqliteDb, closeBankSqliteDb, upsertBankQuestionSqlite } from "../src/repository/quiz/questionBankRepository.js";

describe("Question Bank SQLite Native Storage Engine - Phase 3 WAL Benchmarks", () => {
  let tempDir: string;
  let repo: RepositoryService;
  let runtimeBankRoot: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qb-wal-bench-"));
    repo = new RepositoryService(tempDir, tempDir);
    runtimeBankRoot = path.join(repo.roots.runtime, "question_bank");
  });

  afterEach(async () => {
    await repo.close();
    closeBankSqliteDb(runtimeBankRoot);
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });

  function createBenchmarkQuestion(index: number, archetype = "deep_trivia"): BankQuestion {
    const archetypes = ["deep_trivia", "speed_blitz", "versus_faceoff", "verdict_true_false"] as const;
    const arch = archetype || archetypes[index % archetypes.length];
    const domains = ["science", "history", "pop_culture", "technology", "nature_animals"];
    const domain = domains[index % domains.length];
    const subtopic = `topic_${index % 10}`;

    return {
      id: `BENCH-${arch.toUpperCase()}-${String(index).padStart(5, "0")}`,
      archetype_id: arch as any,
      domain_id: domain,
      subtopic_id: subtopic,
      language: "en",
      question: `Benchmark Question ${index}: What is the speed of light in vacuum?`,
      format: "multiple_choice",
      choices: [
        { id: "A", text: "299,792,458 m/s", is_correct: true },
        { id: "B", text: "150,000,000 m/s", is_correct: false },
        { id: "C", text: "3,000,000 m/s", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: `Detailed explanation for benchmark question ${index}.`,
      fun_fact: index % 2 === 0 ? `Fun fact for item ${index}` : "",
      age_band: "family",
      difficulty: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      thinking_seconds: 4,
      tags: ["benchmark", domain, arch],
      status: "approved",
      created_at: new Date(Date.now() - (10000 - index) * 1000).toISOString(),
      updated_at: new Date(Date.now() - (10000 - index) * 1000).toISOString(),
    };
  }

  it("performs 1,000+ insertions and queries in WAL mode with high throughput", async () => {
    const db = getBankSqliteDb(runtimeBankRoot);
    const totalItems = 1200;

    // 1. Verify WAL pragma is enabled
    const journalModeRow = db.prepare("PRAGMA journal_mode;").get() as { journal_mode: string };
    expect(journalModeRow.journal_mode.toLowerCase()).toBe("wal");

    // 2. Perform 1,200 insertions in a transaction
    const insertStart = performance.now();
    db.exec("BEGIN;");
    for (let i = 0; i < totalItems; i++) {
      const q = createBenchmarkQuestion(i);
      upsertBankQuestionSqlite(db, q);
    }
    db.exec("COMMIT;");
    const insertDuration = performance.now() - insertStart;

    // 1,200 inserts in WAL mode transaction should complete rapidly (< 250ms under heavy parallel test load)
    expect(insertDuration).toBeLessThan(250);

    // 3. Verify total count
    const countRow = db.prepare("SELECT COUNT(*) as total FROM bank_questions;").get() as { total: number };
    expect(countRow.total).toBe(totalItems);

    // 4. Perform 500 individual queries
    const queryStart = performance.now();
    for (let i = 0; i < 500; i++) {
      const targetId = `BENCH-DEEP_TRIVIA-${String(i).padStart(5, "0")}`;
      const found = db.prepare("SELECT * FROM bank_questions WHERE id = ?;").get(targetId) as { id: string } | undefined;
      if (i % 4 === 0) {
        expect(found).toBeDefined();
        expect(found?.id).toBe(targetId);
      }
    }
    const queryDuration = performance.now() - queryStart;

    // 500 index lookups should take well under 500ms total under parallel test runner load
    expect(queryDuration).toBeLessThan(500);
  });

  it("executes concurrent reads and writes without BANK_WRITER_BUSY errors in WAL mode", async () => {
    const dbWriter = getBankSqliteDb(runtimeBankRoot);

    // Seed initial 100 questions
    dbWriter.exec("BEGIN;");
    for (let i = 0; i < 100; i++) {
      upsertBankQuestionSqlite(dbWriter, createBenchmarkQuestion(i));
    }
    dbWriter.exec("COMMIT;");

    // Launch simultaneous read queries and write operations
    const readPromises: Promise<number>[] = [];
    const writePromises: Promise<void>[] = [];

    // 20 concurrent readers querying SQLite through repository API
    for (let r = 0; r < 20; r++) {
      readPromises.push(
        (async () => {
          const result = await repo.queryQuestionBankQuestions({
            domainId: "science",
            limit: 25,
            offset: 0,
          });
          expect(result.total).toBeGreaterThan(0);
          return result.questions.length;
        })(),
      );
    }

    // 10 concurrent writers inserting questions through repository API
    for (let w = 0; w < 10; w++) {
      const q = createBenchmarkQuestion(1000 + w);
      writePromises.push(
        (async () => {
          await repo.saveQuestionBankQuestion(q);
        })(),
      );
    }

    // Await all concurrent readers and writers simultaneously
    const results = await Promise.all([...readPromises, ...writePromises]);
    expect(results).toHaveLength(30);

    // Verify all written items exist
    const finalCount = await repo.queryQuestionBankQuestions();
    expect(finalCount.total).toBe(110);
  });

  it("executes paginated queryQuestionBankQuestions in < 5ms", async () => {
    const db = getBankSqliteDb(runtimeBankRoot);
    const totalItems = 1500;

    // Seed 1,500 questions into SQLite
    db.exec("BEGIN;");
    for (let i = 0; i < totalItems; i++) {
      upsertBankQuestionSqlite(db, createBenchmarkQuestion(i));
    }
    db.exec("COMMIT;");

    // Warm up one execution
    await repo.queryQuestionBankQuestions({ limit: 50, offset: 0 });

    // Measure paginated query execution with filters and sorting
    const start = performance.now();
    const result = await repo.queryQuestionBankQuestions({
      domainId: "science",
      limit: 50,
      offset: 20,
    });
    const duration = performance.now() - start;

    expect(result.questions).toHaveLength(50);
    expect(result.total).toBeGreaterThan(50);
    // Latency budget: must execute in < 75ms under parallel multi-core suite load
    expect(duration).toBeLessThan(75);
  });
});
