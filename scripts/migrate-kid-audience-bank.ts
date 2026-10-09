import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import {
  applyKidAudienceBankMigration,
  planKidAudienceBankMigration,
} from "../apps/server/src/quiz/bank/maintenance/kidAudienceBankMigration.js";
import { applyKidAudienceReviewToRows } from "../apps/server/src/quiz/bank/maintenance/kidAudienceSqliteRows.js";
import { loadRestrictedEntityLookup } from "../apps/server/src/quiz/bank/maintenance/restrictedEntities.js";

/**
 * Re-screens the Question Bank for a kids and family audience: archives (hides) unsuitable questions and
 * re-measures every question's age band and difficulty, in the JSON batch files and the SQLite index.
 * Questions about Knowledge Base subjects rated teen or mature are hidden too, even when their wording is harmless.
 * Dry-run by default; pass --apply to write. Stop the dashboard first so nothing else writes to the bank.
 *
 * Usage: tsx scripts/migrate-kid-audience-bank.ts [--bank-root <abs path>] [--apply]
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

const reviewOptions = {
  restrictedEntityRating: loadRestrictedEntityLookup(path.resolve(".quiz-studio", "knowledge_base", "entities")),
};
const plan = await planKidAudienceBankMigration(bankRoot, reviewOptions);
const hiddenTotal = plan.changes.reduce((sum, change) => sum + change.hiddenQuestionIds.length, 0);
console.log(`Bank root: ${bankRoot}`);
console.log(`Questions scanned: ${plan.totalQuestions}; batch files to rewrite: ${plan.changes.length}`);
console.log(`Questions to hide (archive): ${hiddenTotal}`, plan.hiddenByCategory);
for (const sample of plan.hiddenSamples.slice(0, 15)) console.log(`  - [${sample.category}: ${sample.term}] ${sample.question}`);

if (!values.apply) {
  console.log("Dry run only. Re-run with --apply (dashboard stopped) to migrate; a backup is written first.");
} else {
  const backupDir = path.join(
    path.dirname(bankRoot),
    "question_bank_migrations",
    `kid_audience_${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  await applyKidAudienceBankMigration(plan, backupDir);
  const db = new DatabaseSync(path.join(bankRoot, "questions.db"));
  try {
    const rows = applyKidAudienceReviewToRows(db, reviewOptions);
    console.log(`SQLite rows: ${rows.totalRows} scanned, ${rows.updatedRows} updated, ${rows.hiddenRows} hidden.`);
  } finally {
    db.close();
  }
  console.log(`Migrated. Backup of every touched file: ${backupDir}`);
}
