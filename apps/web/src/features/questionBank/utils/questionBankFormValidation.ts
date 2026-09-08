import type { BankChoice } from "@studio/shared";

export type QuestionBankTranslator = (path: string) => string;

/**
 * Validates the manual question form before saving.
 * Returns a localized error message, or null when the form is valid.
 */
export function validateQuestionForm(
  questionText: string,
  explanation: string,
  choices: BankChoice[],
  t: QuestionBankTranslator,
): string | null {
  if (!questionText.trim()) return t("questionBank.form.errorEnterQuestion");
  if (!explanation.trim()) return t("questionBank.form.errorEnterExplanation");
  if (!choices.some((c) => c.is_correct)) return t("questionBank.form.errorSelectCorrect");
  return null;
}
