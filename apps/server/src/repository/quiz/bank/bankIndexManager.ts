import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BankIndexSchema, type BankIndex, type BankQuestion, type MatrixCoverageStats } from "@studio/shared";
import { RepositoryError } from "../../errors.js";
import { calculateMatrixCoverageStats, ensureMatrixCoverageCache, getMatrixCoverageCache, warmUpMatrixCoverageCache } from "../../../quiz/bank/matrixCoverageService.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { assertSafeBankFilesystemPath, isInside } from "./bankPathSafety.js";
import { QUESTION_BANK_DIR, getQuestionBankPath, getQuestionBankWritePath } from "./bankPathResolver.js";
import { listQuestionBankBatchesUnlocked } from "./bankBatchStorage.js";
import { withBankRead, withBankWrite } from "./bankSerializationBoundary.js";

/**
 * Derives index statistics in-memory across all question batches without disk writes.
 */
export async function deriveQuestionBankIndexInMemory(this: RepositoryRuntime): Promise<BankIndex> {
  const batches = await listQuestionBankBatchesUnlocked.call(this);
  const by_archetype: Record<string, number> = {};
  const by_domain: Record<string, number> = {};
  let current_total = 0;

  for (const batch of batches) {
    const qCount = batch.questions.length;
    current_total += qCount;
    by_archetype[batch.archetype_id] = (by_archetype[batch.archetype_id] || 0) + qCount;
    if (batch.archetype_id === "verdict_true_false") {
      by_archetype.verdict_fact_myth = (by_archetype.verdict_fact_myth || 0) + qCount;
    }
    by_domain[batch.domain_id] = (by_domain[batch.domain_id] || 0) + qCount;
  }

  return {
    schema_version: 2,
    target_total: 20000,
    current_total,
    by_archetype,
    by_domain,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Reads the question bank index, serving instantly from the in-memory cache when warmed,
 * or safely reading from disk if not yet warmed.
 */
export async function readQuestionBankIndexUnlocked(this: RepositoryRuntime): Promise<BankIndex> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const cache = getMatrixCoverageCache(runtimeBankRoot);
  if (cache.isWarmed()) {
    return cache.getStats();
  }

  const indexPath = getQuestionBankPath.call(this, "index.json");
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);
  const containmentRoot = isInside(runtimeBankRoot, indexPath)
    ? this.roots.runtime
    : isInside(projectBankRoot, indexPath)
      ? defaultProjectRuntime
      : path.dirname(indexPath);
  await assertSafeBankFilesystemPath(containmentRoot, indexPath);

  let rawContent: string | null = null;
  try {
    rawContent = await readFile(indexPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new RepositoryError(`Failed to read Question Bank index at ${indexPath}`, "BANK_INDEX_READ_FAILED", { cause: error });
    }
  }

  if (rawContent !== null) {
    try {
      const parsed = BankIndexSchema.parse(JSON.parse(rawContent) as unknown);
      try {
        ensureMatrixCoverageCache(runtimeBankRoot);
      } catch {
        // Fall back to parsed index
      }
      return {
        ...parsed,
        target_total: parsed.target_total >= 20000 ? parsed.target_total : 20000,
      };
    } catch (error) {
      throw new RepositoryError(`Question Bank index is corrupt at ${indexPath}`, "BANK_INDEX_CORRUPT", { cause: error });
    }
  }

  try {
    const warmed = ensureMatrixCoverageCache(runtimeBankRoot);
    if (warmed.getStats().current_total > 0) {
      return warmed.getStats();
    }
  } catch {
    // Fall back to deriving in memory
  }
  return deriveQuestionBankIndexInMemory.call(this);
}

export function readQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  return withBankRead(this, () => readQuestionBankIndexUnlocked.call(this));
}

/**
 * Recalculates index statistics from SQLite aggregation and persists index.json.
 */
export async function recalculateQuestionBankIndexUnlocked(this: RepositoryRuntime): Promise<BankIndex> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const defaultProjectRuntime = path.join(this.rootDirectory, ".quiz-studio");
  const projectBankRoot = path.join(defaultProjectRuntime, QUESTION_BANK_DIR);

  let target_total = 20000;
  try {
    const prevPath = getQuestionBankPath.call(this, "index.json");
    const prevContainmentRoot = isInside(runtimeBankRoot, prevPath)
      ? this.roots.runtime
      : isInside(projectBankRoot, prevPath)
        ? defaultProjectRuntime
        : path.dirname(prevPath);
    await assertSafeBankFilesystemPath(prevContainmentRoot, prevPath);
    const raw = JSON.parse(await readFile(prevPath, "utf8")) as Record<string, unknown>;
    if (typeof raw?.target_total === "number" && raw.target_total >= 20000) target_total = raw.target_total;
  } catch (error) {
    if (error instanceof RepositoryError && error.code === "UNSAFE_PATH") {
      throw error;
    }
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new RepositoryError("Question Bank index is corrupt and cannot be recalculated", "BANK_INDEX_CORRUPT", { cause: error });
    }
  }

  const cache = warmUpMatrixCoverageCache(runtimeBankRoot);
  let updatedIndex: BankIndex;
  if (cache.getStats().current_total > 0) {
    updatedIndex = cache.getStats();
  } else {
    updatedIndex = await deriveQuestionBankIndexInMemory.call(this);
  }
  if (target_total > updatedIndex.target_total) {
    updatedIndex.target_total = target_total;
  }

  const indexPath = getQuestionBankWritePath.call(this, "index.json");
  const writeContainmentRoot = isInside(runtimeBankRoot, indexPath)
    ? this.roots.runtime
    : isInside(projectBankRoot, indexPath)
      ? defaultProjectRuntime
      : path.dirname(indexPath);
  await assertSafeBankFilesystemPath(writeContainmentRoot, indexPath);
  await mkdir(path.dirname(indexPath), { recursive: true });
  await this.writeJsonAtomic(indexPath, updatedIndex);
  return updatedIndex;
}

export function recalculateQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  return withBankWrite(this, () => recalculateQuestionBankIndexUnlocked.call(this));
}

/**
 * Calculates full combo matrix coverage statistics, serving instantaneously from cache.
 */
export async function getQuestionBankMatrixCoverageUnlocked(this: RepositoryRuntime): Promise<MatrixCoverageStats> {
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const cache = getMatrixCoverageCache(runtimeBankRoot);
  if (cache.isWarmed()) {
    return cache.getMatrixCoverage();
  }

  try {
    const warmed = ensureMatrixCoverageCache(runtimeBankRoot);
    if (warmed.isWarmed() && warmed.getStats().current_total > 0) {
      return warmed.getMatrixCoverage();
    }
  } catch {
    // Fall back to batch calculation
  }

  const batches = await listQuestionBankBatchesUnlocked.call(this);
  const questions: BankQuestion[] = [];
  for (const batch of batches) {
    questions.push(...batch.questions);
  }
  return calculateMatrixCoverageStats(questions);
}

export function getQuestionBankMatrixCoverage(this: RepositoryRuntime): Promise<MatrixCoverageStats> {
  return withBankRead(this, () => getQuestionBankMatrixCoverageUnlocked.call(this));
}
