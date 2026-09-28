import path from "node:path";
import { lstat } from "node:fs/promises";
import { StudioLogger } from "../../../../logger.js";
import { maintainUnusedMedia } from "./unusedMediaMaintenance.js";
import { auditMascotStorage } from "./storageAudit.js";
import { pruneCompletedIntermediates } from "./pruneCompletedIntermediates.js";
import { verifyArchiveArtifacts } from "./verifyArchiveArtifacts.js";

/** The entry point owns the exclusive library lease; no application writers exist yet. */
export async function runStartupStorageMaintenance(library: string): Promise<void> {
  const root = path.join(library, ".quiz-studio");
  try {
    await lstat(root);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  const logger = new StudioLogger(library);
  logger.setRuntimeRoot(root);
  const context = { step: "startup-retention", workerId: "maintenance" };
  try {
    const result = await maintainUnusedMedia(root, true, (message) => logger.info(message, context));
    logger.ok(`Reclaimed ${result.bytes} bytes in ${result.files} unused files; central storage only`, context);
    for (const plan of (await auditMascotStorage(root)).attempts) {
      if (!plan.source.files.length && (plan.mattedProtected || !plan.matted.files.length)) continue;
      const cleaned = await pruneCompletedIntermediates(root, plan.attemptDirectory, verifyArchiveArtifacts);
      logger.ok(`Recovered completed-job cleanup: ${cleaned.files} files, ${cleaned.bytes} bytes`, context);
    }
  } catch (error) {
    logger.warn(
      `Retention deferred: ${error instanceof Error ? error.message : String(error)}. Inspect central maintenance journals before retrying`,
      context,
    );
  }
}
