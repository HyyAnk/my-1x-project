import { lstat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileExists, hashFile, writeDurableJson } from "./archiveFiles.js";
import { planRedundantArchive } from "./redundantArchivePlan.js";
import { planAttemptRetention } from "./attemptRetentionPlan.js";
import { assertContainedPath } from "./safeFrameFiles.js";
import type { AttemptRetentionPlan, CleanupResult } from "./retention.types.js";

/** Caller holds the offline maintenance lease. Deletes derived archive frames, never central assets. */
export async function purgeRedundantArchive(
  root: string,
  archive: string,
  verifyArtifacts: (plan: AttemptRetentionPlan) => Promise<void>,
): Promise<CleanupResult> {
  const plan = await planRedundantArchive(root, archive);
  await verifyArtifacts(await planAttemptRetention(root, plan.attempt));
  const intent = path.join(archive, "purge-intent.json");
  if (!(await fileExists(intent))) await writeDurableJson(intent, { ...plan, createdAt: new Date().toISOString() });
  const source = path.join(plan.attempt, "source.mp4");
  await assertContainedPath(root, source);
  if ((await hashFile(source)) !== plan.sourceHash) throw new Error("Central source changed during verification");
  const result = { files: 0, bytes: 0 };
  for (const entry of plan.files) {
    await assertContainedPath(archive, entry.path);
    const stat = await lstat(entry.path);
    if (stat.size !== entry.size || (await hashFile(entry.path)) !== entry.sha256) throw new Error("Archive changed during purge");
    await unlink(entry.path);
    result.files++;
    result.bytes += entry.size;
  }
  await writeDurableJson(path.join(archive, `purge-result-${randomUUID()}.json`), { ...result, completedAt: new Date().toISOString() });
  return result;
}
