import { readFile } from "node:fs/promises";
import { BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import { writeJsonAtomic } from "../../../utils/fs.js";
import type { KidSafetyCategory } from "../kidSafety/kidSafety.types.js";
import { reviewQuestionForKidAudience, type KidAudienceReviewOptions } from "../kidSafety/kidAudienceReview.js";
import { backUpBankFile, backUpBankSqlite, listBankBatchFiles } from "./bankBatchFiles.js";

export interface KidAudienceFileChange {
  filePath: string;
  batch: BankSubtopicBatch;
  hiddenQuestionIds: string[];
}

export interface KidAudienceMigrationPlan {
  bankRoot: string;
  changes: KidAudienceFileChange[];
  totalQuestions: number;
  hiddenByCategory: Partial<Record<KidSafetyCategory, number>>;
  hiddenSamples: Array<{ id: string; category: KidSafetyCategory; term: string; question: string }>;
}

function recordHidden(
  plan: KidAudienceMigrationPlan,
  change: KidAudienceFileChange,
  id: string,
  finding: { category: KidSafetyCategory; term: string },
  question: string,
): void {
  change.hiddenQuestionIds.push(id);
  plan.hiddenByCategory[finding.category] = (plan.hiddenByCategory[finding.category] ?? 0) + 1;
  if (plan.hiddenSamples.length < 40) plan.hiddenSamples.push({ id, category: finding.category, term: finding.term, question });
}

/**
 * Plans the kids and family re-screen of every Question Bank batch file: unsuitable questions are archived
 * and every question's age band and difficulty are re-measured. Read-only.
 */
export async function planKidAudienceBankMigration(
  bankRoot: string,
  reviewOptions: KidAudienceReviewOptions = {},
): Promise<KidAudienceMigrationPlan> {
  const plan: KidAudienceMigrationPlan = { bankRoot, changes: [], totalQuestions: 0, hiddenByCategory: {}, hiddenSamples: [] };
  for (const filePath of await listBankBatchFiles(bankRoot)) {
    const batch = BankSubtopicBatchSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
    const change: KidAudienceFileChange = { filePath, batch: { ...batch, questions: [] }, hiddenQuestionIds: [] };
    let changed = false;
    for (const question of batch.questions) {
      plan.totalQuestions += 1;
      const review = reviewQuestionForKidAudience(question, reviewOptions);
      change.batch.questions.push(review.question);
      changed ||= review.changed;
      if (review.hiddenFinding) recordHidden(plan, change, question.id, review.hiddenFinding, question.question);
    }
    if (changed) plan.changes.push(change);
  }
  return plan;
}

/** Backs up every touched batch file plus the SQLite index, then writes the re-screened batches. */
export async function applyKidAudienceBankMigration(plan: KidAudienceMigrationPlan, backupDir: string): Promise<void> {
  await backUpBankSqlite(plan.bankRoot, backupDir);
  for (const change of plan.changes) await backUpBankFile(plan.bankRoot, backupDir, change.filePath);
  for (const change of plan.changes) await writeJsonAtomic(change.filePath, BankSubtopicBatchSchema.parse(change.batch));
}
