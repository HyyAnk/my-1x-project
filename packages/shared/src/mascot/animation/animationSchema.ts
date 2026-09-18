/**
 * Animation Schema Re-export Barrel
 *
 * Deconstructed into modular sub-schemas under ./schemas/:
 * - manifest.schema.ts: Animation manifest, atlas, frame rects, loop policies
 * - videoJob.schema.ts: MascotVideoProcessingJob, attempt metadata, revisions
 * - slotAnimation.schema.ts: Slot state, slot projection, publish eligibility helpers
 * - batch.schema.ts: Animation batches, jobs, attempts
 */

export * from "./schemas/index.js";
