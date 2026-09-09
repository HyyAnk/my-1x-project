import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BankQuestionSchema, type BankIndex, type BankQuestion, type BankSubtopicBatch } from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankPath, getQuestionBankWritePath } from "./bankPathResolver.js";
import { listQuestionBankBatchesUnlocked, readSubtopicBatchUnlocked } from "./bankBatchStorage.js";
import { recalculateQuestionBankIndexUnlocked } from "./bankIndexManager.js";
import { withBankWrite } from "./bankSerializationBoundary.js";
import { assertEnglishQuestionWrite } from "./bankWritePolicy.js";
import { assertSafeBankFilesystemPath } from "./bankPathSafety.js";

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
  await assertSafeBankFilesystemPath(path.join(this.roots.runtime, QUESTION_BANK_DIR), batchFilePath);
  if (legacyPath) await assertSafeBankFilesystemPath(path.join(this.roots.runtime, QUESTION_BANK_DIR), legacyPath);
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

type CapturedFile = { target: string; bytes?: Buffer };

async function captureFile(target: string): Promise<Buffer | undefined> {
  try {
    return await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function captureFiles(targets: string[]): Promise<CapturedFile[]> {
  return Promise.all(targets.map(async (target) => ({ target, bytes: await captureFile(target) })));
}

async function restoreFile(runtime: RepositoryRuntime, target: string, bytes: Buffer | undefined): Promise<void> {
  try {
    if (bytes === undefined) await rm(target, { force: true });
    else await runtime.writeBinaryAtomic(target, bytes);
  } catch {
    if (bytes !== undefined) await writeFile(target, bytes);
  }
}

async function restoreFiles(runtime: RepositoryRuntime, files: CapturedFile[]): Promise<void> {
  for (const file of files) await restoreFile(runtime, file.target, file.bytes);
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

  for (const batch of batches) {
    const idx = batch.questions.findIndex((q) => q.id === questionId);
    if (idx >= 0) {
      batch.questions.splice(idx, 1);
      batch.updated_at = new Date().toISOString();

      const candidatePaths = [
        path.join(this.roots.runtime, QUESTION_BANK_DIR, batch.archetype_id, batch.domain_id, `${batch.subtopic_id}.json`),
        path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, batch.archetype_id, batch.domain_id, `${batch.subtopic_id}.json`),
      ];
      if (batch.archetype_id === "verdict_true_false") {
        candidatePaths.push(
          path.join(this.roots.runtime, QUESTION_BANK_DIR, "verdict_fact_myth", batch.domain_id, `${batch.subtopic_id}.json`),
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

      for (const filePath of candidatePaths) {
        if (existsSync(filePath)) {
          await assertSafeBankFilesystemPath(path.join(this.roots.runtime, QUESTION_BANK_DIR), filePath);
          await this.writeJsonAtomic(filePath, batch);
        }
      }

      foundAndDeleted = true;
    }
  }

  if (foundAndDeleted) {
    await recalculateQuestionBankIndexUnlocked.call(this);
    return true;
  }

  return false;
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
