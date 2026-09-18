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
  archetypeId?: string,
): string | null {
  if (!questionText.trim()) return t("questionBank.form.errorEnterQuestion");
  if (!explanation.trim()) return t("questionBank.form.errorEnterExplanation");
  if (archetypeId === "mystery_reveal" || archetypeId === "mystery") {
    if (choices.length !== 1)
      return t("questionBank.form.errorMysterySingleChoice") || "Mystery questions must have exactly 1 reveal answer.";
    if (!choices[0].text.trim()) return t("questionBank.form.errorEnterRevealAnswer") || "Please enter the reveal answer.";
    return null;
  }
  if (choices.length < 2) return t("questionBank.form.errorMinChoices") || "At least 2 choices are required.";
  if (!choices.some((c) => c.is_correct)) return t("questionBank.form.errorSelectCorrect");
  return null;
}
