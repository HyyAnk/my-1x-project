import { readFile } from "node:fs/promises";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { BankSubtopicBatchSchema, type BankQuestion } from "@studio/shared";
import { writeJsonAtomic } from "../../../../utils/fs.js";
import { rowToBankQuestion, type BankQuestionRow } from "../../../../repository/quiz/bank/bankSqliteMapper.js";
import { reviewQuestionForKidAudience } from "../../kidSafety/kidAudienceReview.js";
import { backUpBankFile, backUpBankSqlite, listBankBatchFiles } from "../../maintenance/bankBatchFiles.js";
import type { KidReadabilityRewrite } from "./kidReadabilityRewrite.types.js";

export interface KidReadabilityApplyResult {
  filesWritten: number;
  questionsUpdated: number;
  rowsUpdated: number;
}

/** Applies the rewritten narration, then re-measures the audience (age band, difficulty, safety) from the new text. */
function applyRewrite(question: BankQuestion, rewrite: KidReadabilityRewrite, now: string): BankQuestion {
  const rewritten: BankQuestion = { ...question, explanation: rewrite.explanation, fun_fact: rewrite.funFact, updated_at: now };
  return reviewQuestionForKidAudience(rewritten).question;
}

async function applyToBatchFiles(bankRoot: string, rewrites: ReadonlyMap<string, KidReadabilityRewrite>, backupDir: string, now: string) {
  let filesWritten = 0;
  let questionsUpdated = 0;
  for (const filePath of await listBankBatchFiles(bankRoot)) {
    const batch = BankSubtopicBatchSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
    const touched = batch.questions.filter((question) => rewrites.has(question.id) && question.status === "approved");
    if (touched.length === 0) continue;
    await backUpBankFile(bankRoot, backupDir, filePath);
    const questions = batch.questions.map((question) =>
      touched.includes(question) ? applyRewrite(question, rewrites.get(question.id)!, now) : question,
    );
    await writeJsonAtomic(filePath, BankSubtopicBatchSchema.parse({ ...batch, questions }));
    filesWritten += 1;
    questionsUpdated += touched.length;
  }
  return { filesWritten, questionsUpdated };
}

function applyToSqliteRows(db: SqliteDatabase, rewrites: ReadonlyMap<string, KidReadabilityRewrite>, now: string): number {
  const loadRow = db.prepare("SELECT * FROM bank_questions WHERE id = ? AND status = 'approved';");
  const update = db.prepare(
    "UPDATE bank_questions SET explanation = ?, fun_fact = ?, age_band = ?, difficulty = ?, status = ?, tags = ?, updated_at = ? WHERE id = ?;",
  );
  let rowsUpdated = 0;
  db.exec("BEGIN;");
  try {
    for (const [id, rewrite] of rewrites) {
      const row = loadRow.get(id) as unknown as BankQuestionRow | undefined;
      if (!row) continue;
      const next = applyRewrite(rowToBankQuestion(row), rewrite, now);
      update.run(next.explanation, next.fun_fact, next.age_band, next.difficulty, next.status, JSON.stringify(next.tags), now, id);
      rowsUpdated += 1;
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  return rowsUpdated;
}

/**
 * Writes accepted kid-friendly rewrites into the JSON batch files (the source of truth) and the SQLite index.
 * Every touched file and the database are backed up first; archived questions are never modified.
 */
export async function applyKidReadabilityRewritesToBank(
  bankRoot: string,
  db: SqliteDatabase,
  rewrites: ReadonlyMap<string, KidReadabilityRewrite>,
  backupDir: string,
): Promise<KidReadabilityApplyResult> {
  const now = new Date().toISOString();
  await backUpBankSqlite(bankRoot, backupDir);
  const files = await applyToBatchFiles(bankRoot, rewrites, backupDir, now);
  return { ...files, rowsUpdated: applyToSqliteRows(db, rewrites, now) };
}
