import type { QuizV2 } from "@studio/shared";
import type { ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import type { QuizAnswerKey, SpoilerLeak } from "./description.types.js";

/** Binary verdict questions ("True"/"False", "Yes"/"No") use generic words that cannot be matched reliably. */
const BINARY_CHOICE_COUNT = 2;
const MIN_ANSWER_LENGTH = 3;
const SENTENCE_BOUNDARY = /(?<=[.!?。！？])\s*|\n+/u;
const CJK_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

function normalizeForMatch(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(haystack: string, term: string): boolean {
  if (CJK_SCRIPT.test(term)) return haystack.includes(term);
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "u").test(haystack);
}

function uniqueTerms(texts: Array<string | undefined>): string[] {
  return Array.from(new Set(texts.filter((text): text is string => Boolean(text)).map(normalizeForMatch))).filter(
    (text) => text.length >= MIN_ANSWER_LENGTH,
  );
}

/**
 * Builds the answer key (original and localized wording) used to detect spoilers.
 * Answers already printed in the question text are excluded because naming them reveals nothing.
 */
export function buildQuizAnswerKeys(quiz: QuizV2, localization?: ProductLocalizationArtifact | null): QuizAnswerKey[] {
  const keys: QuizAnswerKey[] = [];
  for (const question of quiz.questions) {
    if (question.choices.length === BINARY_CHOICE_COUNT) continue;
    const localized = localization?.status === "applied" ? localization.quiz_questions?.find((item) => item.question_id === question.id) : undefined;
    const questionText = normalizeForMatch(`${question.question} ${localized?.question ?? ""}`);
    const textsFor = (choiceId: string) => [
      question.choices.find((choice) => choice.id === choiceId)?.text,
      localized?.choices.find((choice) => choice.id === choiceId)?.text,
    ];
    const correctTexts = uniqueTerms(textsFor(question.correct_choice_id)).filter((term) => !containsTerm(questionText, term));
    if (correctTexts.length === 0) continue;
    const distractorTexts = uniqueTerms(
      question.choices.filter((choice) => choice.id !== question.correct_choice_id).flatMap((choice) => textsFor(choice.id)),
    );
    keys.push({ questionId: question.id, correctTexts, distractorTexts });
  }
  return keys;
}

/**
 * Flags sentences that name a correct answer without also naming a distractor.
 * Listing every option ("Egypt, Greece or Rome?") is a teaser, not a spoiler.
 */
export function findSpoilerLeaks(text: string, answerKeys: QuizAnswerKey[]): SpoilerLeak[] {
  if (!text.trim() || answerKeys.length === 0) return [];
  const sentences = text.split(SENTENCE_BOUNDARY).map((sentence) => sentence.trim()).filter(Boolean);
  const leaks: SpoilerLeak[] = [];
  for (const sentence of sentences) {
    const normalized = normalizeForMatch(sentence);
    for (const key of answerKeys) {
      const answerText = key.correctTexts.find((term) => containsTerm(normalized, term));
      if (!answerText || key.distractorTexts.some((term) => containsTerm(normalized, term))) continue;
      leaks.push({ questionId: key.questionId, answerText, sentence });
    }
  }
  return leaks;
}

/** Collects the viewer-facing copy fields of a raw LLM description payload. */
export function collectPublicDescriptionCopy(rawJson: Record<string, unknown>): string {
  const scoring = rawJson.scoring_cta && typeof rawJson.scoring_cta === "object" ? (rawJson.scoring_cta as Record<string, unknown>) : {};
  return [rawJson.hook_lines, rawJson.semantic_paragraph, scoring.beginner, scoring.intermediate, scoring.expert, scoring.cta_text]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}
