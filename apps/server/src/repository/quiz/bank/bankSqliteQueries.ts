import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { LEGACY_VERDICT_ARCHETYPE_IDS, isLegacyVerdictIdentifier, normalizeLanguageCode, type BankQuestion } from "@studio/shared";
import { normalizeQuestionText } from "../../../quiz/qa/questionHistory.js";
import { rowToBankQuestion, type BankQuestionRow } from "./bankSqliteMapper.js";
import type { QueryQuestionBankParams } from "./bankQueryEngine.js";

export function queryBankQuestionsSqlite(
  db: SqliteDatabase,
  params: QueryQuestionBankParams = {},
): { questions: BankQuestion[]; total: number } {
  const { whereClause, bindings } = buildWhereClause(params);

  const countSql = `SELECT COUNT(*) as total FROM bank_questions ${whereClause};`;
  const countRow = db.prepare(countSql).get(...bindings) as { total: number } | undefined;
  const total = Number(countRow?.total ?? 0);

  const limit = Math.max(1, params.limit ?? 50);
  const offset = Math.max(0, params.offset ?? 0);

  const selectSql = `
    SELECT * FROM bank_questions
    ${whereClause}
    ORDER BY updated_at DESC, created_at DESC, id DESC
    LIMIT ? OFFSET ?;
  `;

  const rows = db.prepare(selectSql).all(...bindings, limit, offset) as unknown as BankQuestionRow[];
  const questions = rows.map(rowToBankQuestion);

  return { questions, total };
}

export function getBankQuestionByIdSqlite(db: SqliteDatabase, id: string): BankQuestion | null {
  const row = db.prepare("SELECT * FROM bank_questions WHERE id = ? LIMIT 1;").get(id) as unknown as BankQuestionRow | undefined;
  if (!row) return null;
  return rowToBankQuestion(row);
}

export function getAllBankQuestionsSqlite(db: SqliteDatabase): BankQuestion[] {
  const rows = db.prepare("SELECT * FROM bank_questions ORDER BY updated_at DESC;").all() as unknown as BankQuestionRow[];
  return rows.map(rowToBankQuestion);
}

type SqlBinding = string | number | bigint | null;

function buildWhereClause(params: QueryQuestionBankParams): { whereClause: string; bindings: SqlBinding[] } {
  const conditions: string[] = [];
  const bindings: SqlBinding[] = [];

  if (params.archetypeId) {
    if (params.archetypeId === "verdict_yes_no" || isLegacyVerdictIdentifier(params.archetypeId)) {
      conditions.push(`archetype_id IN ('verdict_yes_no', ${LEGACY_VERDICT_ARCHETYPE_IDS.map((id) => `'${id}'`).join(", ")})`);
    } else {
      conditions.push("archetype_id = ?");
      bindings.push(params.archetypeId);
    }
  }

  if (params.domainId) {
    conditions.push("domain_id = ?");
    bindings.push(params.domainId);
  }

  if (params.subtopicId) {
    conditions.push("subtopic_id = ?");
    bindings.push(params.subtopicId);
  }

  if (params.status) {
    conditions.push("status = ?");
    bindings.push(params.status);
  }

  if (params.language?.trim()) {
    conditions.push("LOWER(TRIM(language)) = ?");
    bindings.push(normalizeLanguageCode(params.language));
  }

  if (params.hasTranslationFor?.trim()) {
    const targetLang = normalizeLanguageCode(params.hasTranslationFor);
    conditions.push("(LOWER(TRIM(language)) = ? OR json_extract(translations, '$.' || ?) IS NOT NULL)");
    bindings.push(targetLang, targetLang);
  }

  if (params.search?.trim()) {
    const normSearch = normalizeQuestionText(params.search);
    conditions.push("(LOWER(question) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(explanation) LIKE ? OR LOWER(translations) LIKE ?)");
    const pattern = `%${normSearch.toLowerCase()}%`;
    bindings.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, bindings };
}
