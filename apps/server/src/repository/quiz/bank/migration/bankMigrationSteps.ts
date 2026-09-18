import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../../errors.js";
import type { RepositoryRuntime } from "../../../runtime.js";
import { assertSafeFilesystemPath, migrationRoot } from "./bankMigrationSafety.js";
import { parseBatchForMigration, semanticHash, serializedBatch, sha256 } from "./bankMigrationHasher.js";
import type { BankLanguageMigrationManifest } from "../bankMetadataMigration.js";
import { assertManifestPathSafe, manifestPath } from "./bankMigrationValidator.js";
import { restoreFileWithFallback } from "./bankMigrationRecovery.js";

export { handleRollbackFailures, restoreFileWithFallback, writeRecoveryJournal } from "./bankMigrationRecovery.js";

/**
 * Persists the migration manifest atomically to disk.
 */
export async function persistManifest(repository: RepositoryRuntime, manifest: BankLanguageMigrationManifest): Promise<string> {
  const target = manifestPath(manifest);
  await assertManifestPathSafe(manifest);
  await mkdir(path.dirname(target), { recursive: true });
  await assertManifestPathSafe(manifest);
  await repository.writeTextAtomic(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return target;
}

/**
 * Reads the current file bytes for all files referenced in the manifest.
 */
export async function readCurrentManifestBytes(manifest: BankLanguageMigrationManifest): Promise<Buffer[]> {
  return Promise.all(
    manifest.files.map(async (file) => {
      const sourcePath = path.join(manifest.canonicalRoot, file.relativePath);
      await assertSafeFilesystemPath(manifest.canonicalRoot, sourcePath);
      return readFile(sourcePath);
    }),
  );
}

/**
 * Applies the batch language migration for all files in the manifest.
 */
export async function applyBatchMigration(
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
      questions: parsed.questions.map((question) => (targetIds.has(question.id) ? { ...question, language: "en" as const } : question)),
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

/**
 * Rolls back applied file changes by restoring the in-memory preimage bytes.
 */
export async function rollbackApplyChanges(
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

/**
 * Restores batches from disk backup files during a rollback operation.
 */
export async function rollbackBatchesToBackup(
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

/**
 * Compensates for rollback failure by restoring pre-rollback image.
 */
export async function compensateRollbackFailures(
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
