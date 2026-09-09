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
      JSON.stringify({ schema_version: 2, target_total: 20000, current_total: 1, by_archetype: { speed_blitz: 1 }, by_domain: { science: 1 } }),
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
    await expect(readSubtopicBatch.call(repository, "speed_blitz", "science", "space")).rejects.toMatchObject({ code: "BANK_BATCH_CORRUPT" });
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
});
