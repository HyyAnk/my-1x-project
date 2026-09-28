import { readdir } from "node:fs/promises";
import path from "node:path";
import { planAttemptRetention } from "./attemptRetentionPlan.js";
import { assertContainedPath } from "./safeFrameFiles.js";
import type { AttemptRetentionPlan } from "./retention.types.js";

export interface StorageAuditReport {
  mode: "dry-run";
  root: string;
  attempts: AttemptRetentionPlan[];
  skipped: { path: string; reason: string }[];
  potentialSourceBytes: number;
  protectedMattedBytes: number;
  compactMattedBytes: number;
}

/** Read-only discovery: follows only the known attempt layout, never links or unrelated assets. */
export async function auditMascotStorage(root: string, progress?: (count: number) => void): Promise<StorageAuditReport> {
  const report: StorageAuditReport = {
    mode: "dry-run",
    root: path.resolve(root),
    attempts: [],
    skipped: [],
    potentialSourceBytes: 0,
    protectedMattedBytes: 0,
    compactMattedBytes: 0,
  };
  async function visit(directory: string, depth: number): Promise<void> {
    try {
      await assertContainedPath(root, directory);
      if (depth === 7) {
        const plan = await planAttemptRetention(root, directory);
        report.attempts.push(plan);
        report.potentialSourceBytes += plan.source.bytes;
        if (plan.mattedProtected) report.protectedMattedBytes += plan.matted.bytes;
        else report.compactMattedBytes += plan.matted.bytes;
        progress?.(report.attempts.length);
        return;
      }
      const expected = [null, "animations", null, null, null, "attempts", null][depth];
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (expected && entry.name !== expected) continue;
        if (depth === 3 && !["thinking", "celebrate"].includes(entry.name)) continue;
        if (depth === 4 && !/^slot_(?:[1-9]|10)$/.test(entry.name)) continue;
        if (depth === 6 && !/^att_\d+$/.test(entry.name)) continue;
        if (entry.isSymbolicLink()) report.skipped.push({ path: path.join(directory, entry.name), reason: "Linked directory" });
        else if (entry.isDirectory()) await visit(path.join(directory, entry.name), depth + 1);
      }
    } catch (error) {
      report.skipped.push({ path: directory, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  await visit(path.join(report.root, "mascots"), 0);
  return report;
}
