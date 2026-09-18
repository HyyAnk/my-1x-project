import { writeFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../../errors.js";
import type { RepositoryRuntime } from "../../../runtime.js";
import { migrationRoot } from "./bankMigrationSafety.js";

/**
 * Restores a file using repository atomic write or fallback direct write.
 */
export async function restoreFileWithFallback(repository: RepositoryRuntime, targetPath: string, content: Uint8Array): Promise<boolean> {
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

/**
 * Writes an unrecoverable rollback journal for audit and recovery.
 */
export async function writeRecoveryJournal(
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

/**
 * Handles rollback failures by emitting a recovery journal and structured error.
 */
export async function handleRollbackFailures(
  canonicalRoot: string,
  migrationId: string,
  rollbackFailures: string[],
  error: unknown,
  action: "apply" | "rollback",
): Promise<never> {
  if (rollbackFailures.length > 0) {
    await writeRecoveryJournal(canonicalRoot, migrationId, rollbackFailures, error);
    const actionDesc = action === "apply" ? "apply failed and rollback compensation failed" : "rollback failed and compensation failed";
    throw new RepositoryError(
      `BANK_RECOVERY_REQUIRED: migration ${actionDesc} for ${rollbackFailures.join(", ")}`,
      "BANK_RECOVERY_REQUIRED",
      { cause: error },
    );
  }
  throw error;
}
