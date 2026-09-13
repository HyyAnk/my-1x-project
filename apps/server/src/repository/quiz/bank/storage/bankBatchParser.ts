import { BankSubtopicBatchSchema, type BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../../errors.js";
import { matchesArchetypeFilter } from "./bankBatchPathGuard.js";

/**
 * Normalizes legacy archetype ID synonyms (e.g. verdict_fact_myth -> verdict_true_false).
 */
/**
 * Normalizes legacy archetype ID synonyms (e.g. verdict_fact_myth -> verdict_true_false).
 */
export function normalizeLegacyArchetype<T extends string>(archetypeId: T): T | "verdict_true_false" {
  return archetypeId === "verdict_fact_myth" ? "verdict_true_false" : archetypeId;
}

/**
 * Normalizes legacy archetype IDs in both the batch and its nested questions.
 */
export function normalizeBatchLegacyArchetypes(batch: BankSubtopicBatch): BankSubtopicBatch {
  const normalizedArch: BankSubtopicBatch["archetype_id"] =
    batch.archetype_id === "verdict_fact_myth" ? "verdict_true_false" : batch.archetype_id;
  const questions = batch.questions.map((question) =>
    question.archetype_id === "verdict_fact_myth"
      ? { ...question, archetype_id: "verdict_true_false" as const }
      : question,
  );
  return {
    ...batch,
    archetype_id: normalizedArch,
    questions,
  };
}

/**
 * Asserts that all nested questions belong to the same archetype, domain, and subtopic as the batch.
 */
export function assertNestedQuestionMembership(batch: BankSubtopicBatch, sourcePath: string): void {
  for (const question of batch.questions) {
    const archetypeMatches = matchesArchetypeFilter(batch.archetype_id, question.archetype_id);
    if (question.domain_id !== batch.domain_id || question.subtopic_id !== batch.subtopic_id || !archetypeMatches) {
      throw new RepositoryError(`Question membership does not match batch ${sourcePath}`, "BANK_BATCH_INCONSISTENT");
    }
  }
}

/**
 * Parses raw JSON string into unknown data, wrapping errors in RepositoryError.
 */
export function parseBatchJson(raw: string, sourcePath: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new RepositoryError(`Malformed JSON in batch file ${sourcePath}`, "BANK_BATCH_CORRUPT", { cause: error });
  }
}

/**
 * Validates unknown batch content against BankSubtopicBatchSchema.
 */
export function validateBankBatchSchema(content: unknown, sourcePath: string): BankSubtopicBatch {
  const parsed = BankSubtopicBatchSchema.safeParse(content);
  if (!parsed.success) {
    throw new RepositoryError(`Schema validation failed for batch file ${sourcePath}: ${parsed.error.message}`, "BANK_BATCH_CORRUPT", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/**
 * Parses and validates a batch file read during direct subtopic lookup.
 */
export function parseReadSubtopicBatch(
  raw: string,
  sourcePath: string,
  expected: { domainId: string; subtopicId: string; normalizedArch: string },
): BankSubtopicBatch {
  const content = parseBatchJson(raw, sourcePath);
  const data = validateBankBatchSchema(content, sourcePath);

  if (
    data.domain_id !== expected.domainId ||
    data.subtopic_id !== expected.subtopicId ||
    !matchesArchetypeFilter(expected.normalizedArch, data.archetype_id)
  ) {
    throw new RepositoryError(
      `Batch membership does not match requested path ${expected.normalizedArch}/${expected.domainId}/${expected.subtopicId}`,
      "BANK_BATCH_INCONSISTENT",
    );
  }
  assertNestedQuestionMembership(data, sourcePath);
  return normalizeBatchLegacyArchetypes(data);
}

/**
 * Parses and validates a batch file discovered during directory scanning.
 */
export function parseScannedBatchFile(
  raw: string,
  filePath: string,
  expected: { fileName: string; domDir: string; archDir: string },
): BankSubtopicBatch {
  const content = parseBatchJson(raw, filePath);
  const data = validateBankBatchSchema(content, filePath);
  const expectedSubtopicId = expected.fileName.replace(/\.json$/, "");

  if (data.subtopic_id !== expectedSubtopicId) {
    throw new RepositoryError(
      `Inconsistent batch subtopic membership: file ${expected.fileName} contains subtopic_id "${data.subtopic_id}" (expected "${expectedSubtopicId}")`,
      "BANK_BATCH_INCONSISTENT",
    );
  }
  if (data.domain_id !== expected.domDir) {
    throw new RepositoryError(
      `Inconsistent batch domain membership: batch in directory "${expected.domDir}" contains domain_id "${data.domain_id}"`,
      "BANK_BATCH_INCONSISTENT",
    );
  }
  if (!matchesArchetypeFilter(expected.archDir, data.archetype_id)) {
    throw new RepositoryError(
      `Inconsistent batch archetype membership: batch in directory "${expected.archDir}" contains archetype_id "${data.archetype_id}"`,
      "BANK_BATCH_INCONSISTENT",
    );
  }
  assertNestedQuestionMembership(data, filePath);
  return normalizeBatchLegacyArchetypes(data);
}

/**
 * Asserts that question IDs across all discovered batches are globally unique.
 */
export function assertUniqueQuestionIds(batches: BankSubtopicBatch[]): void {
  const questionIds = new Set<string>();
  for (const batch of batches) {
    for (const question of batch.questions) {
      if (questionIds.has(question.id)) {
        throw new RepositoryError(`Duplicate Question Bank question ID "${question.id}"`, "BANK_DUPLICATE_QUESTION_ID");
      }
      questionIds.add(question.id);
    }
  }
}

/**
 * Stores or updates a discovered batch in the deduplication map,
 * applying precedence rules for runtime vs project and modern vs legacy archetypes.
 */
export function storeDiscoveredBatch(
  batchesMap: Map<string, { data: BankSubtopicBatch; isRuntime: boolean; archDir: string }>,
  data: BankSubtopicBatch,
  isRuntime: boolean,
  archDir: string,
): void {
  const key = `${data.archetype_id}:${data.domain_id}:${data.subtopic_id}`;
  const existing = batchesMap.get(key);
  if (!existing) {
    batchesMap.set(key, { data, isRuntime, archDir });
  } else if (isRuntime && !existing.isRuntime) {
    batchesMap.set(key, { data, isRuntime, archDir });
  } else if (isRuntime === existing.isRuntime && archDir === "verdict_true_false" && existing.archDir !== "verdict_true_false") {
    batchesMap.set(key, { data, isRuntime, archDir });
  }
}
