import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { rowToBankQuestion, type BankQuestionRow } from "../../../repository/quiz/bank/bankSqliteMapper.js";
import { reviewQuestionForKidAudience, type KidAudienceReviewOptions } from "../kidSafety/kidAudienceReview.js";

export interface KidAudienceRowUpdateResult {
  totalRows: number;
  updatedRows: number;
  hiddenRows: number;
}

/**
 * Applies the kids and family re-screen to every SQLite bank row, including rows whose batch file no longer
 * exists, so selection reads the new status, tags, age band, and difficulty without waiting for a JSON resync.
 */
export function applyKidAudienceReviewToRows(db: SqliteDatabase, reviewOptions: KidAudienceReviewOptions = {}): KidAudienceRowUpdateResult {
  const rows = db.prepare("SELECT * FROM bank_questions;").all() as unknown as BankQuestionRow[];
  const update = db.prepare("UPDATE bank_questions SET status = ?, tags = ?, age_band = ?, difficulty = ? WHERE id = ?;");
  const result: KidAudienceRowUpdateResult = { totalRows: rows.length, updatedRows: 0, hiddenRows: 0 };
  db.exec("BEGIN;");
  try {
    for (const row of rows) {
      const review = reviewQuestionForKidAudience(rowToBankQuestion(row), reviewOptions);
      if (!review.changed) continue;
      const { status, tags, age_band, difficulty } = review.question;
      update.run(status, JSON.stringify(tags), age_band, difficulty, row.id);
      result.updatedRows += 1;
      if (review.hiddenFinding) result.hiddenRows += 1;
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  return result;
}
