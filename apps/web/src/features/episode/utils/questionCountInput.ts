import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";

export function clampQuestionCount(count: number): number {
  return Math.max(QUIZ_MIN_QUESTION_COUNT, Math.min(QUIZ_MAX_QUESTION_COUNT, Math.round(count)));
}

export function sanitizeQuestionCountInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, String(QUIZ_MAX_QUESTION_COUNT).length);
}

export function resolveQuestionCountInput(raw: string, fallback: number): number {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? clampQuestionCount(parsed) : fallback;
}
