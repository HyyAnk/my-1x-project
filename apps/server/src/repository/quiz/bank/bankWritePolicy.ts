import type { BankQuestion, BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../errors.js";

const ENGLISH_LANGUAGE = "en";

function rejectLanguage(language: string | undefined, subject: string): never {
  const detail = language === undefined ? "is required" : `must be "${ENGLISH_LANGUAGE}"`;
  throw new RepositoryError(`${subject} language ${detail}`, "BANK_ENGLISH_ONLY");
}

function assertEnglishLanguage(language: string | undefined, subject: string): void {
  if (language !== ENGLISH_LANGUAGE) rejectLanguage(language, subject);
}

function assertNoTranslationWrite(question: BankQuestion): void {
  if (question.translations && Object.keys(question.translations).length > 0) {
    throw new RepositoryError(
      "Question Bank translation writes are retired; persist the English source question only",
      "BANK_TRANSLATION_WRITES_RETIRED",
    );
  }
}

export function assertEnglishQuestionWrite(question: BankQuestion): void {
  assertEnglishLanguage(question.language, "Question Bank question");
  assertNoTranslationWrite(question);
}

export function assertEnglishBatchWrite(batch: BankSubtopicBatch): void {
  for (const question of batch.questions) {
    assertEnglishQuestionWrite(question);
  }
}

export function assertTranslationWritesRetired(): never {
  throw new RepositoryError(
    "Question Bank translation writes are retired; translations must be generated in product-owned storage",
    "BANK_TRANSLATION_WRITES_RETIRED",
  );
}
