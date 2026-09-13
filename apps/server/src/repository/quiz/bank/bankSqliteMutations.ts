import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import type { BankQuestion } from "@studio/shared";
import { bankQuestionToRow } from "./bankSqliteMapper.js";

export function upsertBankQuestionSqlite(db: SqliteDatabase, question: BankQuestion): void {
  const row = bankQuestionToRow(question);
  const stmt = db.prepare(`
    INSERT INTO bank_questions (
      id, entity_id, archetype_id, domain_id, subtopic_id, language, question,
      format, choices, correct_choice_id, explanation, fun_fact, visual_spec,
      age_band, difficulty, thinking_seconds, tags, status, created_at, updated_at, translations
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      entity_id = excluded.entity_id,
      archetype_id = excluded.archetype_id,
      domain_id = excluded.domain_id,
      subtopic_id = excluded.subtopic_id,
      language = excluded.language,
      question = excluded.question,
      format = excluded.format,
      choices = excluded.choices,
      correct_choice_id = excluded.correct_choice_id,
      explanation = excluded.explanation,
      fun_fact = excluded.fun_fact,
      visual_spec = excluded.visual_spec,
      age_band = excluded.age_band,
      difficulty = excluded.difficulty,
      thinking_seconds = excluded.thinking_seconds,
      tags = excluded.tags,
      status = excluded.status,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      translations = excluded.translations;
  `);

  stmt.run(
    row.id,
    row.entity_id,
    row.archetype_id,
    row.domain_id,
    row.subtopic_id,
    row.language,
    row.question,
    row.format,
    row.choices,
    row.correct_choice_id,
    row.explanation,
    row.fun_fact,
    row.visual_spec,
    row.age_band,
    row.difficulty,
    row.thinking_seconds,
    row.tags,
    row.status,
    row.created_at,
    row.updated_at,
    row.translations ?? "{}",
  );
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
  const row = db
    .prepare("SELECT archetype_id, domain_id, subtopic_id FROM bank_questions WHERE id = ? LIMIT 1;")
    .get(id) as { archetype_id: string; domain_id: string; subtopic_id: string } | undefined;
  if (!row) return null;
  return row;
}
