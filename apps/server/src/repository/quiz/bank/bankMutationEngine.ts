import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  BankQuestionSchema,
  BankSubtopicBatchSchema,
  type BankIndex,
  type BankQuestion,
  type BankSubtopicBatch,
} from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import {
  QUESTION_BANK_DIR,
  getQuestionBankPath,
  getQuestionBankWritePath,
} from "./bankPathResolver.js";
import { listQuestionBankBatches } from "./bankBatchStorage.js";
import { recalculateQuestionBankIndex } from "./bankIndexManager.js";

/**
 * Validates, normalizes, and upserts a bank question into its corresponding subtopic batch file.
 */
export async function saveQuestionBankQuestion(
  this: RepositoryRuntime,
  question: BankQuestion,
): Promise<BankQuestion> {
  const normalizedQuestion = {
    ...question,
    archetype_id: question.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : question.archetype_id,
  };
  const validated = BankQuestionSchema.parse(normalizedQuestion);
  const batchFilePath = getQuestionBankWritePath.call(
    this,
    validated.archetype_id,
    validated.domain_id,
    `${validated.subtopic_id}.json`,
  );

  let batch: BankSubtopicBatch = {
    schema_version: 2,
    archetype_id: validated.archetype_id,
    domain_id: validated.domain_id,
    subtopic_id: validated.subtopic_id,
    subtopic_title: validated.subtopic_id.replaceAll("_", " "),
    updated_at: new Date().toISOString(),
    questions: [],
  };

  try {
    const existingReadPath = getQuestionBankPath.call(
      this,
      validated.archetype_id,
      validated.domain_id,
      `${validated.subtopic_id}.json`,
    );
    const raw = JSON.parse(await readFile(existingReadPath, "utf8")) as unknown;
    batch = BankSubtopicBatchSchema.parse(raw);
    if (batch.archetype_id === "verdict_fact_myth") {
      batch.archetype_id = "verdict_true_false";
    }
  } catch {
    if (validated.archetype_id === "verdict_true_false") {
      try {
        const legacyReadPath = getQuestionBankPath.call(
          this,
          "verdict_fact_myth",
          validated.domain_id,
          `${validated.subtopic_id}.json`,
        );
        const rawLegacy = JSON.parse(await readFile(legacyReadPath, "utf8")) as unknown;
        batch = BankSubtopicBatchSchema.parse(rawLegacy);
        batch.archetype_id = "verdict_true_false";
      } catch {
        // Fall back to default batch
      }
    }
  }

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
  await mkdir(path.dirname(batchFilePath), { recursive: true });
  await this.writeJsonAtomic(batchFilePath, batch);

  if (validated.archetype_id === "verdict_true_false") {
    const legacyPath = getQuestionBankWritePath.call(
      this,
      "verdict_fact_myth",
      validated.domain_id,
      `${validated.subtopic_id}.json`,
    );
    if (existsSync(legacyPath)) {
      await this.writeJsonAtomic(legacyPath, batch);
    }
  }

  // Recalculate index
  await recalculateQuestionBankIndex.call(this);
  return toSave;
}

/**
 * Removes a question from its batch and recalculates index statistics.
 */
export async function deleteQuestionBankQuestion(
  this: RepositoryRuntime,
  questionId: string,
): Promise<boolean> {
  const batches = await listQuestionBankBatches.call(this);
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
          path.join(this.rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, "verdict_fact_myth", batch.domain_id, `${batch.subtopic_id}.json`),
        );
      }

      for (const filePath of candidatePaths) {
        if (existsSync(filePath)) {
          await this.writeJsonAtomic(filePath, batch);
        }
      }

      foundAndDeleted = true;
    }
  }

  if (foundAndDeleted) {
    await recalculateQuestionBankIndex.call(this);
    return true;
  }

  return false;
}

/**
 * Clears all batches from the question bank directory and resets the index.
 */
export async function clearQuestionBank(
  this: RepositoryRuntime,
): Promise<{ cleared_batches_count: number }> {
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
    let entries: string[] = [];
    try {
      entries = (await readdir(bankRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const subDir = path.join(bankRoot, entry);
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

export const clearAllQuestionBankQuestions = clearQuestionBank;
