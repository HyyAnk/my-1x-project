import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import type { BankIndex } from "@studio/shared";
import type { RepositoryRuntime } from "../../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankWritePath } from "../bankPathResolver.js";
import { withBankWrite } from "../bankSerializationBoundary.js";
import { assertSafeBankFilesystemPath, isInside } from "../bankPathSafety.js";
import { getBankSqliteDb, closeBankSqliteDb, withBankSqliteDb } from "../bankSqliteEngine.js";
import { clearBankQuestionsSqlite } from "../bankSqliteMutations.js";
import { ensureMatrixCoverageCache, getMatrixCoverageCache } from "../../../../quiz/bank/matrixCoverageService.js";
import { readSubtopicBatchUnlocked } from "../bankBatchStorage.js";

/**
 * Deletes an entire topic/subtopic batch file, cleans up indexed questions, and updates index.
 */
export async function deleteTopicBatchUnlocked(
  this: RepositoryRuntime,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): Promise<boolean> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  return withBankSqliteDb(runtimeBankRoot, async (db) => {
    const batch = await readSubtopicBatchUnlocked.call(this, archetypeId, domainId, subtopicId);
    if (!batch) return false;

    const batchPath = getQuestionBankWritePath.call(this, archetypeId, domainId, `${subtopicId}.json`);
    const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
    const containmentRoot = isInside(runtimeBankRoot, batchPath) ? this.roots.runtime : defaultProjectRuntime;
    await assertSafeBankFilesystemPath(containmentRoot, batchPath);

    if (existsSync(batchPath)) {
      await rm(batchPath, { force: true });
    }

    const cache = ensureMatrixCoverageCache(runtimeBankRoot, db);
    for (const q of batch.questions) {
      db.prepare("DELETE FROM bank_questions WHERE id = ?").run(q.id);
      cache.onQuestionDeleted(q.id, {
        archetype_id: q.archetype_id,
        domain_id: q.domain_id,
        entity_id: q.entity_id,
        status: q.status,
      });
    }

    const indexPath = getQuestionBankWritePath.call(this, "index.json");
    await this.writeJsonAtomic(indexPath, cache.getStats());
    return true;
  });
}

export function deleteTopicBatch(this: RepositoryRuntime, archetypeId: string, domainId: string, subtopicId: string): Promise<boolean> {
  return withBankWrite(this, () => deleteTopicBatchUnlocked.call(this, archetypeId, domainId, subtopicId));
}

/**
 * Clears all batches from the question bank directory and resets the index and sqlite database.
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

  if (existsSync(runtimeBankRoot)) {
    try {
      const db = getBankSqliteDb(runtimeBankRoot);
      clearBankQuestionsSqlite(db);
    } catch {
      // Ignored
    }
    closeBankSqliteDb(runtimeBankRoot);
  }

  const cache = getMatrixCoverageCache(runtimeBankRoot);
  cache.onBankCleared();

  return { cleared_batches_count: clearedBatchesCount };
}

export function clearQuestionBank(this: RepositoryRuntime): Promise<{ cleared_batches_count: number }> {
  return withBankWrite(this, () => clearQuestionBankUnlocked.call(this));
}

export const clearAllQuestionBankQuestions = clearQuestionBank;
