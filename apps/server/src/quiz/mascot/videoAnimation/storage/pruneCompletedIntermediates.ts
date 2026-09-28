import { planAttemptRetention } from "./attemptRetentionPlan.js";
import { removeInventoriedFrames } from "./safeFrameFiles.js";
import type { AttemptRetentionPlan, CleanupResult } from "./retention.types.js";

/** Offline-only historical cleanup. No archives, relocation or deletion of referenced legacy frames. */
export async function pruneCompletedIntermediates(
  root: string,
  attempt: string,
  verifyArtifacts: (plan: AttemptRetentionPlan) => Promise<void>,
): Promise<CleanupResult> {
  const plan = await planAttemptRetention(root, attempt);
  await verifyArtifacts(plan);
  const current = await planAttemptRetention(root, attempt);
  if (JSON.stringify(current) !== JSON.stringify(plan)) throw new Error("Attempt changed during verification");
  const source = await removeInventoriedFrames(root, plan.source);
  const matted = plan.mattedProtected ? { files: 0, bytes: 0 } : await removeInventoriedFrames(root, plan.matted);
  return { files: source.files + matted.files, bytes: source.bytes + matted.bytes };
}
