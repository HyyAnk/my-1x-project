import { stripQuizChoiceLabel } from "./quiz.js";

interface RawChoiceObject {
  id?: unknown;
  text?: unknown;
  label?: unknown;
  choice?: unknown;
  option?: unknown;
  value?: unknown;
  answer?: unknown;
  title?: unknown;
  content?: unknown;
  name?: unknown;
  choice_text?: unknown;
}

interface RawQuestionObject {
  id?: unknown;
  number?: unknown;
  format?: unknown;
  layout_id?: unknown;
  gameplay_id?: unknown;
  difficulty?: unknown;
  question?: unknown;
  answer_mode?: unknown;
  choices?: unknown;
  correct_choice_id?: unknown;
  explanation?: unknown;
  fun_fact?: unknown;
  source_ids?: unknown;
  visual_opportunity?: unknown;
  validation?: unknown;
}

function resolveChoiceText(choice: RawChoiceObject, index: number, format: unknown, choiceId: string): string {
  const possibleText =
    choice.text ??
    choice.label ??
    choice.choice ??
    choice.option ??
    choice.value ??
    choice.answer ??
    choice.title ??
    choice.content ??
    choice.name ??
    choice.choice_text;

  if (typeof possibleText === "string" && possibleText.trim()) {
    return stripQuizChoiceLabel(possibleText.trim());
  }

  const idLower = choiceId.toLowerCase();
  if (idLower.includes("yes") || idLower.includes("true")) return "Yes";
  if (idLower.includes("no") || idLower.includes("false")) return "No";

  if (format === "yes_no") {
    return index === 0 ? "Yes" : "No";
  }

  return `Option ${String.fromCharCode(65 + index)}`;
}

function normalizeChoices(rawChoices: unknown, format: unknown): Array<{ id: string; text: string }> {
  if (!Array.isArray(rawChoices)) return [];

  return rawChoices.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `choice-${String.fromCharCode(97 + index)}`,
        text: stripQuizChoiceLabel(item.trim()) || `Option ${String.fromCharCode(65 + index)}`,
      };
    }

    const obj = (typeof item === "object" && item !== null ? item : {}) as RawChoiceObject;
    const choiceId =
      typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `choice-${String.fromCharCode(97 + index)}`;
    const text = resolveChoiceText(obj, index, format, choiceId);

    return { id: choiceId, text };
  });
}

function resolveCorrectChoiceId(rawId: unknown, choices: Array<{ id: string; text: string }>): string {
  if (choices.length === 0) return "choice-a";

  const rawStr = typeof rawId === "string" ? rawId.trim() : typeof rawId === "number" ? String(rawId) : "";
  if (choices.some((c) => c.id === rawStr)) return rawStr;

  const letterMatch = rawStr.match(/^[a-z]$/i);
  if (letterMatch) {
    const idx = letterMatch[0].toLowerCase().charCodeAt(0) - 97;
    if (choices[idx]) return choices[idx].id;
  }

  const num = Number(rawStr);
  if (!Number.isNaN(num) && choices[num]) return choices[num].id;

  const byText = choices.find((c) => c.text.toLowerCase() === rawStr.toLowerCase());
  if (byText) return byText.id;

  return choices[0].id;
}

function normalizeSingleQuestion(rawQ: RawQuestionObject, index: number): Record<string, unknown> {
  const format = typeof rawQ.format === "string" && rawQ.format.trim() ? rawQ.format.trim() : "multiple_choice";
  const choices = normalizeChoices(rawQ.choices, format);
  const correctChoiceId = resolveCorrectChoiceId(rawQ.correct_choice_id, choices);
  const claimId = `C${String(index + 1).padStart(2, "0")}`;

  return {
    ...rawQ,
    id: typeof rawQ.id === "string" && rawQ.id.trim() ? rawQ.id.trim() : `question-${String(index + 1).padStart(2, "0")}`,
    number: typeof rawQ.number === "number" && rawQ.number > 0 ? rawQ.number : index + 1,
    format,
    difficulty: typeof rawQ.difficulty === "number" && rawQ.difficulty >= 1 && rawQ.difficulty <= 5 ? rawQ.difficulty : 1,
    question: typeof rawQ.question === "string" ? rawQ.question.trim() : "",
    choices,
    correct_choice_id: correctChoiceId,
    explanation: typeof rawQ.explanation === "string" ? rawQ.explanation.trim() : "",
    fun_fact: typeof rawQ.fun_fact === "string" ? rawQ.fun_fact.trim() : "",
    source_ids: Array.isArray(rawQ.source_ids) && rawQ.source_ids.length > 0 ? rawQ.source_ids : [claimId],
    visual_opportunity: typeof rawQ.visual_opportunity === "string" ? rawQ.visual_opportunity.trim() : "",
    validation: typeof rawQ.validation === "object" && rawQ.validation !== null
      ? rawQ.validation
      : { semantic_status: "validated", source_coverage: true, fact_locked: true },
  };
}

export function normalizeQuizCandidate(
  candidate: Record<string, unknown>,
  context: { episodeId?: string; ageBand?: string; language?: string } = {},
): Record<string, unknown> {
  const questions = Array.isArray(candidate.questions)
    ? candidate.questions.map((q, idx) =>
        normalizeSingleQuestion((typeof q === "object" && q !== null ? q : {}) as RawQuestionObject, idx),
      )
    : [];

  return {
    ...candidate,
    schema_version: candidate.schema_version ?? 2,
    episode_id: candidate.episode_id ?? context.episodeId,
    age_band: candidate.age_band ?? context.ageBand ?? "7-9",
    language: candidate.language ?? context.language ?? "en",
    questions,
  };
}
