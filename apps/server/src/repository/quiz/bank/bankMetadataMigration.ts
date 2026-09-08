import { createHash } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { BankSubtopicBatch } from "@studio/shared";
import { RepositoryError } from "../../errors.js";
import { isInside } from "../../pathSafety.js";
import type { RepositoryRuntime } from "../../runtime.js";
import { QUESTION_BANK_DIR } from "./bankPathResolver.js";
import { withBankRead, withBankWrite } from "./bankSerializationBoundary.js";

export type BankMigrationFile = {
  relativePath: string;
  questionIds: string[];
  missingLanguageQuestionIds: string[];
  byteHashBefore: string;
  semanticHashBefore: string;
  semanticHashAfter: string;
  expectedByteHashAfter: string;
  backupPath: string;
};

export type BankLanguageMigrationManifest = {
  schemaVersion: 1;
  migrationId: string;
  canonicalRoot: string;
  indexByteHash: string;
  createdAt: string;
  status: "backed_up" | "applied" | "rolled_back";
  preRevision: string;
  totalQuestionCount: number;
  postRevision?: string;
  files: BankMigrationFile[];
};

export type BankLanguageMigrationPreview = Omit<BankLanguageMigrationManifest, "status" | "postRevision"> & {
  affectedQuestionCount: number;
};

export type BankLanguageMigrationResult = {
  changed: boolean;
  manifest: BankLanguageMigrationManifest;
  manifestPath: string;
};

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function semanticHash(batch: BankSubtopicBatch, missingIds: ReadonlySet<string>): string {
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

function serializedBatch(batch: BankSubtopicBatch): Buffer {
  return Buffer.from(`${JSON.stringify(batch, null, 2)}\n`, "utf8");
}

export function assertValidMigrationId(migrationId: string): void {
  if (typeof migrationId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(migrationId)) {
    throw new RepositoryError(
      `Invalid migration ID "${migrationId}". Must be 1-64 alphanumeric, dash, or underscore characters.`,
      "INVALID_MIGRATION_ID",
    );
  }
}

export function assertSafeRelativePath(relativePath: string, canonicalRoot: string): string {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new RepositoryError("Empty or invalid relative path in migration manifest", "UNSAFE_PATH");
  }
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (
    normalized.startsWith("../") ||
    normalized === ".." ||
    path.isAbsolute(relativePath) ||
    /^[a-zA-Z]:/.test(relativePath) ||
    relativePath.includes("\0")
  ) {
    throw new RepositoryError(`Unsafe relative path "${relativePath}" in migration manifest`, "UNSAFE_PATH");
  }
  const target = path.resolve(canonicalRoot, normalized);
  if (!isInside(canonicalRoot, target)) {
    throw new RepositoryError(`Target path escaped canonical root: "${relativePath}"`, "UNSAFE_PATH");
  }
  return normalized;
}

export function assertSafeBackupPath(backupPath: string, canonicalRoot: string, migrationId: string): void {
  const root = path.join(migrationRoot(canonicalRoot), migrationId, "backup");
  if (!isInside(root, path.resolve(backupPath))) {
    throw new RepositoryError(`Backup path escaped migration backup root: "${backupPath}"`, "UNSAFE_PATH");
  }
}

function parseBatchForMigration(raw: string, filePath: string): BankSubtopicBatch | null {
  const candidate = JSON.parse(raw) as { questions?: unknown };
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

function migrationRoot(canonicalRoot: string): string {
  return path.join(path.resolve(canonicalRoot), "..", "question_bank_migrations");
}

async function resolveCanonicalRoot(repository: RepositoryRuntime): Promise<string> {
  const configuredPath = path.join(repository.rootDirectory, ".quiz-studio", "storage.local.json");
  const config = JSON.parse(await readFile(configuredPath, "utf8")) as { storage_path?: unknown };
  if (typeof config.storage_path !== "string" || path.resolve(config.storage_path) !== path.resolve(repository.storageRoot)) {
    throw new Error("BANK_ROOT_MISMATCH: configured storage root does not match the repository runtime root");
  }
  return path.join(repository.roots.runtime, QUESTION_BANK_DIR);
}

async function collectBatchFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  const archetypes = await readdir(root, { withFileTypes: true });
  for (const archetype of archetypes.filter((entry) => entry.isDirectory())) {
    const domains = await readdir(path.join(root, archetype.name), { withFileTypes: true });
    for (const domain of domains.filter((entry) => entry.isDirectory())) {
      const files = await readdir(path.join(root, archetype.name, domain.name), { withFileTypes: true });
      result.push(
        ...files
          .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
          .map((entry) => path.join(root, archetype.name, domain.name, entry.name)),
      );
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function backupPathFor(root: string, migrationId: string, relativePath: string): string {
  const normalizedRelative = relativePath.replace(/\\/g, "/");
  return path.join(migrationRoot(root), migrationId, "backup", ...normalizedRelative.split("/"));
}

export async function previewBankLanguageMigration(
  repository: RepositoryRuntime,
  options: { migrationId: string },
): Promise<BankLanguageMigrationPreview> {
  assertValidMigrationId(options.migrationId);
  return withBankRead(repository, async () => {
    const canonicalRoot = await resolveCanonicalRoot(repository);

    // Verify index.json exists and capture byte hash
    const indexPath = path.join(canonicalRoot, "index.json");
    let indexByteHash: string;
    try {
      const indexBytes = await readFile(indexPath);
      indexByteHash = sha256(indexBytes);
    } catch {
      throw new RepositoryError(`Question bank index.json missing or unreadable at ${indexPath}`, "BANK_INDEX_MISSING");
    }

    const files: BankMigrationFile[] = [];
    let totalQuestionCount = 0;
    for (const filePath of await collectBatchFiles(canonicalRoot)) {
      const raw = await readFile(filePath);
      const batch = parseBatchForMigration(raw.toString("utf8"), filePath);
      if (!batch) continue;
      totalQuestionCount += batch.questions.length;
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
      const backupPath = backupPathFor(canonicalRoot, options.migrationId, relativePath);
      assertSafeBackupPath(backupPath, canonicalRoot, options.migrationId);

      const migratedBatch: BankSubtopicBatch = {
        ...batch,
        questions: batch.questions.map((question) => (missingIds.has(question.id) ? { ...question, language: "en" as const } : question)),
      };
      files.push({
        relativePath,
        questionIds: batch.questions.map((question) => question.id),
        missingLanguageQuestionIds: [...missingIds],
        byteHashBefore: sha256(raw),
        semanticHashBefore: semanticHash(batch, missingIds),
        semanticHashAfter: semanticHash(migratedBatch, missingIds),
        expectedByteHashAfter: missingIds.size > 0 ? sha256(serializedBatch(migratedBatch)) : sha256(raw),
        backupPath,
      });
    }
    const preRevision = sha256(Buffer.from(files.map((file) => `${file.relativePath}:${file.byteHashBefore}`).join("\n"), "utf8"));
    return {
      schemaVersion: 1,
      migrationId: options.migrationId,
      canonicalRoot,
      indexByteHash,
      createdAt: new Date().toISOString(),
      preRevision,
      files,
      affectedQuestionCount: files.reduce((count, file) => count + file.missingLanguageQuestionIds.length, 0),
      totalQuestionCount,
    };
  });
}

function manifestPath(manifest: BankLanguageMigrationManifest): string {
  return path.join(path.dirname(manifest.canonicalRoot), "question_bank_migrations", manifest.migrationId, "manifest.json");
}

async function persistManifest(repository: RepositoryRuntime, manifest: BankLanguageMigrationManifest): Promise<string> {
  const target = manifestPath(manifest);
  await mkdir(path.dirname(target), { recursive: true });
  await repository.writeTextAtomic(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return target;
}

export async function backupBankLanguageMigration(
  repository: RepositoryRuntime,
  preview: BankLanguageMigrationPreview,
): Promise<{ manifest: BankLanguageMigrationManifest; files: BankMigrationFile[]; manifestPath: string }> {
  assertValidMigrationId(preview.migrationId);
  return withBankWrite(repository, async () => {
    const currentRoot = await resolveCanonicalRoot(repository);
    if (path.resolve(currentRoot) !== path.resolve(preview.canonicalRoot)) throw new Error("BANK_ROOT_MISMATCH: migration root changed");

    // Verify index.json before backing up
    const indexPath = path.join(preview.canonicalRoot, "index.json");
    const indexBytes = await readFile(indexPath);
    if (sha256(indexBytes) !== preview.indexByteHash) {
      throw new RepositoryError("BANK_DRIFT: index.json changed before backup", "BANK_DRIFT");
    }
    const indexBackupPath = path.join(migrationRoot(preview.canonicalRoot), preview.migrationId, "backup", "index.json");
    await mkdir(path.dirname(indexBackupPath), { recursive: true });
    await repository.writeBinaryAtomic(indexBackupPath, indexBytes);

    for (const file of preview.files) {
      assertSafeRelativePath(file.relativePath, preview.canonicalRoot);
      assertSafeBackupPath(file.backupPath, preview.canonicalRoot, preview.migrationId);
      const bytes = await readFile(path.join(preview.canonicalRoot, file.relativePath));
      if (sha256(bytes) !== file.byteHashBefore) throw new Error(`BANK_DRIFT: preimage changed for ${file.relativePath}`);
      await mkdir(path.dirname(file.backupPath), { recursive: true });
      await repository.writeBinaryAtomic(file.backupPath, bytes);
    }
    const manifest: BankLanguageMigrationManifest = { ...preview, status: "backed_up" };
    const savedPath = await persistManifest(repository, manifest);
    return { manifest, files: preview.files, manifestPath: savedPath };
  });
}

async function validateBackups(repository: RepositoryRuntime, manifest: BankLanguageMigrationManifest): Promise<void> {
  for (const file of manifest.files) {
    assertSafeRelativePath(file.relativePath, manifest.canonicalRoot);
    assertSafeBackupPath(file.backupPath, manifest.canonicalRoot, manifest.migrationId);
    const bytes = await readFile(file.backupPath);
    if (sha256(bytes) !== file.byteHashBefore) throw new Error(`BANK_BACKUP_INVALID: backup hash mismatch for ${file.relativePath}`);
  }
}

export async function applyBankLanguageMigration(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
): Promise<BankLanguageMigrationResult> {
  assertValidMigrationId(manifest.migrationId);
  return withBankWrite(repository, async () => {
    if (manifest.status !== "backed_up" && manifest.status !== "applied") {
      throw new Error("BANK_MIGRATION_STATE: manifest is not applicable");
    }
    const currentRoot = await resolveCanonicalRoot(repository);
    if (path.resolve(currentRoot) !== path.resolve(manifest.canonicalRoot)) throw new Error("BANK_ROOT_MISMATCH: migration root changed");

    // Verify index.json before applying
    const indexPath = path.join(manifest.canonicalRoot, "index.json");
    const indexBytesBefore = await readFile(indexPath);
    if (sha256(indexBytesBefore) !== manifest.indexByteHash) {
      throw new RepositoryError("BANK_DRIFT: index.json changed before apply", "BANK_DRIFT");
    }

    await validateBackups(repository, manifest);
    const currentBytes = await Promise.all(manifest.files.map((file) => readFile(path.join(manifest.canonicalRoot, file.relativePath))));

    // Interrupted / partial recovery check
    let anyPending = false;
    for (let index = 0; index < manifest.files.length; index += 1) {
      const file = manifest.files[index];
      const curHash = sha256(currentBytes[index]);
      const isPre = curHash === file.byteHashBefore;
      const isPost = curHash === file.expectedByteHashAfter;
      if (!isPre && !isPost) {
        throw new RepositoryError(
          `BANK_DRIFT: current Bank does not match the frozen preimage or postimage for ${file.relativePath}`,
          "BANK_DRIFT",
        );
      }
      if (isPre && file.missingLanguageQuestionIds.length > 0) {
        anyPending = true;
      }
    }

    const applied: BankLanguageMigrationManifest = {
      ...manifest,
      status: "applied" as const,
      postRevision: sha256(
        Buffer.from(manifest.files.map((file) => `${file.relativePath}:${file.expectedByteHashAfter}`).join("\n"), "utf8"),
      ),
    };

    if (!anyPending) {
      // Replaying already applied state: persist applied status to prevent regressing to backed_up
      const savedPath = await persistManifest(repository, applied);
      return { changed: false, manifest: applied, manifestPath: savedPath };
    }

    for (const [index, file] of manifest.files.entries()) {
      const curHash = sha256(currentBytes[index]);
      if (curHash === file.expectedByteHashAfter) {
        // Already migrated in prior partial attempt
        continue;
      }
      const targetIds = new Set(file.missingLanguageQuestionIds);
      if (targetIds.size === 0) continue;
      const parsed = parseBatchForMigration(currentBytes[index].toString("utf8"), file.relativePath);
      if (!parsed) throw new Error(`BANK_DRIFT: invalid batch for ${file.relativePath}`);
      const migrated = {
        ...parsed,
        questions: parsed.questions.map((question) => (targetIds.has(question.id) ? { ...question, language: "en" as const } : question)),
      };
      if (sha256(serializedBatch(migrated)) !== file.expectedByteHashAfter) {
        throw new Error(`BANK_DRIFT: membership changed for ${file.relativePath}`);
      }
      if (semanticHash(parsed, targetIds) !== file.semanticHashBefore) {
        throw new Error(`BANK_DRIFT: semantic preimage changed for ${file.relativePath}`);
      }
      await repository.writeBinaryAtomic(path.join(manifest.canonicalRoot, file.relativePath), serializedBatch(migrated));
    }

    // Verify index.json unchanged after all batch writes
    const indexBytesAfter = await readFile(indexPath);
    if (sha256(indexBytesAfter) !== manifest.indexByteHash) {
      throw new RepositoryError("BANK_DRIFT: index.json changed during migration", "BANK_DRIFT");
    }

    const savedPath = await persistManifest(repository, applied);
    return { changed: true, manifest: applied, manifestPath: savedPath };
  });
}

export async function rollbackBankLanguageMigration(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
): Promise<BankLanguageMigrationResult> {
  assertValidMigrationId(manifest.migrationId);
  return withBankWrite(repository, async () => {
    const currentRoot = await resolveCanonicalRoot(repository);
    if (path.resolve(currentRoot) !== path.resolve(manifest.canonicalRoot)) throw new Error("BANK_ROOT_MISMATCH: migration root changed");

    // Verify index.json before rollback
    const indexPath = path.join(manifest.canonicalRoot, "index.json");
    const indexBytesBefore = await readFile(indexPath);
    if (sha256(indexBytesBefore) !== manifest.indexByteHash) {
      throw new RepositoryError("BANK_DRIFT: index.json changed before rollback", "BANK_DRIFT");
    }

    await validateBackups(repository, manifest);
    const currentBytes = await Promise.all(manifest.files.map((file) => readFile(path.join(manifest.canonicalRoot, file.relativePath))));

    let anyApplied = false;
    for (let index = 0; index < manifest.files.length; index += 1) {
      const file = manifest.files[index];
      const curHash = sha256(currentBytes[index]);
      const isPre = curHash === file.byteHashBefore;
      const isPost = curHash === file.expectedByteHashAfter;
      if (!isPre && !isPost) {
        throw new RepositoryError(
          `BANK_DRIFT: rollback requires the verified postimage or preimage for ${file.relativePath}`,
          "BANK_DRIFT",
        );
      }
      if (isPost && file.byteHashBefore !== file.expectedByteHashAfter) {
        anyApplied = true;
      }
    }

    const rolledBack: BankLanguageMigrationManifest = { ...manifest, status: "rolled_back" as const };

    if (!anyApplied) {
      const savedPath = await persistManifest(repository, rolledBack);
      return { changed: false, manifest: rolledBack, manifestPath: savedPath };
    }

    for (const [index, file] of manifest.files.entries()) {
      const curHash = sha256(currentBytes[index]);
      if (curHash === file.byteHashBefore) continue;
      await repository.writeBinaryAtomic(path.join(manifest.canonicalRoot, file.relativePath), await readFile(file.backupPath));
    }

    // Verify index.json unchanged after rollback
    const indexBytesAfter = await readFile(indexPath);
    if (sha256(indexBytesAfter) !== manifest.indexByteHash) {
      throw new RepositoryError("BANK_DRIFT: index.json changed during rollback", "BANK_DRIFT");
    }

    const savedPath = await persistManifest(repository, rolledBack);
    return { changed: true, manifest: rolledBack, manifestPath: savedPath };
  });
}
