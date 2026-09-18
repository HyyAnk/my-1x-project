/**
 * Shared Mascot Slot Generation Job Constants
 *
 * Defines statuses, states, modes, and index bounds for mascot slot generation jobs and batches.
 */

export const MIN_SLOT_INDEX = 1 as const;
export const MAX_SLOT_INDEX = 10 as const;

export const MASCOT_SLOT_JOB_STATUSES = ["queued", "generating", "completed", "failed", "cancelled"] as const;

export const MASCOT_SLOT_BATCH_STATUSES = ["queued", "processing", "completed", "cancelled", "failed"] as const;

export const MASCOT_SLOT_JOB_STATES = ["thinking", "celebrate"] as const;

export const QUEUE_SLOT_GENERATION_MODES = ["batch_empty", "regenerate_selected", "single"] as const;
