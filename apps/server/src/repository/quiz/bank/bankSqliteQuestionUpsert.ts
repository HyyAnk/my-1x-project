import type { BankQuestionRow } from "./bankSqliteMapper.js";

/** Column order shared by the upsert statement and `bankQuestionRowValues`. */
const BANK_QUESTION_COLUMNS = [
  "id",
  "entity_id",
  "archetype_id",
  "domain_id",
  "subtopic_id",
  "language",
  "question",
  "highlight_phrase",
  "format",
  "choices",
  "correct_choice_id",
  "explanation",
  "fun_fact",
  "visual_spec",
  "age_band",
  "difficulty",
  "thinking_seconds",
  "tags",
  "status",
  "created_at",
  "updated_at",
  "translations",
] as const satisfies readonly (keyof BankQuestionRow)[];

const UPDATABLE_COLUMNS = BANK_QUESTION_COLUMNS.filter((column) => column !== "id");

/** Inserts a bank question row or replaces every column of the existing row with the same id. */
export const BANK_QUESTION_UPSERT_SQL = `
  INSERT INTO bank_questions (${BANK_QUESTION_COLUMNS.join(", ")})
  VALUES (${BANK_QUESTION_COLUMNS.map(() => "?").join(", ")})
  ON CONFLICT(id) DO UPDATE SET
    ${UPDATABLE_COLUMNS.map((column) => `${column} = excluded.${column}`).join(",\n    ")};
`;

/** Positional parameters for `BANK_QUESTION_UPSERT_SQL`. */
export function bankQuestionRowValues(row: BankQuestionRow): (string | number | null)[] {
  return BANK_QUESTION_COLUMNS.map((column) => (column === "translations" ? (row.translations ?? "{}") : row[column]));
}
