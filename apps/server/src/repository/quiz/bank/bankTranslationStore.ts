import { normalizeLanguageCode, type BankQuestion, type BankTranslationContent } from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { getQuestionBankQuestionUnlocked } from "./bankQueryEngine.js";
import { withBankRead, withBankWrite } from "./bankSerializationBoundary.js";
import { assertTranslationWritesRetired } from "./bankWritePolicy.js";

/**
 * Saves a translated version of a question to its corresponding batch file.
 */
export async function saveQuestionBankTranslationUnlocked(
  this: RepositoryRuntime,
  questionId: string,
  translation: BankTranslationContent,
): Promise<BankQuestion | null> {
  void questionId;
  void translation;
  assertTranslationWritesRetired();
}

export function saveQuestionBankTranslation(
  this: RepositoryRuntime,
  questionId: string,
  translation: BankTranslationContent,
): Promise<BankQuestion | null> {
  return withBankWrite(this, () => saveQuestionBankTranslationUnlocked.call(this, questionId, translation));
}

/**
 * Reads a cached translation for a specific question and target language.
 */
export async function readQuestionBankTranslationUnlocked(
  this: RepositoryRuntime,
  questionId: string,
  language: string,
): Promise<BankTranslationContent | null> {
  const question = await getQuestionBankQuestionUnlocked.call(this, questionId);
  if (!question || !question.translations) {
    return null;
  }
  const normLang = normalizeLanguageCode(language);
  return question.translations[normLang] || null;
}

export function readQuestionBankTranslation(
  this: RepositoryRuntime,
  questionId: string,
  language: string,
): Promise<BankTranslationContent | null> {
  return withBankRead(this, () => readQuestionBankTranslationUnlocked.call(this, questionId, language));
}
