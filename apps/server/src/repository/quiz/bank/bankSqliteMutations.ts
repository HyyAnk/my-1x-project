import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import type { BankQuestion } from "@studio/shared";
import { bankQuestionToRow } from "./bankSqliteMapper.js";
import { BANK_QUESTION_UPSERT_SQL, bankQuestionRowValues } from "./bankSqliteQuestionUpsert.js";

export function upsertBankQuestionSqlite(db: SqliteDatabase, question: BankQuestion): void {
  const row = bankQuestionToRow(question);
  db.prepare(BANK_QUESTION_UPSERT_SQL).run(...bankQuestionRowValues(row));
}

export function deleteBankQuestionSqlite(db: SqliteDatabase, id: string): boolean {
  const stmt = db.prepare("DELETE FROM bank_questions WHERE id = ?;");
  const result = stmt.run(id) as { changes?: number };
  return (result?.changes ?? 0) > 0;
}

export function clearBankQuestionsSqlite(db: SqliteDatabase): void {
  db.exec("DELETE FROM bank_questions; DELETE FROM bank_json_sync;");
}

export function getBankQuestionLocationSqlite(
  db: SqliteDatabase,
  id: string,
): { archetype_id: string; domain_id: string; subtopic_id: string } | null {
  const row = db.prepare("SELECT archetype_id, domain_id, subtopic_id FROM bank_questions WHERE id = ? LIMIT 1;").get(id) as
    { archetype_id: string; domain_id: string; subtopic_id: string } | undefined;
  if (!row) return null;
  return row;
}
