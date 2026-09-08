import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BankTranslationContentSchema, normalizeLanguageCode, type BankQuestion, type BankTranslationContent } from "@studio/shared";
import type { RepositoryRuntime } from "../../runtime.js";
import { getQuestionBankWritePath } from "./bankPathResolver.js";
import { listQuestionBankBatches } from "./bankBatchStorage.js";
import { getQuestionBankQuestion } from "./bankQueryEngine.js";

/**
 * Saves a translated version of a question to its corresponding batch file.
 */
export async function saveQuestionBankTranslation(
  this: RepositoryRuntime,
  questionId: string,
  translation: BankTranslationContent,
): Promise<BankQuestion | null> {
  const validatedTranslation = BankTranslationContentSchema.parse(translation);
  const normLang = normalizeLanguageCode(validatedTranslation.language);

  const batches = await listQuestionBankBatches.call(this);
  for (const batch of batches) {
    const qIndex = batch.questions.findIndex((q) => q.id === questionId);
    if (qIndex >= 0) {
      const question = batch.questions[qIndex];
      const now = new Date().toISOString();
      const existingTranslations = question.translations || {};

      const updatedQuestion: BankQuestion = {
        ...question,
        translations: {
          ...existingTranslations,
          [normLang]: {
            ...validatedTranslation,
            language: normLang,
            translated_at: validatedTranslation.translated_at || now,
          },
        },
        updated_at: now,
      };

      batch.questions[qIndex] = updatedQuestion;
      batch.updated_at = now;

      const batchFilePath = getQuestionBankWritePath.call(this, batch.archetype_id, batch.domain_id, `${batch.subtopic_id}.json`);
      await mkdir(path.dirname(batchFilePath), { recursive: true });
      await this.writeJsonAtomic(batchFilePath, batch);

      if (batch.archetype_id === "verdict_true_false") {
        const legacyPath = getQuestionBankWritePath.call(this, "verdict_fact_myth", batch.domain_id, `${batch.subtopic_id}.json`);
        if (existsSync(legacyPath)) {
          await this.writeJsonAtomic(legacyPath, batch);
        }
      }

      return updatedQuestion;
    }
  }

  return null;
}

/**
 * Reads a cached translation for a specific question and target language.
 */
export async function readQuestionBankTranslation(
  this: RepositoryRuntime,
  questionId: string,
  language: string,
): Promise<BankTranslationContent | null> {
  const question = await getQuestionBankQuestion.call(this, questionId);
  if (!question || !question.translations) {
    return null;
  }
  const normLang = normalizeLanguageCode(language);
  return question.translations[normLang] || null;
}
