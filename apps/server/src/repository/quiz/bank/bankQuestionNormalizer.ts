import { isLegacyVerdictIdentifier, type BankChoice, type BankQuestion, type BankTranslationContent } from "@studio/shared";

/**
 * Normalizes question text from legacy "True or False?" phrasing to "Yes or No?".
 */
export function normalizeVerdictQuestionText(questionText: string): string {
  if (!questionText || typeof questionText !== "string") return questionText;
  const trimmed = questionText.trim();
  const tfRegex = /\s*[:\-—–]?\s*(?:true\s+or\s+false|fact\s+or\s+myth)\s*\??$/i;
  if (tfRegex.test(trimmed)) {
    return trimmed.replace(tfRegex, " Yes or No?").trim();
  }
  return trimmed;
}

/**
 * Normalizes choice items: "True" / "Fact" -> "Yes", "False" / "Myth" -> "No".
 */
export function normalizeVerdictChoices(choices: BankChoice[]): BankChoice[] {
  if (!Array.isArray(choices)) return choices;
  return choices.map((choice) => {
    const textTrimmed = choice.text.trim();
    if (/^(true|fact)$/i.test(textTrimmed)) {
      return { ...choice, text: "Yes" };
    }
    if (/^(false|myth)$/i.test(textTrimmed)) {
      return { ...choice, text: "No" };
    }
    return choice;
  });
}

/**
 * Normalizes translations for verdict questions.
 */
function normalizeVerdictTranslations(
  translations?: Record<string, BankTranslationContent>,
): Record<string, BankTranslationContent> | undefined {
  if (!translations || typeof translations !== "object") return translations;
  const result: Record<string, BankTranslationContent> = {};
  for (const [lang, trans] of Object.entries(translations)) {
    result[lang] = {
      ...trans,
      question: normalizeVerdictQuestionText(trans.question),
      choices: trans.choices.map((c) => {
        const text = c.text.trim();
        if (/^true$/i.test(text)) return { ...c, text: "Yes" };
        if (/^false$/i.test(text)) return { ...c, text: "No" };
        return c;
      }),
    };
  }
  return result;
}

/**
 * Transparently upgrades legacy True/False and Fact/Myth bank questions into Yes/No format.
 * Preserves all non-verdict questions unmodified.
 */
export function normalizeVerdictQuestion(question: BankQuestion): BankQuestion {
  // Rows read straight from SQLite bypass schema parsing, so retired identifiers can still appear here.
  const rawArchetype: string = question.archetype_id;
  const rawFormat: string = question.format;
  const isVerdictArchetype = rawArchetype === "verdict_yes_no" || isLegacyVerdictIdentifier(rawArchetype);
  const isVerdictFormat = rawFormat === "yes_no" || isLegacyVerdictIdentifier(rawFormat);

  if (!isVerdictArchetype && !isVerdictFormat) {
    return question;
  }

  const normalizedChoices = normalizeVerdictChoices(question.choices);
  const normalizedQuestion = normalizeVerdictQuestionText(question.question);
  const normalizedTranslations = normalizeVerdictTranslations(question.translations);

  const targetArchetype =
    isVerdictArchetype || !question.archetype_id ? "verdict_yes_no" : question.archetype_id;

  return {
    ...question,
    archetype_id: targetArchetype,
    format: "yes_no",
    question: normalizedQuestion,
    choices: normalizedChoices,
    ...(normalizedTranslations !== undefined ? { translations: normalizedTranslations } : {}),
  };
}
