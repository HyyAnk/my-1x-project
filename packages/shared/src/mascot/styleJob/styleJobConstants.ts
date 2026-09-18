/**
 * Shared Mascot Style Concept Generation Job Constants
 *
 * Defines statuses, modes, and default bounds for mascot style concept generation jobs and batches.
 */

export const MASCOT_STYLE_JOB_STATUSES = ["queued", "generating", "completed", "failed", "cancelled"] as const;

export const MASCOT_STYLE_BATCH_STATUSES = ["queued", "processing", "completed", "cancelled", "failed"] as const;

export const QUEUE_STYLE_GENERATION_MODES = ["single", "batch", "all_missing", "all"] as const;
