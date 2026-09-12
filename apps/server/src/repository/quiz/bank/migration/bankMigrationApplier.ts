import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../../errors.js";
import type { RepositoryRuntime } from "../../../runtime.js";
import { withBankWrite } from "../bankSerializationBoundary.js";
import { captureFile } from "../bankFileTransaction.js";
import {
  assertSafeBackupPath,
  assertSafeFilesystemPath,
  assertSafeRelativePath,
  assertValidMigrationId,
  migrationRoot,
  verifyCanonicalRootMatch,
} from "./bankMigrationSafety.js";
import {
  parseBatchForMigration,
  semanticHash,
  serializedBatch,
  sha256,
} from "./bankMigrationHasher.js";
import type {
  BankLanguageMigrationManifest,
  BankLanguageMigrationResult,
} from "../bankMetadataMigration.js";

export function manifestPath(manifest: BankLanguageMigrationManifest): string {
  return path.join(path.dirname(manifest.canonicalRoot), "question_bank_migrations", manifest.migrationId, "manifest.json");
}

export async function assertManifestPathSafe(manifest: BankLanguageMigrationManifest): Promise<void> {
  await assertSafeFilesystemPath(migrationRoot(manifest.canonicalRoot), manifestPath(manifest));
}

export async function persistManifest(repository: RepositoryRuntime, manifest: BankLanguageMigrationManifest): Promise<string> {
  const target = manifestPath(manifest);
  await assertManifestPathSafe(manifest);
  await mkdir(path.dirname(target), { recursive: true });
  await assertManifestPathSafe(manifest);
  await repository.writeTextAtomic(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return target;
}

export async function validateBackups(repository: RepositoryRuntime, manifest: BankLanguageMigrationManifest): Promise<void> {
  for (const file of manifest.files) {
    assertSafeRelativePath(file.relativePath, manifest.canonicalRoot);
    assertSafeBackupPath(file.backupPath, manifest.canonicalRoot, manifest.migrationId);
    await assertSafeFilesystemPath(path.join(migrationRoot(manifest.canonicalRoot), manifest.migrationId, "backup"), file.backupPath);
    const bytes = await readFile(file.backupPath);
    if (sha256(bytes) !== file.byteHashBefore) {
      throw new RepositoryError(`BANK_BACKUP_INVALID: backup hash mismatch for ${file.relativePath}`, "BANK_BACKUP_INVALID");
    }
  }
}

async function restoreFileWithFallback(
  repository: RepositoryRuntime,
  targetPath: string,
  content: Uint8Array,
): Promise<boolean> {
  try {
    await repository.writeBinaryAtomic(targetPath, content);
    return true;
  } catch {
    try {
      await writeFile(targetPath, content);
      return true;
    } catch {
      return false;
    }
  }
}

async function writeRecoveryJournal(
  canonicalRoot: string,
  migrationId: string,
  rollbackFailures: string[],
  error: unknown,
): Promise<void> {
  const journalPath = path.join(migrationRoot(canonicalRoot), migrationId, "recovery_journal.json");
  try {
    await writeFile(
      journalPath,
      JSON.stringify(
        {
          migrationId,
          failedAt: new Date().toISOString(),
          rollbackFailures,
          error: (error as Error).message,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    // Ignore journal write failures
  }
}

async function handleRollbackFailures(
  canonicalRoot: string,
  migrationId: string,
  rollbackFailures: string[],
  error: unknown,
  action: "apply" | "rollback",
): Promise<never> {
  if (rollbackFailures.length > 0) {
    await writeRecoveryJournal(canonicalRoot, migrationId, rollbackFailures, error);
    const actionDesc =
      action === "apply"
        ? "apply failed and rollback compensation failed"
        : "rollback failed and compensation failed";
    throw new RepositoryError(
      `BANK_RECOVERY_REQUIRED: migration ${actionDesc} for ${rollbackFailures.join(", ")}`,
      "BANK_RECOVERY_REQUIRED",
      { cause: error },
    );
  }
  throw error;
}

async function readCurrentManifestBytes(manifest: BankLanguageMigrationManifest): Promise<Buffer[]> {
  return Promise.all(
    manifest.files.map(async (file) => {
      const sourcePath = path.join(manifest.canonicalRoot, file.relativePath);
      await assertSafeFilesystemPath(manifest.canonicalRoot, sourcePath);
      return readFile(sourcePath);
    }),
  );
}

async function verifyIndexBeforeOperation(
  manifest: BankLanguageMigrationManifest,
  step: "apply" | "rollback",
): Promise<void> {
  const indexPath = path.join(manifest.canonicalRoot, "index.json");
  await assertSafeFilesystemPath(manifest.canonicalRoot, indexPath);
  const indexBytesBefore = await readFile(indexPath);
  if (sha256(indexBytesBefore) !== manifest.indexByteHash) {
    throw new RepositoryError(`BANK_DRIFT: index.json changed before ${step}`, "BANK_DRIFT");
  }
}

async function verifyIndexUnchanged(
  manifest: BankLanguageMigrationManifest,
  step: "migration" | "rollback",
): Promise<void> {
  const indexPath = path.join(manifest.canonicalRoot, "index.json");
  const indexBytesAfter = await readFile(indexPath);
  if (sha256(indexBytesAfter) !== manifest.indexByteHash) {
    throw new RepositoryError(`BANK_DRIFT: index.json changed during ${step}`, "BANK_DRIFT");
  }
}

function checkApplyPending(manifest: BankLanguageMigrationManifest, currentBytes: Buffer[]): boolean {
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
  return anyPending;
}

function checkRollbackApplied(manifest: BankLanguageMigrationManifest, currentBytes: Buffer[]): boolean {
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
  return anyApplied;
}

async function applyBatchMigration(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
  currentBytes: Buffer[],
): Promise<void> {
  for (const [index, file] of manifest.files.entries()) {
    const curHash = sha256(currentBytes[index]);
    if (curHash === file.expectedByteHashAfter) continue;
    const targetIds = new Set(file.missingLanguageQuestionIds);
    if (targetIds.size === 0) continue;
    const parsed = parseBatchForMigration(currentBytes[index].toString("utf8"), file.relativePath);
    if (!parsed) throw new RepositoryError(`BANK_DRIFT: invalid batch for ${file.relativePath}`, "BANK_DRIFT");
    const migrated = {
      ...parsed,
      questions: parsed.questions.map((question) =>
        targetIds.has(question.id) ? { ...question, language: "en" as const } : question,
      ),
    };
    if (sha256(serializedBatch(migrated)) !== file.expectedByteHashAfter) {
      throw new RepositoryError(`BANK_DRIFT: membership changed for ${file.relativePath}`, "BANK_DRIFT");
    }
    if (semanticHash(parsed, targetIds) !== file.semanticHashBefore) {
      throw new RepositoryError(`BANK_DRIFT: semantic preimage changed for ${file.relativePath}`, "BANK_DRIFT");
    }
    const targetPath = path.join(manifest.canonicalRoot, file.relativePath);
    await assertSafeFilesystemPath(manifest.canonicalRoot, targetPath);
    await repository.writeBinaryAtomic(targetPath, serializedBatch(migrated));
  }
}

async function rollbackApplyChanges(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
  currentBytes: Buffer[],
  manifestTarget: string,
  originalManifestBytes: Buffer | undefined,
): Promise<string[]> {
  const rollbackFailures: string[] = [];
  for (const [index, file] of manifest.files.entries()) {
    const targetPath = path.join(manifest.canonicalRoot, file.relativePath);
    const restored = await restoreFileWithFallback(repository, targetPath, currentBytes[index]);
    if (!restored) rollbackFailures.push(targetPath);
  }
  if (originalManifestBytes !== undefined) {
    const restored = await restoreFileWithFallback(repository, manifestTarget, originalManifestBytes);
    if (!restored) rollbackFailures.push(manifestTarget);
  }
  return rollbackFailures;
}

async function rollbackBatchesToBackup(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
  currentBytes: Buffer[],
  rolledBackIndices: number[],
): Promise<void> {
  for (const [index, file] of manifest.files.entries()) {
    const curHash = sha256(currentBytes[index]);
    if (curHash === file.byteHashBefore) continue;
    const targetPath = path.join(manifest.canonicalRoot, file.relativePath);
    await assertSafeFilesystemPath(manifest.canonicalRoot, targetPath);
    await assertSafeFilesystemPath(path.join(migrationRoot(manifest.canonicalRoot), manifest.migrationId, "backup"), file.backupPath);
    await repository.writeBinaryAtomic(targetPath, await readFile(file.backupPath));
    rolledBackIndices.push(index);
  }
}

async function compensateRollbackFailures(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
  currentBytes: Buffer[],
  rolledBackIndices: number[],
  manifestTarget: string,
  originalManifestBytes: Buffer | undefined,
): Promise<string[]> {
  const rollbackFailures: string[] = [];
  for (const index of rolledBackIndices) {
    const file = manifest.files[index];
    const targetPath = path.join(manifest.canonicalRoot, file.relativePath);
    const restored = await restoreFileWithFallback(repository, targetPath, currentBytes[index]);
    if (!restored) rollbackFailures.push(targetPath);
  }
  if (originalManifestBytes !== undefined) {
    const restored = await restoreFileWithFallback(repository, manifestTarget, originalManifestBytes);
    if (!restored) rollbackFailures.push(manifestTarget);
  }
  return rollbackFailures;
}

export async function applyBankLanguageMigration(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
): Promise<BankLanguageMigrationResult> {
  assertValidMigrationId(manifest.migrationId);
  return withBankWrite(repository, async () => {
    if (manifest.status !== "backed_up" && manifest.status !== "applied") {
      throw new RepositoryError("BANK_MIGRATION_STATE: manifest is not applicable", "BANK_MIGRATION_STATE");
    }
    await verifyCanonicalRootMatch(repository, manifest.canonicalRoot);
    await assertManifestPathSafe(manifest);
    await verifyIndexBeforeOperation(manifest, "apply");

    await validateBackups(repository, manifest);
    const currentBytes = await readCurrentManifestBytes(manifest);
    const anyPending = checkApplyPending(manifest, currentBytes);

    const applied: BankLanguageMigrationManifest = {
      ...manifest,
      status: "applied" as const,
      postRevision: sha256(
        Buffer.from(manifest.files.map((file) => `${file.relativePath}:${file.expectedByteHashAfter}`).join("\n"), "utf8"),
      ),
    };

    if (!anyPending) {
      const savedPath = await persistManifest(repository, applied);
      return { changed: false, manifest: applied, manifestPath: savedPath };
    }

    const manifestTarget = manifestPath(manifest);
    const originalManifestBytes = await captureFile(manifestTarget);

    try {
      await applyBatchMigration(repository, manifest, currentBytes);
      await verifyIndexUnchanged(manifest, "migration");
      const savedPath = await persistManifest(repository, applied);
      return { changed: true, manifest: applied, manifestPath: savedPath };
    } catch (error) {
      const rollbackFailures = await rollbackApplyChanges(repository, manifest, currentBytes, manifestTarget, originalManifestBytes);
      return handleRollbackFailures(manifest.canonicalRoot, manifest.migrationId, rollbackFailures, error, "apply");
    }
  });
}

export async function rollbackBankLanguageMigration(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
): Promise<BankLanguageMigrationResult> {
  assertValidMigrationId(manifest.migrationId);
  return withBankWrite(repository, async () => {
    await verifyCanonicalRootMatch(repository, manifest.canonicalRoot);
    await assertManifestPathSafe(manifest);
    await verifyIndexBeforeOperation(manifest, "rollback");

    await validateBackups(repository, manifest);
    const currentBytes = await readCurrentManifestBytes(manifest);
    const anyApplied = checkRollbackApplied(manifest, currentBytes);

    const rolledBack: BankLanguageMigrationManifest = { ...manifest, status: "rolled_back" as const };

    if (!anyApplied) {
      const savedPath = await persistManifest(repository, rolledBack);
      return { changed: false, manifest: rolledBack, manifestPath: savedPath };
    }

    const manifestTarget = manifestPath(manifest);
    const originalManifestBytes = await captureFile(manifestTarget);
    const rolledBackIndices: number[] = [];

    try {
      await rollbackBatchesToBackup(repository, manifest, currentBytes, rolledBackIndices);
      await verifyIndexUnchanged(manifest, "rollback");
      const savedPath = await persistManifest(repository, rolledBack);
      return { changed: true, manifest: rolledBack, manifestPath: savedPath };
    } catch (error) {
      const rollbackFailures = await compensateRollbackFailures(
        repository,
        manifest,
        currentBytes,
        rolledBackIndices,
        manifestTarget,
        originalManifestBytes,
      );
      return handleRollbackFailures(manifest.canonicalRoot, manifest.migrationId, rollbackFailures, error, "rollback");
    }
  });
}
