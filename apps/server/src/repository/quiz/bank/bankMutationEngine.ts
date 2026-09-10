import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { BankQuestionSchema, type BankIndex, type BankQuestion, type BankSubtopicBatch } from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankPath, getQuestionBankWritePath } from "./bankPathResolver.js";
import { listQuestionBankBatchesUnlocked, readSubtopicBatchUnlocked } from "./bankBatchStorage.js";
import { recalculateQuestionBankIndexUnlocked } from "./bankIndexManager.js";
import { withBankWrite } from "./bankSerializationBoundary.js";
import { assertEnglishQuestionWrite } from "./bankWritePolicy.js";
import { assertSafeBankFilesystemPath, isInside } from "./bankPathSafety.js";
import { captureFile, captureFiles, restoreFile, restoreFiles } from "./bankFileTransaction.js";

/**
 * Validates, normalizes, and upserts a bank question into its corresponding subtopic batch file.
 */
export async function saveQuestionBankQuestionUnlocked(this: RepositoryRuntime, question: BankQuestion): Promise<BankQuestion> {
  assertEnglishQuestionWrite(question);
  const normalizedQuestion = {
    ...question,
    archetype_id: question.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : question.archetype_id,
  };
  const validated = BankQuestionSchema.parse(normalizedQuestion);
  const batchFilePath = getQuestionBankWritePath.call(this, validated.archetype_id, validated.domain_id, `${validated.subtopic_id}.json`);

  let batch: BankSubtopicBatch = {
    schema_version: 2,
    archetype_id: validated.archetype_id,
    domain_id: validated.domain_id,
    subtopic_id: validated.subtopic_id,
    subtopic_title: validated.subtopic_id.replaceAll("_", " "),
    updated_at: new Date().toISOString(),
    questions: [],
  };

  const existing = await readSubtopicBatchUnlocked.call(this, validated.archetype_id, validated.domain_id, validated.subtopic_id);
  if (existing) batch = existing;

  const existingIndex = batch.questions.findIndex((q) => q.id === validated.id);
  const now = new Date().toISOString();
  const toSave: BankQuestion = {
    ...validated,
    updated_at: now,
    created_at: validated.created_at || now,
  };

  if (existingIndex >= 0) {
    batch.questions[existingIndex] = toSave;
  } else {
    batch.questions.push(toSave);
  }

  batch.updated_at = now;
  const legacyPath =
    validated.archetype_id === "verdict_true_false"
      ? getQuestionBankWritePath.call(this, "verdict_fact_myth", validated.domain_id, `${validated.subtopic_id}.json`)
      : null;
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const containmentRoot = isInside(runtimeBankRoot, batchFilePath) ? this.roots.runtime : defaultProjectRuntime;
  await assertSafeBankFilesystemPath(containmentRoot, batchFilePath);
  if (legacyPath) {
    const legacyContainment = isInside(runtimeBankRoot, legacyPath) ? this.roots.runtime : defaultProjectRuntime;
    await assertSafeBankFilesystemPath(legacyContainment, legacyPath);
  }
  const originalFiles = await captureFiles([batchFilePath, ...(legacyPath && existsSync(legacyPath) ? [legacyPath] : [])]);
  const indexPath = getQuestionBankPath.call(this, "index.json");
  const originalIndex = await captureFile(indexPath);

  try {
    await mkdir(path.dirname(batchFilePath), { recursive: true });
    await this.writeJsonAtomic(batchFilePath, batch);

    if (legacyPath && existsSync(legacyPath)) await this.writeJsonAtomic(legacyPath, batch);

    await recalculateQuestionBankIndexUnlocked.call(this);
  } catch (error) {
    await restoreFiles(this, originalFiles);
    await restoreFile(this, indexPath, originalIndex);
    throw error;
  }
  return toSave;
}

export function saveQuestionBankQuestion(this: RepositoryRuntime, question: BankQuestion): Promise<BankQuestion> {
  return withBankWrite(this, () => saveQuestionBankQuestionUnlocked.call(this, question));
}

/**
 * Removes a question from its batch and recalculates index statistics.
 */
export async function deleteQuestionBankQuestionUnlocked(this: RepositoryRuntime, questionId: string): Promise<boolean> {
  const batches = await listQuestionBankBatchesUnlocked.call(this);
  let foundAndDeleted = false;

  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);

  const targetsToMutate: Array<{ filePath: string; batch: BankSubtopicBatch }> = [];

  for (const batch of batches) {
    const idx = batch.questions.findIndex((q) => q.id === questionId);
    if (idx >= 0) {
      batch.questions.splice(idx, 1);
      batch.updated_at = new Date().toISOString();

      const candidatePaths = [
        path.join(this.roots.runtime, QUESTION_BANK_DIR, batch.archetype_id, batch.domain_id, `${batch.subtopic_id}.json`),
      ];
      if (!isRedirectedRuntime) {
        candidatePaths.push(
          path.join(
            this.rootDirectory,
            ".quiz-studio",
            QUESTION_BANK_DIR,
            batch.archetype_id,
            batch.domain_id,
            `${batch.subtopic_id}.json`,
          ),
        );
      }
      if (batch.archetype_id === "verdict_true_false") {
        candidatePaths.push(
          path.join(this.roots.runtime, QUESTION_BANK_DIR, "verdict_fact_myth", batch.domain_id, `${batch.subtopic_id}.json`),
        );
        if (!isRedirectedRuntime) {
          candidatePaths.push(
            path.join(
              this.rootDirectory,
              ".quiz-studio",
              QUESTION_BANK_DIR,
              "verdict_fact_myth",
              batch.domain_id,
              `${batch.subtopic_id}.json`,
            ),
          );
        }
      }

      const uniquePaths = [...new Set(candidatePaths)];
      for (const filePath of uniquePaths) {
        if (existsSync(filePath)) {
          targetsToMutate.push({ filePath, batch });
        }
      }

      foundAndDeleted = true;
    }
  }

  if (!foundAndDeleted) {
    return false;
  }

  // Preflight all targets before any write
  for (const { filePath } of targetsToMutate) {
    const containmentRoot = isInside(runtimeBankRoot, filePath) ? this.roots.runtime : defaultProjectRuntime;
    await assertSafeBankFilesystemPath(containmentRoot, filePath);
  }

  const indexPath = getQuestionBankWritePath.call(this, "index.json");
  const indexContainmentRoot = isInside(runtimeBankRoot, indexPath) ? this.roots.runtime : defaultProjectRuntime;
  await assertSafeBankFilesystemPath(indexContainmentRoot, indexPath);

  const filesToCapture = [...new Set([...targetsToMutate.map((t) => t.filePath), indexPath])];
  const originalFiles = await captureFiles(filesToCapture);

  try {
    for (const { filePath, batch } of targetsToMutate) {
      await this.writeJsonAtomic(filePath, batch);
    }
    await recalculateQuestionBankIndexUnlocked.call(this);
    return true;
  } catch (error) {
    await restoreFiles(this, originalFiles);
    throw error;
  }
}

export function deleteQuestionBankQuestion(this: RepositoryRuntime, questionId: string): Promise<boolean> {
  return withBankWrite(this, () => deleteQuestionBankQuestionUnlocked.call(this, questionId));
}

/**
 * Clears all batches from the question bank directory and resets the index.
 */
export async function clearQuestionBankUnlocked(this: RepositoryRuntime): Promise<{ cleared_batches_count: number }> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

  const candidateRoots: string[] = [runtimeBankRoot];
  if (!isRedirectedRuntime) {
    const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
    if (projectBankRoot !== runtimeBankRoot && existsSync(projectBankRoot)) {
      candidateRoots.push(projectBankRoot);
    }
  }

  let clearedBatchesCount = 0;

  for (const bankRoot of candidateRoots) {
    if (!existsSync(bankRoot)) continue;
    await assertSafeBankFilesystemPath(path.dirname(bankRoot), bankRoot);
    let entries: string[];
    try {
      entries = (await readdir(bankRoot, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const subDir = path.join(bankRoot, entry);
      await assertSafeBankFilesystemPath(bankRoot, subDir);
      try {
        await rm(subDir, { recursive: true, force: true });
        clearedBatchesCount++;
      } catch {
        // Ignored
      }
    }

    const indexPath = path.join(bankRoot, "index.json");
    await assertSafeBankFilesystemPath(bankRoot, indexPath);
    const emptyIndex: BankIndex = {
      schema_version: 2,
      target_total: 20000,
      current_total: 0,
      by_archetype: {},
      by_domain: {},
      updated_at: new Date().toISOString(),
    };
    try {
      await this.writeJsonAtomic(indexPath, emptyIndex);
    } catch {
      // Ignored
    }
  }

  return { cleared_batches_count: clearedBatchesCount };
}

export function clearQuestionBank(this: RepositoryRuntime): Promise<{ cleared_batches_count: number }> {
  return withBankWrite(this, () => clearQuestionBankUnlocked.call(this));
}

export const clearAllQuestionBankQuestions = clearQuestionBank;
