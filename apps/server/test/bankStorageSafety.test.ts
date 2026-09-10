import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BankSubtopicBatchSchema, type BankQuestion, type BankSubtopicBatch } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { readQuestionBankIndex } from "../src/repository/quiz/bank/bankIndexManager.js";
import { readSubtopicBatch, writeSubtopicBatch } from "../src/repository/quiz/bank/bankBatchStorage.js";
import { readQuestionBankSnapshot } from "../src/repository/quiz/bank/bankQueryEngine.js";
import {
  applyBankLanguageMigration,
  assertSafeBackupPath,
  assertSafeRelativePath,
  backupBankLanguageMigration,
  previewBankLanguageMigration,
} from "../src/repository/quiz/bank/bankMetadataMigration.js";

describe("Question Bank storage safety", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  function question(overrides: Partial<BankQuestion> = {}): BankQuestion {
    return {
      id: "Q-1",
      archetype_id: "speed_blitz",
      domain_id: "science",
      subtopic_id: "space",
      language: "en",
      question: "Which planet is known as the Red Planet?",
      format: "multiple_choice",
      choices: [
        { id: "a", text: "Mars", is_correct: true },
        { id: "b", text: "Venus", is_correct: false },
        { id: "c", text: "Earth", is_correct: false },
      ],
      correct_choice_id: "a",
      explanation: "Mars has an iron-rich surface.",
      status: "approved",
      ...overrides,
    };
  }

  function batch(overrides: Partial<BankSubtopicBatch> = {}): BankSubtopicBatch {
    return BankSubtopicBatchSchema.parse({
      schema_version: 2,
      archetype_id: "speed_blitz",
      domain_id: "science",
      subtopic_id: "space",
      subtopic_title: "Space",
      questions: [question()],
      ...overrides,
    });
  }

  async function repositoryWithBank(): Promise<{ root: string; bankRoot: string; repository: RepositoryService }> {
    const root = await mkdtemp(path.join(os.tmpdir(), "bank-storage-safety-"));
    tempRoots.push(root);
    const bankRoot = path.join(root, ".quiz-studio", "question_bank");
    await mkdir(path.join(bankRoot, "speed_blitz", "science"), { recursive: true });
    await writeFile(path.join(root, ".quiz-studio", "storage.local.json"), JSON.stringify({ storage_path: root }), "utf8");
    await writeFile(
      path.join(bankRoot, "index.json"),
      JSON.stringify({
        schema_version: 2,
        target_total: 20000,
        current_total: 1,
        by_archetype: { speed_blitz: 1 },
        by_domain: { science: 1 },
      }),
      "utf8",
    );
    await writeFile(path.join(bankRoot, "speed_blitz", "science", "space.json"), JSON.stringify(batch()), "utf8");
    return { root, bankRoot, repository: new RepositoryService(root, root) };
  }

  it("rejects traversal identifiers before reading or writing outside the Bank root", async () => {
    const { repository } = await repositoryWithBank();
    await expect(readSubtopicBatch.call(repository, "speed_blitz", "../outside", "space")).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    const unsafeBatch = { ...batch(), domain_id: "../outside" } as BankSubtopicBatch;
    await expect(writeSubtopicBatch.call(repository, unsafeBatch)).rejects.toThrow(/safe Question Bank path segment/i);
  });

  it("reports malformed direct reads as structured Bank corruption", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    const filePath = path.join(bankRoot, "speed_blitz", "science", "space.json");
    await writeFile(filePath, "{ not json", "utf8");
    await expect(readSubtopicBatch.call(repository, "speed_blitz", "science", "space")).rejects.toMatchObject({
      code: "BANK_BATCH_CORRUPT",
    });
  });

  it("rejects nested questions whose taxonomy does not match the batch path", async () => {
    const { repository } = await repositoryWithBank();
    const unsafeBatch = { ...batch(), questions: [question({ domain_id: "other-domain" })] } as BankSubtopicBatch;
    await expect(writeSubtopicBatch.call(repository, unsafeBatch)).rejects.toMatchObject({ code: "BANK_BATCH_INCONSISTENT" });
  });

  it("does not replace a corrupt batch during question upsert", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    const filePath = path.join(bankRoot, "speed_blitz", "science", "space.json");
    const corruptBytes = "{ corrupt batch\n";
    await writeFile(filePath, corruptBytes, "utf8");
    await expect(repository.saveQuestionBankQuestion(question())).rejects.toMatchObject({ code: "BANK_BATCH_CORRUPT" });
    expect(await readFile(filePath, "utf8")).toBe(corruptBytes);
  });

  it("does not mask a corrupt index as an empty in-memory index", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    await writeFile(path.join(bankRoot, "index.json"), "{ corrupt index", "utf8");
    await expect(readQuestionBankIndex.call(repository)).rejects.toMatchObject({ code: "BANK_INDEX_CORRUPT" });
  });

  it("rejects duplicate question IDs in a bound-source snapshot", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    const secondPath = path.join(bankRoot, "speed_blitz", "science", "second.json");
    await writeFile(secondPath, JSON.stringify(batch({ subtopic_id: "second", questions: [question({ subtopic_id: "second" })] })), "utf8");
    await expect(readQuestionBankSnapshot.call(repository)).rejects.toMatchObject({ code: "BANK_DUPLICATE_QUESTION_ID" });
  });

  it("rejects migration manifest paths that escape their declared roots", async () => {
    const { bankRoot } = await repositoryWithBank();
    expect(() => assertSafeRelativePath("../escape.json", bankRoot)).toThrow(/unsafe/i);
    expect(() => assertSafeRelativePath("C:/escape.json", bankRoot)).toThrow(/unsafe/i);
    expect(() => assertSafeBackupPath(path.join(bankRoot, "..", "escape.json"), bankRoot, "migration")).toThrow(/unsafe|escaped/i);
  });

  it("rolls back already-written migration files when a later write fails", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    const firstPath = path.join(bankRoot, "speed_blitz", "science", "a.json");
    const secondPath = path.join(bankRoot, "speed_blitz", "science", "b.json");
    const firstQuestion = question({ id: "A" });
    const secondQuestion = question({ id: "B" });
    delete (firstQuestion as Partial<BankQuestion>).language;
    delete (secondQuestion as Partial<BankQuestion>).language;
    await writeFile(firstPath, JSON.stringify(batch({ subtopic_id: "a", questions: [firstQuestion] })), "utf8");
    await writeFile(secondPath, JSON.stringify(batch({ subtopic_id: "b", questions: [secondQuestion] })), "utf8");
    const preview = await previewBankLanguageMigration(repository, { migrationId: "atomic-apply" });
    const backup = await backupBankLanguageMigration(repository, preview);
    const firstBefore = await readFile(firstPath, "utf8");
    const originalWrite = repository.writeBinaryAtomic.bind(repository);
    repository.writeBinaryAtomic = async (target, content) => {
      if (target === secondPath) throw new Error("simulated second write failure");
      await originalWrite(target, content);
    };
    await expect(applyBankLanguageMigration(repository, backup.manifest)).rejects.toThrow(/simulated second write failure/);
    expect(await readFile(firstPath, "utf8")).toBe(firstBefore);
  });

  it("rejects an external index symlink before reading or writing external bytes", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    const externalDir = await mkdtemp(path.join(os.tmpdir(), "bank-external-"));
    tempRoots.push(externalDir);
    const externalIndexPath = path.join(externalDir, "external-index.json");
    const externalBytes = JSON.stringify({ external: "do-not-touch" });
    await writeFile(externalIndexPath, externalBytes, "utf8");

    const indexPath = path.join(bankRoot, "index.json");
    await rm(indexPath);
    await (await import("node:fs/promises")).symlink(externalIndexPath, indexPath, "file");

    await expect(readQuestionBankIndex.call(repository)).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    expect(await readFile(externalIndexPath, "utf8")).toBe(externalBytes);

    await expect(repository.recalculateQuestionBankIndex()).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    expect(await readFile(externalIndexPath, "utf8")).toBe(externalBytes);
  });

  it("rejects a Bank junction ancestor before reading or recalculating index", async () => {
    const { bankRoot, repository } = await repositoryWithBank();
    const externalBankDir = await mkdtemp(path.join(os.tmpdir(), "bank-junction-external-"));
    tempRoots.push(externalBankDir);
    const externalIndexPath = path.join(externalBankDir, "index.json");
    const externalBytes = JSON.stringify({ schema_version: 2, current_total: 999 });
    await writeFile(externalIndexPath, externalBytes, "utf8");

    // Replace bankRoot with a junction pointing to externalBankDir
    await rm(bankRoot, { recursive: true, force: true });
    await (await import("node:fs/promises")).symlink(externalBankDir, bankRoot, "junction");

    await expect(readQuestionBankIndex.call(repository)).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    await expect(repository.recalculateQuestionBankIndex()).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    expect(await readFile(externalIndexPath, "utf8")).toBe(externalBytes);
  });

  it("deletes a runtime question when runtime is redirected without mutating project duplicate or throwing UNSAFE_PATH", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "bank-project-root-"));
    const runtimeRoot = await mkdtemp(path.join(os.tmpdir(), "bank-runtime-root-"));
    tempRoots.push(projectRoot, runtimeRoot);

    const projectBank = path.join(projectRoot, ".quiz-studio", "question_bank", "speed_blitz", "science");
    const runtimeBank = path.join(runtimeRoot, ".quiz-studio", "question_bank", "speed_blitz", "science");
    await mkdir(projectBank, { recursive: true });
    await mkdir(runtimeBank, { recursive: true });

    const qProject = question({ id: "Q-1", question: "Stale project question" });
    const qRuntime = question({ id: "Q-1", question: "Active runtime question" });

    const projectBatchBytes = JSON.stringify(batch({ questions: [qProject] }));
    await writeFile(path.join(projectBank, "space.json"), projectBatchBytes, "utf8");
    await writeFile(
      path.join(projectRoot, ".quiz-studio", "question_bank", "index.json"),
      JSON.stringify({ schema_version: 2, current_total: 1 }),
      "utf8",
    );

    await writeFile(path.join(runtimeBank, "space.json"), JSON.stringify(batch({ questions: [qRuntime] })), "utf8");
    await writeFile(
      path.join(runtimeRoot, ".quiz-studio", "question_bank", "index.json"),
      JSON.stringify({ schema_version: 2, current_total: 1 }),
      "utf8",
    );

    const repo = new RepositoryService(projectRoot, runtimeRoot);
    // Deleting Q-1 should succeed and modify ONLY runtime, not touch project copy
    const deleted = await repo.deleteQuestionBankQuestion("Q-1");
    expect(deleted).toBe(true);

    // Verify project copy was NOT touched
    expect(await readFile(path.join(projectBank, "space.json"), "utf8")).toBe(projectBatchBytes);
    // Verify runtime copy has 0 questions
    const runtimeBatch = JSON.parse(await readFile(path.join(runtimeBank, "space.json"), "utf8")) as BankSubtopicBatch;
    expect(runtimeBatch.questions).toHaveLength(0);
  });

  it("rolls back batch file mutation if index recalculation fails during delete", async () => {
    const { repository, bankRoot } = await repositoryWithBank();
    const batchPath = path.join(bankRoot, "speed_blitz", "science", "space.json");
    const originalBatchBytes = await readFile(batchPath, "utf8");
    const indexPath = path.join(bankRoot, "index.json");
    const originalIndexBytes = await readFile(indexPath, "utf8");

    const originalWrite = repository.writeJsonAtomic.bind(repository);
    repository.writeJsonAtomic = async (target, content) => {
      if (target.endsWith("index.json")) {
        throw new Error("simulated index write failure during delete");
      }
      return originalWrite(target, content);
    };

    await expect(repository.deleteQuestionBankQuestion("Q-1")).rejects.toThrow(/simulated index write failure/);
    expect(await readFile(batchPath, "utf8")).toBe(originalBatchBytes);
    expect(await readFile(indexPath, "utf8")).toBe(originalIndexBytes);
  });
});
