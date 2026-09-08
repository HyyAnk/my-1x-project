import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BankIndexSchema, type BankIndex, type BankQuestion, type MatrixCoverageStats } from "@studio/shared";
import { calculateMatrixCoverageStats } from "../../../quiz/bank/matrixCoverageService.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { getQuestionBankPath, getQuestionBankWritePath } from "./bankPathResolver.js";
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
 * Reads the question bank index, calculating it in-memory on-the-fly if missing.
 * Strictly read-only: does not persist index.json.
 */
export async function readQuestionBankIndexUnlocked(this: RepositoryRuntime): Promise<BankIndex> {
  const indexPath = getQuestionBankPath.call(this, "index.json");
  try {
    const raw = JSON.parse(await readFile(indexPath, "utf8")) as unknown;
    const parsed = BankIndexSchema.parse(raw);
    if (parsed.current_total > 0) {
      return {
        ...parsed,
        target_total: parsed.target_total >= 20000 ? parsed.target_total : 20000,
      };
    }
  } catch {
    // Missing or invalid index file
  }

  try {
    return await deriveQuestionBankIndexInMemory.call(this);
  } catch {
    return {
      schema_version: 2,
      target_total: 20000,
      current_total: 0,
      by_archetype: {},
      by_domain: {},
      updated_at: new Date().toISOString(),
    };
  }
}

export function readQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  return withBankRead(this, () => readQuestionBankIndexUnlocked.call(this));
}

/**
 * Recalculates index statistics across all question batches and persists index.json.
 */
export async function recalculateQuestionBankIndexUnlocked(this: RepositoryRuntime): Promise<BankIndex> {
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

  let target_total = 20000;
  try {
    const prevPath = getQuestionBankPath.call(this, "index.json");
    const raw = JSON.parse(await readFile(prevPath, "utf8")) as Record<string, unknown>;
    if (typeof raw?.target_total === "number" && raw.target_total >= 20000) {
      target_total = raw.target_total;
    }
  } catch {
    // Default to 20,000 target
  }

  const updatedIndex: BankIndex = {
    schema_version: 2,
    target_total,
    current_total,
    by_archetype,
    by_domain,
    updated_at: new Date().toISOString(),
  };

  const indexPath = getQuestionBankWritePath.call(this, "index.json");
  await mkdir(path.dirname(indexPath), { recursive: true });
  await this.writeJsonAtomic(indexPath, updatedIndex);
  return updatedIndex;
}

export function recalculateQuestionBankIndex(this: RepositoryRuntime): Promise<BankIndex> {
  return withBankWrite(this, () => recalculateQuestionBankIndexUnlocked.call(this));
}

/**
 * Calculates full 20,000 combo matrix coverage statistics across all active bank questions.
 */
export async function getQuestionBankMatrixCoverageUnlocked(this: RepositoryRuntime): Promise<MatrixCoverageStats> {
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
