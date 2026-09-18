import type { RepositoryRuntime } from "../../../runtime.js";
import { withBankWrite } from "../bankSerializationBoundary.js";
import { captureFile } from "../bankFileTransaction.js";
import { assertValidMigrationId, verifyCanonicalRootMatch } from "./bankMigrationSafety.js";
import { sha256 } from "./bankMigrationHasher.js";
import type { BankLanguageMigrationManifest, BankLanguageMigrationResult } from "../bankMetadataMigration.js";
import {
  manifestPath,
  assertManifestPathSafe,
  assertApplicableManifestStatus,
  validateBackups,
  verifyIndexBeforeOperation,
  verifyIndexUnchanged,
  checkApplyPending,
  checkRollbackApplied,
} from "./bankMigrationValidator.js";
import {
  persistManifest,
  readCurrentManifestBytes,
  applyBatchMigration,
  rollbackApplyChanges,
  rollbackBatchesToBackup,
  compensateRollbackFailures,
  handleRollbackFailures,
} from "./bankMigrationSteps.js";

// Re-export validation & persistence helpers for 100% backward compatibility
export { manifestPath, assertManifestPathSafe, validateBackups } from "./bankMigrationValidator.js";
export { persistManifest } from "./bankMigrationSteps.js";

/**
 * Applies a verified bank language migration manifest within an exclusive write lock.
 */
export async function applyBankLanguageMigration(
  repository: RepositoryRuntime,
  manifest: BankLanguageMigrationManifest,
): Promise<BankLanguageMigrationResult> {
  assertValidMigrationId(manifest.migrationId);
  return withBankWrite(repository, async () => {
    assertApplicableManifestStatus(manifest);
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

/**
 * Rolls back an applied bank language migration to pre-migration backup states.
 */
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
