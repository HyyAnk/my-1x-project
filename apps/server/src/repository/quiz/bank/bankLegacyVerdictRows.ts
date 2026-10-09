import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { LEGACY_VERDICT_ARCHETYPE_IDS } from "@studio/shared";
import { bankQuestionToRow, rowToBankQuestion, type BankQuestionRow } from "./bankSqliteMapper.js";

const LEGACY_ARCHETYPE_LIST = LEGACY_VERDICT_ARCHETYPE_IDS.map((id) => `'${id}'`).join(", ");

/**
 * Rewrites rows still stored with the retired True/False verdict identifiers into canonical Yes/No rows.
 * Idempotent: once no legacy rows remain, this is a single indexed lookup.
 */
export function normalizeLegacyVerdictRows(db: SqliteDatabase): number {
  const legacyRows = db
    .prepare(`SELECT * FROM bank_questions WHERE archetype_id IN (${LEGACY_ARCHETYPE_LIST}) OR format = 'true_false';`)
    .all() as unknown as BankQuestionRow[];
  if (legacyRows.length === 0) return 0;

  const update = db.prepare(
    "UPDATE bank_questions SET archetype_id = ?, format = ?, question = ?, choices = ?, translations = ? WHERE id = ?;",
  );
  db.exec("BEGIN;");
  try {
    for (const legacyRow of legacyRows) {
      const row = bankQuestionToRow(rowToBankQuestion(legacyRow));
      update.run(row.archetype_id, row.format, row.question, row.choices, row.translations ?? "{}", row.id);
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  return legacyRows.length;
}
