import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { LEGACY_VERDICT_ARCHETYPE_IDS, BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import { writeJsonAtomic } from "../../../../utils/fs.js";
import { normalizeBatchLegacyArchetypes } from "../storage/bankBatchParser.js";

const CANONICAL_VERDICT_DIR = "verdict_yes_no";

export interface LegacyVerdictFileMerge {
  canonicalPath: string;
  legacyPaths: string[];
  addedQuestionIds: string[];
  conflictingQuestionIds: string[];
  mergedBatch: BankSubtopicBatch;
}

export interface LegacyVerdictFileMigrationPlan {
  bankRoot: string;
  merges: LegacyVerdictFileMerge[];
}

async function readBatch(filePath: string): Promise<BankSubtopicBatch> {
  const parsed = BankSubtopicBatchSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
  return normalizeBatchLegacyArchetypes(parsed);
}

async function listLegacyBatchFiles(bankRoot: string): Promise<string[]> {
  const files: string[] = [];
  for (const legacyArch of LEGACY_VERDICT_ARCHETYPE_IDS) {
    const archDir = path.join(bankRoot, legacyArch);
    if (!existsSync(archDir)) continue;
    for (const domain of await readdir(archDir, { withFileTypes: true })) {
      if (!domain.isDirectory()) continue;
      for (const file of await readdir(path.join(archDir, domain.name), { withFileTypes: true })) {
        if (file.isFile() && file.name.endsWith(".json")) files.push(path.join(archDir, domain.name, file.name));
      }
    }
  }
  return files;
}

function mergeIntoCanonical(merge: LegacyVerdictFileMerge, legacy: BankSubtopicBatch): void {
  const byId = new Map(merge.mergedBatch.questions.map((question) => [question.id, question]));
  for (const question of legacy.questions) {
    const existing = byId.get(question.id);
    if (!existing) {
      merge.mergedBatch.questions.push(question);
      merge.addedQuestionIds.push(question.id);
    } else if (JSON.stringify(existing) !== JSON.stringify(question)) {
      merge.conflictingQuestionIds.push(question.id);
    }
  }
}

/**
 * Plans folding every retired True/False batch file into its canonical verdict_yes_no batch.
 * The canonical copy of a question wins when both directories hold the same question ID.
 */
export async function planLegacyVerdictFileMigration(bankRoot: string): Promise<LegacyVerdictFileMigrationPlan> {
  const merges = new Map<string, LegacyVerdictFileMerge>();
  for (const legacyPath of await listLegacyBatchFiles(bankRoot)) {
    const relative = path.relative(bankRoot, legacyPath).split(path.sep).slice(1);
    const canonicalPath = path.join(bankRoot, CANONICAL_VERDICT_DIR, ...relative);
    let merge = merges.get(canonicalPath);
    if (!merge) {
      const base = existsSync(canonicalPath) ? await readBatch(canonicalPath) : { ...(await readBatch(legacyPath)), questions: [] };
      merge = { canonicalPath, legacyPaths: [], addedQuestionIds: [], conflictingQuestionIds: [], mergedBatch: base };
      merges.set(canonicalPath, merge);
    }
    merge.legacyPaths.push(legacyPath);
    mergeIntoCanonical(merge, await readBatch(legacyPath));
  }
  return { bankRoot, merges: [...merges.values()] };
}

async function backUp(bankRoot: string, backupDir: string, filePath: string): Promise<void> {
  if (!existsSync(filePath)) return;
  const target = path.join(backupDir, path.relative(bankRoot, filePath));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(filePath, target);
}

async function removeEmptyLegacyDirs(bankRoot: string): Promise<void> {
  for (const legacyArch of LEGACY_VERDICT_ARCHETYPE_IDS) {
    const archDir = path.join(bankRoot, legacyArch);
    if (!existsSync(archDir)) continue;
    for (const domain of await readdir(archDir)) {
      await rmdir(path.join(archDir, domain)).catch(() => undefined);
    }
    await rmdir(archDir).catch(() => undefined);
  }
}

async function dropLegacyIndexCounters(bankRoot: string): Promise<void> {
  const indexPath = path.join(bankRoot, "index.json");
  if (!existsSync(indexPath)) return;
  const index = JSON.parse(await readFile(indexPath, "utf8")) as { by_archetype?: Record<string, number> };
  for (const legacyArch of LEGACY_VERDICT_ARCHETYPE_IDS) delete index.by_archetype?.[legacyArch];
  await writeJsonAtomic(indexPath, index);
}

/**
 * Applies a migration plan: backs up every touched file, writes the merged canonical batches,
 * then removes the retired True/False batch files.
 */
export async function applyLegacyVerdictFileMigration(plan: LegacyVerdictFileMigrationPlan, backupDir: string): Promise<void> {
  const { bankRoot } = plan;
  for (const extra of ["questions.db", "index.json"]) await backUp(bankRoot, backupDir, path.join(bankRoot, extra));
  for (const merge of plan.merges) {
    for (const filePath of [merge.canonicalPath, ...merge.legacyPaths]) await backUp(bankRoot, backupDir, filePath);
  }
  for (const merge of plan.merges) {
    await mkdir(path.dirname(merge.canonicalPath), { recursive: true });
    await writeJsonAtomic(merge.canonicalPath, BankSubtopicBatchSchema.parse(merge.mergedBatch));
    for (const legacyPath of merge.legacyPaths) await rm(legacyPath);
  }
  await removeEmptyLegacyDirs(bankRoot);
  await dropLegacyIndexCounters(bankRoot);
}
