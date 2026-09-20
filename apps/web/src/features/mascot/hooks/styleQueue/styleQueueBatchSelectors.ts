import type { MascotStyleBatchJob } from "@studio/shared";

const SETTLED_BATCH_STATUSES = new Set<MascotStyleBatchJob["status"]>(["completed", "failed", "cancelled"]);

export function findTrackedSettledBatch(
  recentBatches: readonly MascotStyleBatchJob[] | undefined,
  trackedBatchId: string | null,
): MascotStyleBatchJob | undefined {
  if (!trackedBatchId) return undefined;
  return recentBatches?.find((batch) => batch.id === trackedBatchId && SETTLED_BATCH_STATUSES.has(batch.status));
}
