import type { MascotSlotProjection } from "@studio/shared";

const IN_FLIGHT = new Set(["uploading", "queued", "processing", "retrying", "replacing"]);

/** Disk-only in-flight projections have no executor in a newly created repository. */
export function recoverInterruptedSlot(slot: MascotSlotProjection): MascotSlotProjection {
  if (!IN_FLIGHT.has(slot.status)) return slot;
  return {
    ...slot,
    status: slot.active_revision_id ? "ready" : "failed",
    active_job_id: null,
    error_code: "PROCESSING_INTERRUPTED",
    error_message: "Processing stopped when the server restarted. Retry or upload a new video.",
    updated_at: new Date().toISOString(),
  };
}
