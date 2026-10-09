import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  applyLegacyVerdictFileMigration,
  planLegacyVerdictFileMigration,
} from "../apps/server/src/repository/quiz/bank/migration/legacyVerdictFileMigration.js";

/**
 * Folds the retired verdict_true_false / verdict_fact_myth Question Bank folders into verdict_yes_no.
 * Dry-run by default; pass --apply to write. Stop the dashboard first so nothing else writes to the bank.
 *
 * Usage: tsx scripts/migrate-legacy-verdict-bank.ts [--bank-root <abs path>] [--apply]
 */
function resolveBankRoot(explicit?: string): string {
  if (explicit) return explicit;
  const storageConfig = path.resolve(".quiz-studio/storage.local.json");
  const storagePath = existsSync(storageConfig)
    ? (JSON.parse(readFileSync(storageConfig, "utf8")) as { storage_path?: string }).storage_path
    : undefined;
  return path.join(storagePath ?? path.resolve("."), ".quiz-studio", "question_bank");
}

const { values } = parseArgs({ options: { "bank-root": { type: "string" }, apply: { type: "boolean", default: false } }, strict: true });
const bankRoot = resolveBankRoot(values["bank-root"]);
if (!existsSync(bankRoot)) throw new Error(`Question Bank not found at ${bankRoot}`);

const plan = await planLegacyVerdictFileMigration(bankRoot);
const legacyFiles = plan.merges.reduce((sum, merge) => sum + merge.legacyPaths.length, 0);
const added = plan.merges.reduce((sum, merge) => sum + merge.addedQuestionIds.length, 0);
const conflicts = plan.merges.reduce((sum, merge) => sum + merge.conflictingQuestionIds.length, 0);
console.log(`Bank root: ${bankRoot}`);
console.log(`Legacy True/False batch files: ${legacyFiles} -> ${plan.merges.length} canonical verdict_yes_no files`);
console.log(`Questions moved into verdict_yes_no: ${added}; same-ID conflicts resolved in favour of verdict_yes_no: ${conflicts}`);

if (!values.apply) {
  console.log("Dry run only. Re-run with --apply (dashboard stopped) to migrate; a backup is written first.");
} else if (plan.merges.length > 0) {
  const backupDir = path.join(
    path.dirname(bankRoot),
    "question_bank_migrations",
    `verdict_yes_no_${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  await applyLegacyVerdictFileMigration(plan, backupDir);
  console.log(`Migrated. Backup of every touched file: ${backupDir}`);
}
