import path from "node:path";
import { QUESTION_BANK_DIR } from "../bankPathResolver.js";
import type { BankQuestion, BankSubtopicBatch } from "@studio/shared";

/**
 * Normalizes question archetype identifiers and defaults.
 */
export function normalizeBankQuestion(question: BankQuestion): BankQuestion {
  return {
    ...question,
    archetype_id: question.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : question.archetype_id,
  };
}

/**
 * Resolves all physical file candidates for a given subtopic batch across runtime and project roots.
 */
export function resolveBatchCandidatePaths(
  runtimeBankRoot: string,
  rootDirectory: string,
  isRedirectedRuntime: boolean,
  archetypeId: string,
  domainId: string,
  subtopicId: string,
): string[] {
  const candidatePaths = [path.join(runtimeBankRoot, archetypeId, domainId, `${subtopicId}.json`)];
  if (!isRedirectedRuntime) {
    candidatePaths.push(path.join(rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, archetypeId, domainId, `${subtopicId}.json`));
  }
  if (archetypeId === "verdict_true_false") {
    candidatePaths.push(path.join(runtimeBankRoot, "verdict_fact_myth", domainId, `${subtopicId}.json`));
    if (!isRedirectedRuntime) {
      candidatePaths.push(path.join(rootDirectory, ".quiz-studio", QUESTION_BANK_DIR, "verdict_fact_myth", domainId, `${subtopicId}.json`));
    }
  }
  return [...new Set(candidatePaths)];
}

/**
 * Prepares subtopic batch and stamped question entity for save.
 */
export function prepareBatchForSave(
  existing: BankSubtopicBatch | null,
  validated: BankQuestion,
): { batch: BankSubtopicBatch; toSave: BankQuestion } {
  const now = new Date().toISOString();
  const batch: BankSubtopicBatch = existing ?? {
    schema_version: 2,
    archetype_id: validated.archetype_id,
    domain_id: validated.domain_id,
    subtopic_id: validated.subtopic_id,
    subtopic_title: validated.subtopic_id.replaceAll("_", " "),
    updated_at: now,
    questions: [],
  };

  const existingIndex = batch.questions.findIndex((q) => q.id === validated.id);
  const toSave: BankQuestion = {
    ...validated,
    updated_at: now,
    created_at: validated.created_at || now,
  };

  if (existingIndex >= 0) {
    batch.questions[existingIndex] = toSave;
  } else {
    batch.questions.push(toSave);
  }

  batch.updated_at = now;
  return { batch, toSave };
}
