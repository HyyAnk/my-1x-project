import type { MascotSlotBatchJob, MascotStudioActivityStatusResponse, MascotStyleBatchJob, MascotVideoProcessingJob } from "@studio/shared";
import type { MascotStudioActivityItem, MascotStudioActivityStatus } from "../types/mascotStudioActivity.types";
import { isBatchRecent } from "./mascotSessionStorage";

const ACTIVE_BATCH_STATUSES = new Set(["queued", "processing"]);
const ACTIVE_ANIMATION_STATUSES = new Set<MascotVideoProcessingJob["status"]>(["queued", "uploading", "processing"]);

function settledPercentage(completed: number, failed: number, total: number): number {
  return Math.min(100, Math.round(((completed + failed) / Math.max(1, total)) * 100));
}

function batchStatus(status: MascotSlotBatchJob["status"], completed: number, failed: number): MascotStudioActivityStatus {
  if (status === "queued") return "queued";
  if (status === "processing") return "running";
  if (status === "cancelled") return "cancelled";
  if (failed > 0 && completed > 0) return "partial";
  if (status === "failed" || failed > 0) return "failed";
  return "completed";
}

function selectBatch<T extends MascotStyleBatchJob | MascotSlotBatchJob>(activeBatch: T | null, recentBatches: T[] | undefined): T | null {
  if (activeBatch) return activeBatch;
  const recent = recentBatches?.[0];
  return recent && isBatchRecent(recent.updated_at || recent.created_at) ? recent : null;
}

function styleConceptItem(response: MascotStudioActivityStatusResponse): MascotStudioActivityItem | null {
  const batch = selectBatch(response.style_concepts.active_batch, response.style_concepts.recent_batches);
  if (!batch) return null;
  return {
    id: `style-concepts:${batch.id}`,
    kind: "style_concepts",
    status: batchStatus(batch.status, batch.completed_count, batch.failed_count),
    isActive: ACTIVE_BATCH_STATUSES.has(batch.status),
    completed: batch.completed_count,
    failed: batch.failed_count,
    total: batch.total_styles,
    percentage: settledPercentage(batch.completed_count, batch.failed_count, batch.total_styles),
    updatedAt: batch.updated_at,
  };
}

function expressiveStateItems(response: MascotStudioActivityStatusResponse): MascotStudioActivityItem[] {
  return response.styles.flatMap((style) => {
    const batch = selectBatch(style.slot_generation.active_batch, style.slot_generation.recent_batches);
    if (!batch) return [];
    return [
      {
        id: `expressive-states:${batch.id}`,
        kind: "expressive_states" as const,
        status: batchStatus(batch.status, batch.completed_count, batch.failed_count),
        isActive: ACTIVE_BATCH_STATUSES.has(batch.status),
        styleId: style.style_id,
        styleName: style.style_name,
        completed: batch.completed_count,
        failed: batch.failed_count,
        total: batch.total_slots,
        percentage: settledPercentage(batch.completed_count, batch.failed_count, batch.total_slots),
        updatedAt: batch.updated_at,
      },
    ];
  });
}

function animationStatus(job: MascotVideoProcessingJob): MascotStudioActivityStatus {
  if (job.status === "queued") return "queued";
  if (job.status === "uploading" || job.status === "processing") return "running";
  if (job.status === "ready") return "completed";
  if (job.status === "cancelled") return "cancelled";
  return "failed";
}

function animationItems(response: MascotStudioActivityStatusResponse): MascotStudioActivityItem[] {
  return response.styles.flatMap((style) =>
    style.animation_jobs.map((job) => {
      const isActive = ACTIVE_ANIMATION_STATUSES.has(job.status);
      return {
        id: `animation-processing:${job.id}`,
        kind: "animation_processing" as const,
        status: animationStatus(job),
        isActive,
        styleId: style.style_id,
        styleName: style.style_name,
        state: job.state,
        slotIndex: job.slot_index,
        completed: isActive ? Math.max(0, Math.min(100, job.progress)) : 100,
        failed: job.status === "qa_failed" ? 1 : 0,
        total: 100,
        percentage: isActive ? Math.max(0, Math.min(100, Math.round(job.progress))) : 100,
        updatedAt: job.updated_at,
      };
    }),
  );
}

export function mapMascotStudioActivities(response: MascotStudioActivityStatusResponse): MascotStudioActivityItem[] {
  const styleItem = styleConceptItem(response);
  const items = [...(styleItem ? [styleItem] : []), ...expressiveStateItems(response), ...animationItems(response)];
  return items.sort((left, right) => {
    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
