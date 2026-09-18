/**
 * Mascot Slot Job Planner
 *
 * Provides batch job descriptor planning, 20-slot style specs generation,
 * item merging for active batches, and status response aggregation.
 */

import {
  formatMascotSlotKey,
  makeId,
  type MascotSlotBatchJob,
  type MascotSlotGenerationJob,
  type QueueSlotGenerationInput,
  type SlotBatchStatusResponse,
} from "@studio/shared";

/**
 * Standard 20-slot specification for a mascot style:
 * 10 thinking slots and 10 celebrate slots.
 */
export function buildFullStyleSlotSpecs(styleId: string): Array<{
  style_id: string;
  state: "thinking" | "celebrate";
  slot_index: number;
}> {
  const specs: Array<{ style_id: string; state: "thinking" | "celebrate"; slot_index: number }> = [];
  for (let i = 1; i <= 10; i++) {
    specs.push({ style_id: styleId, state: "thinking", slot_index: i });
  }
  for (let i = 1; i <= 10; i++) {
    specs.push({ style_id: styleId, state: "celebrate", slot_index: i });
  }
  return specs;
}

/**
 * Builds a single MascotSlotGenerationJob descriptor in "queued" state.
 */
export function buildSlotGenerationJob(
  mascotId: string,
  styleId: string,
  slot: { state: "thinking" | "celebrate"; slot_index: number; prompt_modifier?: string | null },
  createdAt = new Date().toISOString(),
): MascotSlotGenerationJob {
  return {
    id: makeId("slotjob"),
    mascot_id: mascotId,
    style_id: styleId,
    state: slot.state,
    slot_index: slot.slot_index,
    status: "queued",
    prompt_modifier: slot.prompt_modifier ?? null,
    prompt_used: null,
    error: null,
    created_at: createdAt,
    started_at: null,
    completed_at: null,
  };
}

/**
 * Creates a new MascotSlotBatchJob record from user input.
 */
export function createSlotBatchRecord(
  mascotId: string,
  input: QueueSlotGenerationInput,
  now = new Date().toISOString(),
): MascotSlotBatchJob {
  const batchId = makeId("batch");
  const items: MascotSlotGenerationJob[] = input.slots.map((slot) => buildSlotGenerationJob(mascotId, input.style_id, slot, now));

  return {
    id: batchId,
    mascot_id: mascotId,
    style_id: input.style_id,
    status: items.length > 0 ? "queued" : "completed",
    total_slots: items.length,
    completed_count: 0,
    failed_count: 0,
    active_slot_keys: [],
    items,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Identifies slots that are not already pending or generating in an active batch
 * and builds new job descriptors for them.
 */
export function planNewBatchItems(
  existingBatch: MascotSlotBatchJob,
  mascotId: string,
  input: QueueSlotGenerationInput,
  now = new Date().toISOString(),
): MascotSlotGenerationJob[] {
  const newItems: MascotSlotGenerationJob[] = [];

  for (const slot of input.slots) {
    const isAlreadyPending = existingBatch.items.some(
      (item) =>
        item.state === slot.state && item.slot_index === slot.slot_index && (item.status === "queued" || item.status === "generating"),
    );

    if (!isAlreadyPending) {
      newItems.push(buildSlotGenerationJob(mascotId, input.style_id, slot, now));
    }
  }

  return newItems;
}

/**
 * Aggregates batch status and extracts active/queued slot keys for reactive clients.
 */
export function buildSlotBatchStatusResponse(
  activeBatch: MascotSlotBatchJob | null,
  recentBatches: MascotSlotBatchJob[],
): SlotBatchStatusResponse {
  const queuedSlotKeys: string[] = [];
  const activeSlotKeys: string[] = [];

  if (activeBatch) {
    for (const item of activeBatch.items) {
      const key = formatMascotSlotKey(item.state, item.slot_index);
      if (item.status === "generating") {
        activeSlotKeys.push(key);
      } else if (item.status === "queued") {
        queuedSlotKeys.push(key);
      }
    }
  }

  return {
    active_batch: activeBatch,
    queued_slot_keys: queuedSlotKeys,
    active_slot_keys: activeSlotKeys,
    recent_batches: recentBatches,
  };
}

/**
 * Appends new slot jobs to an existing active batch record if any slots are not yet queued/generating.
 * Modifies existingBatch in-place and returns it, or returns null if no new items were added.
 */
export function appendSlotsAndPrepareBatch(
  existingBatch: MascotSlotBatchJob,
  mascotId: string,
  input: QueueSlotGenerationInput,
  now = new Date().toISOString(),
): MascotSlotBatchJob | null {
  const newItems = planNewBatchItems(existingBatch, mascotId, input, now);
  if (newItems.length === 0) {
    return null;
  }

  existingBatch.items.push(...newItems);
  existingBatch.total_slots = existingBatch.items.length;
  existingBatch.updated_at = now;
  if (existingActiveStatusSettled(existingBatch.status)) {
    existingBatch.status = "processing";
  }

  return existingBatch;
}

function existingActiveStatusSettled(status: string): boolean {
  return status === "completed" || status === "failed";
}
