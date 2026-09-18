import type {
  BankQuestion,
  BankChoice,
  BankGameplayArchetypeId,
  QuizQuestionFormat,
  QuizAgeBand,
  BankQuestionStatus,
} from "@studio/shared";

export interface BankQuestionRow {
  id: string;
  entity_id: string | null;
  archetype_id: string;
  domain_id: string;
  subtopic_id: string;
  language: string | null;
  question: string;
  format: string;
  choices: string;
  correct_choice_id: string;
  explanation: string;
  fun_fact: string | null;
  visual_spec: string | null;
  age_band: string;
  difficulty: number;
  thinking_seconds: number | null;
  tags: string;
  status: string;
  created_at: string;
  updated_at: string;
  translations: string | null;
}

export function bankQuestionToRow(question: BankQuestion): BankQuestionRow {
  const normalizedArchetype = question.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : question.archetype_id;
  const now = new Date().toISOString();

  return {
    id: question.id,
    entity_id: question.entity_id ?? null,
    archetype_id: normalizedArchetype,
    domain_id: question.domain_id,
    subtopic_id: question.subtopic_id,
    language: question.language ?? null,
    question: question.question,
    format: question.format ?? "multiple_choice",
    choices: JSON.stringify(question.choices),
    correct_choice_id: question.correct_choice_id,
    explanation: question.explanation,
    fun_fact: question.fun_fact !== undefined ? question.fun_fact : null,
    visual_spec: question.visual_spec ? JSON.stringify(question.visual_spec) : null,
    age_band: question.age_band ?? "family",
    difficulty: question.difficulty ?? 2,
    thinking_seconds: question.thinking_seconds !== undefined ? question.thinking_seconds : null,
    tags: JSON.stringify(question.tags ?? []),
    status: question.status ?? "approved",
    created_at: question.created_at || now,
    updated_at: question.updated_at || now,
    translations: question.translations ? JSON.stringify(question.translations) : null,
  };
}

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const val: unknown = JSON.parse(raw);
    return val as T;
  } catch {
    return fallback;
  }
}

export function rowToBankQuestion(row: BankQuestionRow): BankQuestion {
  const parsedChoices = parseJsonSafe<BankChoice[]>(row.choices, []);
  const parsedTags = parseJsonSafe<string[]>(row.tags, []);
  const parsedVisualSpec = row.visual_spec ? parseJsonSafe<BankQuestion["visual_spec"]>(row.visual_spec, undefined) : undefined;
  const parsedTranslations =
    row.translations && row.translations !== "{}" && row.translations !== "null"
      ? parseJsonSafe<BankQuestion["translations"]>(row.translations, undefined)
      : undefined;

  const question: BankQuestion = {
    id: row.id,
    archetype_id: row.archetype_id as BankGameplayArchetypeId,
    domain_id: row.domain_id,
    subtopic_id: row.subtopic_id,
    question: row.question,
    format: row.format as QuizQuestionFormat,
    choices: parsedChoices,
    correct_choice_id: row.correct_choice_id,
    explanation: row.explanation,
    fun_fact: row.fun_fact ?? "",
    age_band: row.age_band as QuizAgeBand,
    difficulty: row.difficulty,
    tags: parsedTags,
    status: row.status as BankQuestionStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.entity_id) question.entity_id = row.entity_id;
  if (row.language) question.language = row.language;
  if (parsedVisualSpec !== undefined) question.visual_spec = parsedVisualSpec;
  if (row.thinking_seconds !== null && row.thinking_seconds !== undefined) {
    question.thinking_seconds = row.thinking_seconds;
  }
  if (parsedTranslations !== undefined) question.translations = parsedTranslations;

  return question;
}
