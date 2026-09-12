import { createHash } from "node:crypto";
import path from "node:path";
import type { BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../../errors.js";
import {
  assertSafeBackupPath,
  assertSafeRelativePath,
  backupPathFor,
} from "./bankMigrationSafety.js";
import type { BankMigrationFile } from "../bankMetadataMigration.js";

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function semanticHash(batch: BankSubtopicBatch, missingIds: ReadonlySet<string>): string {
  const semantic = {
    ...batch,
    questions: batch.questions.map((question) => {
      if (!missingIds.has(question.id)) return question;
      const { language: _language, ...withoutLanguage } = question;
      return withoutLanguage;
    }),
  };
  return sha256(Buffer.from(canonicalJson(semantic), "utf8"));
}

export function serializedBatch(batch: BankSubtopicBatch): Buffer {
  return Buffer.from(`${JSON.stringify(batch, null, 2)}\n`, "utf8");
}

export function parseBatchForMigration(raw: string, filePath: string): BankSubtopicBatch | null {
  let candidate: { questions?: unknown };
  try {
    candidate = JSON.parse(raw) as { questions?: unknown };
  } catch (error) {
    throw new RepositoryError(`Question Bank batch is corrupt at ${filePath}`, "BANK_BATCH_CORRUPT", { cause: error });
  }
  if (!Array.isArray(candidate.questions)) return null;
  for (const question of candidate.questions) {
    if (!question || typeof question !== "object" || typeof (question as { id?: unknown }).id !== "string") {
      return null;
    }
    const lang = (question as { language?: unknown }).language;
    if (lang !== undefined && lang !== null && typeof lang !== "string") {
      throw new RepositoryError(
        `BANK_CORRUPT_LANGUAGE: non-string language metadata (${typeof lang}) detected in question ${(question as { id: string }).id} in batch ${filePath}`,
        "BANK_CORRUPT_LANGUAGE",
      );
    }
  }
  return candidate as BankSubtopicBatch;
}

export function buildMigrationFile(
  filePath: string,
  raw: Buffer,
  batch: BankSubtopicBatch,
  canonicalRoot: string,
  migrationId: string,
): BankMigrationFile {
  const missingIds = new Set(
    batch.questions
      .filter(
        (question) =>
          question.language === undefined ||
          question.language === null ||
          (typeof question.language === "string" && question.language.trim() === ""),
      )
      .map((question) => question.id),
  );
  const relativePath = path.relative(canonicalRoot, filePath);
  assertSafeRelativePath(relativePath, canonicalRoot);
  const backupPath = backupPathFor(canonicalRoot, migrationId, relativePath);
  assertSafeBackupPath(backupPath, canonicalRoot, migrationId);

  const migratedBatch: BankSubtopicBatch = {
    ...batch,
    questions: batch.questions.map((question) =>
      missingIds.has(question.id) ? { ...question, language: "en" as const } : question,
    ),
  };
  return {
    relativePath,
    questionIds: batch.questions.map((question) => question.id),
    missingLanguageQuestionIds: [...missingIds],
    byteHashBefore: sha256(raw),
    semanticHashBefore: semanticHash(batch, missingIds),
    semanticHashAfter: semanticHash(migratedBatch, missingIds),
    expectedByteHashAfter: missingIds.size > 0 ? sha256(serializedBatch(migratedBatch)) : sha256(raw),
    backupPath,
  };
}

