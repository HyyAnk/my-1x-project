import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR, getQuestionBankWritePath } from "./bankPathResolver.js";
import { assertSafeBankFilesystemPath, assertSafeBankPathSegments } from "./bankPathSafety.js";
import { withBankRead, withBankWrite } from "./bankSerializationBoundary.js";
import { assertEnglishBatchWrite } from "./bankWritePolicy.js";
import { withBankSqliteDb } from "./bankSqliteEngine.js";
import { upsertBankQuestionSqlite } from "./bankSqliteMutations.js";
import { warmUpMatrixCoverageCache } from "../../../quiz/bank/matrixCoverageService.js";
import {
  assertNestedQuestionMembership, assertSafeTarget, assertUniqueQuestionIds,
  matchesArchetypeFilter, normalizeLegacyArchetype, parseReadSubtopicBatch,
  parseScannedBatchFile, readBatchContentWithFallback, readSafeBankBatchContent,
  readSafeBankBatchFileNames, readSafeBankChildDirs, resolveBankCandidateRoots,
  storeDiscoveredBatch,
} from "./storage/index.js";

export * from "./storage/index.js";

/** Reads a single subtopic batch file from storage, normalizing legacy archetypes. */
export async function readSubtopicBatchUnlocked(
  this: RepositoryRuntime,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): Promise<BankSubtopicBatch | null> {
  assertSafeBankPathSegments([archetypeId, domainId, subtopicId], ["archetype", "domain", "subtopic"]);
  const normalizedArch = normalizeLegacyArchetype(archetypeId);
  const result = await readBatchContentWithFallback(this, normalizedArch, domainId, subtopicId);
  if (!result) return null;
  return parseReadSubtopicBatch(result.raw, result.filePath, { domainId, subtopicId, normalizedArch });
}

export function readSubtopicBatch(
  this: RepositoryRuntime,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): Promise<BankSubtopicBatch | null> {
  return withBankRead(this, () => readSubtopicBatchUnlocked.call(this, archetypeId, domainId, subtopicId));
}

/** Atomically writes a subtopic batch to disk and keeps legacy mirrored files updated. */
export async function writeSubtopicBatchUnlocked(this: RepositoryRuntime, batch: BankSubtopicBatch): Promise<void> {
  const validated = BankSubtopicBatchSchema.parse(batch);
  assertSafeBankPathSegments([validated.archetype_id, validated.domain_id, validated.subtopic_id], ["archetype", "domain", "subtopic"]);
  assertEnglishBatchWrite(validated);
  const normalizedBatch = { ...validated, archetype_id: normalizeLegacyArchetype(validated.archetype_id) };
  assertNestedQuestionMembership(validated, `${validated.archetype_id}/${validated.domain_id}/${validated.subtopic_id}`);
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const batchPath = getQuestionBankWritePath.call(this, normalizedBatch.archetype_id, normalizedBatch.domain_id, `${normalizedBatch.subtopic_id}.json`);
  await assertSafeBankFilesystemPath(runtimeBankRoot, batchPath);
  await mkdir(path.dirname(batchPath), { recursive: true });
  await this.writeJsonAtomic(batchPath, normalizedBatch);

  if (normalizedBatch.archetype_id === "verdict_true_false") {
    const legacyPath = getQuestionBankWritePath.call(this, "verdict_fact_myth", normalizedBatch.domain_id, `${normalizedBatch.subtopic_id}.json`);
    await assertSafeBankFilesystemPath(runtimeBankRoot, legacyPath);
    if (existsSync(legacyPath)) await this.writeJsonAtomic(legacyPath, normalizedBatch);
  }

  await withBankSqliteDb(runtimeBankRoot, async (db) => {
    db.exec("BEGIN;");
    try {
      for (const q of normalizedBatch.questions) upsertBankQuestionSqlite(db, q);
      db.exec("COMMIT;");
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
    const cache = warmUpMatrixCoverageCache(runtimeBankRoot, db);
    const indexPath = getQuestionBankWritePath.call(this, "index.json");
    try {
      await assertSafeBankFilesystemPath(runtimeBankRoot, indexPath);
      await this.writeJsonAtomic(indexPath, cache.getStats());
    } catch {
      // Non-fatal if index write fails during raw batch write
    }
  });
}

export function writeSubtopicBatch(this: RepositoryRuntime, batch: BankSubtopicBatch): Promise<void> {
  return withBankWrite(this, () => writeSubtopicBatchUnlocked.call(this, batch));
}

/** Discovers and lists all subtopic batches across runtime and project repository locations. */
export async function listQuestionBankBatchesUnlocked(
  this: RepositoryRuntime,
  filter?: { archetypeId?: string; domainId?: string },
): Promise<BankSubtopicBatch[]> {
  const candidateRoots = resolveBankCandidateRoots(this);
  const runtimeBankRoot = path.join(this.roots.runtime, QUESTION_BANK_DIR);
  const batchesMap = new Map<string, { data: BankSubtopicBatch; isRuntime: boolean; archDir: string }>();

  for (const bankRoot of candidateRoots) {
    const isRuntime = bankRoot === runtimeBankRoot;
    const archetypeDirs = await readSafeBankChildDirs(bankRoot, bankRoot, "archetype");
    for (const archDir of archetypeDirs) {
      if (!matchesArchetypeFilter(archDir, filter?.archetypeId)) continue;
      const domainDirs = await readSafeBankChildDirs(bankRoot, path.join(bankRoot, archDir), "domain");
      for (const domDir of domainDirs) {
        if (filter?.domainId && domDir !== filter.domainId) continue;
        const domPath = path.join(bankRoot, archDir, domDir);
        const batchFiles = await readSafeBankBatchFileNames(bankRoot, domPath);
        for (const file of batchFiles) {
          const filePath = path.join(domPath, file);
          const raw = await readSafeBankBatchContent(bankRoot, filePath);
          storeDiscoveredBatch(batchesMap, parseScannedBatchFile(raw, filePath, { fileName: file, domDir, archDir }), isRuntime, archDir);
        }
      }
    }
  }
  const batches = Array.from(batchesMap.values()).map((v) => v.data);
  assertUniqueQuestionIds(batches);
  return batches;
}

export function listQuestionBankBatches(
  this: RepositoryRuntime,
  filter?: { archetypeId?: string; domainId?: string },
): Promise<BankSubtopicBatch[]> {
  return withBankRead(this, () => listQuestionBankBatchesUnlocked.call(this, filter));
}
