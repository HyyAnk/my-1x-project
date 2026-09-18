import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BankQuestionSchema, type BankQuestion, type BankSubtopicBatch } from "@studio/shared";
import type { RepositoryRuntime } from "../../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankPath, getQuestionBankWritePath } from "../bankPathResolver.js";
import { listQuestionBankBatchesUnlocked, readSubtopicBatchUnlocked } from "../bankBatchStorage.js";
import { withBankWrite } from "../bankSerializationBoundary.js";
import { assertEnglishQuestionWrite } from "../bankWritePolicy.js";
import { assertSafeBankFilesystemPath, isInside } from "../bankPathSafety.js";
import { captureFile, captureFiles, restoreFile, restoreFiles } from "../bankFileTransaction.js";
import { withBankSqliteDb } from "../bankSqliteEngine.js";
import { upsertBankQuestionSqlite, deleteBankQuestionSqlite } from "../bankSqliteMutations.js";
import { getBankQuestionByIdSqlite } from "../bankSqliteQueries.js";
import { ensureMatrixCoverageCache } from "../../../../quiz/bank/matrixCoverageService.js";
import { normalizeBankQuestion, prepareBatchForSave, resolveBatchCandidatePaths } from "./mutationHelpers.js";

/**
 * Validates, normalizes, and upserts a bank question into its corresponding subtopic batch file.
 */
export async function saveQuestionBankQuestionUnlocked(this: RepositoryRuntime, question: BankQuestion): Promise<BankQuestion> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  return withBankSqliteDb(runtimeBankRoot, async (db) => {
    assertEnglishQuestionWrite(question);
    const validated = BankQuestionSchema.parse(normalizeBankQuestion(question));
    const batchFilePath = getQuestionBankWritePath.call(this, validated.archetype_id, validated.domain_id, `${validated.subtopic_id}.json`);

    const existing = await readSubtopicBatchUnlocked.call(this, validated.archetype_id, validated.domain_id, validated.subtopic_id);
    const { batch, toSave } = prepareBatchForSave(existing, validated);

    const legacyPath =
      validated.archetype_id === "verdict_true_false"
        ? getQuestionBankWritePath.call(this, "verdict_fact_myth", validated.domain_id, `${validated.subtopic_id}.json`)
        : null;
    const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
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

      const cache = ensureMatrixCoverageCache(runtimeBankRoot, db);
      const prevMeta = getBankQuestionByIdSqlite(db, toSave.id);

      upsertBankQuestionSqlite(db, toSave);

      cache.onQuestionSaved(
        toSave,
        prevMeta
          ? {
              archetype_id: prevMeta.archetype_id,
              domain_id: prevMeta.domain_id,
              entity_id: prevMeta.entity_id,
              status: prevMeta.status,
            }
          : null,
      );

      const updatedIndex = cache.getStats();
      const writeIndexPath = getQuestionBankWritePath.call(this, "index.json");
      const writeContainmentRoot = isInside(runtimeBankRoot, writeIndexPath) ? this.roots.runtime : defaultProjectRuntime;
      await assertSafeBankFilesystemPath(writeContainmentRoot, writeIndexPath);
      await this.writeJsonAtomic(writeIndexPath, updatedIndex);
    } catch (error) {
      await restoreFiles(this, originalFiles);
      await restoreFile(this, indexPath, originalIndex);
      throw error;
    }
    return toSave;
  });
}

export function saveQuestionBankQuestion(this: RepositoryRuntime, question: BankQuestion): Promise<BankQuestion> {
  return withBankWrite(this, () => saveQuestionBankQuestionUnlocked.call(this, question));
}

/**
 * Removes a question from its batch and recalculates index statistics.
 */
export async function deleteQuestionBankQuestionUnlocked(this: RepositoryRuntime, questionId: string): Promise<boolean> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  return withBankSqliteDb(runtimeBankRoot, async (db) => {
    const batches = await listQuestionBankBatchesUnlocked.call(this);
    let foundAndDeleted = false;

    const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
    const isRedirectedRuntime = path.resolve(this.roots.runtime) !== path.resolve(defaultProjectRuntime);

    const targetsToMutate: Array<{ filePath: string; batch: BankSubtopicBatch }> = [];

    for (const batch of batches) {
      const idx = batch.questions.findIndex((q) => q.id === questionId);
      if (idx >= 0) {
        batch.questions.splice(idx, 1);
        batch.updated_at = new Date().toISOString();

        const candidatePaths = resolveBatchCandidatePaths(
          runtimeBankRoot,
          this.rootDirectory,
          isRedirectedRuntime,
          batch.archetype_id,
          batch.domain_id,
          batch.subtopic_id,
        );

        for (const filePath of candidatePaths) {
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
      const cache = ensureMatrixCoverageCache(runtimeBankRoot, db);
      const prevMeta = getBankQuestionByIdSqlite(db, questionId);
      deleteBankQuestionSqlite(db, questionId);
      if (prevMeta) {
        cache.onQuestionDeleted(questionId, {
          archetype_id: prevMeta.archetype_id,
          domain_id: prevMeta.domain_id,
          entity_id: prevMeta.entity_id,
          status: prevMeta.status,
        });
      }

      await this.writeJsonAtomic(indexPath, cache.getStats());
      return true;
    } catch (error) {
      await restoreFiles(this, originalFiles);
      throw error;
    }
  });
}

export function deleteQuestionBankQuestion(this: RepositoryRuntime, questionId: string): Promise<boolean> {
  return withBankWrite(this, () => deleteQuestionBankQuestionUnlocked.call(this, questionId));
}
