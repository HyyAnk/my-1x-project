import type {
  BankQuestion,
  BankChoice,
  BankGameplayArchetypeId,
  QuizQuestionFormat,
  QuizAgeBand,
  BankQuestionStatus,
} from "@studio/shared";
import { normalizeVerdictQuestion } from "./bankQuestionNormalizer.js";

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
  const normalized = normalizeVerdictQuestion(question);
  const now = new Date().toISOString();

  return {
    id: normalized.id,
    entity_id: normalized.entity_id ?? null,
    archetype_id: normalized.archetype_id,
    domain_id: normalized.domain_id,
    subtopic_id: normalized.subtopic_id,
    language: normalized.language ?? null,
    question: normalized.question,
    format: normalized.format ?? "multiple_choice",
    choices: JSON.stringify(normalized.choices),
    correct_choice_id: normalized.correct_choice_id,
    explanation: normalized.explanation,
    fun_fact: normalized.fun_fact !== undefined ? normalized.fun_fact : null,
    visual_spec: normalized.visual_spec ? JSON.stringify(normalized.visual_spec) : null,
    age_band: normalized.age_band ?? "family",
    difficulty: normalized.difficulty ?? 2,
    thinking_seconds: normalized.thinking_seconds !== undefined ? normalized.thinking_seconds : null,
    tags: JSON.stringify(normalized.tags ?? []),
    status: normalized.status ?? "approved",
    created_at: normalized.created_at || now,
    updated_at: normalized.updated_at || now,
    translations: normalized.translations ? JSON.stringify(normalized.translations) : null,
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

  return normalizeVerdictQuestion(question);
}
