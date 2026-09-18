import { readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../../errors.js";
import type { RepositoryRuntime } from "../../../runtime.js";
import { assertSafeBackupPath, assertSafeFilesystemPath, assertSafeRelativePath, migrationRoot } from "./bankMigrationSafety.js";
import { sha256 } from "./bankMigrationHasher.js";
import type { BankLanguageMigrationManifest } from "../bankMetadataMigration.js";

/**
 * Computes the absolute manifest path for a migration.
 */
export function manifestPath(manifest: BankLanguageMigrationManifest): string {
  return path.join(path.dirname(manifest.canonicalRoot), "question_bank_migrations", manifest.migrationId, "manifest.json");
}

/**
 * Asserts that the manifest target path is within the allowed migration root.
 */
export async function assertManifestPathSafe(manifest: BankLanguageMigrationManifest): Promise<void> {
  await assertSafeFilesystemPath(migrationRoot(manifest.canonicalRoot), manifestPath(manifest));
}

/**
 * Verifies that manifest status is eligible for migration application.
 */
export function assertApplicableManifestStatus(manifest: BankLanguageMigrationManifest): void {
  if (manifest.status !== "backed_up" && manifest.status !== "applied") {
    throw new RepositoryError("BANK_MIGRATION_STATE: manifest is not applicable", "BANK_MIGRATION_STATE");
  }
}

/**
 * Validates file backup paths and hashes prior to applying or rolling back a migration.
 */
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

/**
 * Verifies that index.json matches the expected hash before an operation begins.
 */
export async function verifyIndexBeforeOperation(manifest: BankLanguageMigrationManifest, step: "apply" | "rollback"): Promise<void> {
  const indexPath = path.join(manifest.canonicalRoot, "index.json");
  await assertSafeFilesystemPath(manifest.canonicalRoot, indexPath);
  const indexBytesBefore = await readFile(indexPath);
  if (sha256(indexBytesBefore) !== manifest.indexByteHash) {
    throw new RepositoryError(`BANK_DRIFT: index.json changed before ${step}`, "BANK_DRIFT");
  }
}

/**
 * Verifies that index.json remains unchanged during the operation.
 */
export async function verifyIndexUnchanged(manifest: BankLanguageMigrationManifest, step: "migration" | "rollback"): Promise<void> {
  const indexPath = path.join(manifest.canonicalRoot, "index.json");
  const indexBytesAfter = await readFile(indexPath);
  if (sha256(indexBytesAfter) !== manifest.indexByteHash) {
    throw new RepositoryError(`BANK_DRIFT: index.json changed during ${step}`, "BANK_DRIFT");
  }
}

/**
 * Evaluates whether any file changes are still pending application.
 */
export function checkApplyPending(manifest: BankLanguageMigrationManifest, currentBytes: Buffer[]): boolean {
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

/**
 * Evaluates whether any file changes have already been applied and need rolling back.
 */
export function checkRollbackApplied(manifest: BankLanguageMigrationManifest, currentBytes: Buffer[]): boolean {
  let anyApplied = false;
  for (let index = 0; index < manifest.files.length; index += 1) {
    const file = manifest.files[index];
    const curHash = sha256(currentBytes[index]);
    const isPre = curHash === file.byteHashBefore;
    const isPost = curHash === file.expectedByteHashAfter;
    if (!isPre && !isPost) {
      throw new RepositoryError(`BANK_DRIFT: rollback requires the verified postimage or preimage for ${file.relativePath}`, "BANK_DRIFT");
    }
    if (isPost && file.byteHashBefore !== file.expectedByteHashAfter) {
      anyApplied = true;
    }
  }
  return anyApplied;
}
