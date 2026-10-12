import type { DatabaseSync as SqliteDatabase } from "node:sqlite";

/** Columns added after the original `bank_questions` table shipped, with their SQL definitions. */
const ADDED_BANK_QUESTION_COLUMNS: ReadonlyArray<{ name: string; definition: string }> = [
  { name: "highlight_phrase", definition: "TEXT DEFAULT NULL" },
];

function existingColumnNames(db: SqliteDatabase): Set<string> {
  const columns = db.prepare("PRAGMA table_info(bank_questions);").all() as unknown as Array<{ name: string }>;
  return new Set(columns.map((column) => column.name));
}

/**
 * Adds any missing columns to an existing bank database. When a column is added, the JSON sync ledger is
 * cleared so the next sync re-imports every batch file and fills the new column from the JSON source of truth.
 */
export function upgradeBankQuestionColumns(db: SqliteDatabase): void {
  const existing = existingColumnNames(db);
  const missing = ADDED_BANK_QUESTION_COLUMNS.filter((column) => !existing.has(column.name));
  if (missing.length === 0) return;
  for (const column of missing) db.exec(`ALTER TABLE bank_questions ADD COLUMN ${column.name} ${column.definition};`);
  db.exec("DELETE FROM bank_json_sync;");
}
