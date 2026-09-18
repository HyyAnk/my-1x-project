/**
 * Shared Mascot Slot Generation Job Zod Schemas
 */

import { z } from "zod";
import {
  MIN_SLOT_INDEX,
  MAX_SLOT_INDEX,
  MASCOT_SLOT_JOB_STATUSES,
  MASCOT_SLOT_BATCH_STATUSES,
  MASCOT_SLOT_JOB_STATES,
  QUEUE_SLOT_GENERATION_MODES,
} from "./slotJobConstants.js";

export const MascotSlotJobStatusSchema = z.enum(MASCOT_SLOT_JOB_STATUSES);

export const MascotSlotBatchStatusSchema = z.enum(MASCOT_SLOT_BATCH_STATUSES);

export const MascotSlotJobStateSchema = z.enum(MASCOT_SLOT_JOB_STATES);

export const MascotSlotGenerationJobSchema = z.object({
  id: z.string().min(1),
  mascot_id: z.string().min(1),
  style_id: z.string().min(1),
  state: MascotSlotJobStateSchema,
  slot_index: z.number().int().min(MIN_SLOT_INDEX).max(MAX_SLOT_INDEX),
  status: MascotSlotJobStatusSchema,
  prompt_modifier: z.string().nullable().optional(),
  prompt_used: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string().min(1),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export const MascotSlotBatchJobSchema = z.object({
  id: z.string().min(1),
  mascot_id: z.string().min(1),
  style_id: z.string().min(1),
  status: MascotSlotBatchStatusSchema,
  total_slots: z.number().int().min(0),
  completed_count: z.number().int().min(0),
  failed_count: z.number().int().min(0),
  active_slot_keys: z.array(z.string()),
  items: z.array(MascotSlotGenerationJobSchema),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const QueueSlotGenerationModeSchema = z.enum(QUEUE_SLOT_GENERATION_MODES);

export const QueueSlotGenerationItemSchema = z.object({
  state: MascotSlotJobStateSchema,
  slot_index: z.number().int().min(MIN_SLOT_INDEX).max(MAX_SLOT_INDEX),
  prompt_modifier: z.string().optional(),
});

export const QueueSlotGenerationInputSchema = z.object({
  style_id: z.string().min(1),
  slots: z.array(QueueSlotGenerationItemSchema),
  mode: QueueSlotGenerationModeSchema,
});

export const SlotBatchStatusResponseSchema = z.object({
  active_batch: MascotSlotBatchJobSchema.nullable(),
  queued_slot_keys: z.array(z.string()),
  active_slot_keys: z.array(z.string()),
  recent_batches: z.array(MascotSlotBatchJobSchema).optional(),
});

export const CancelSlotGenerationInputSchema = z.object({
  style_id: z.string().min(1),
  batch_id: z.string().optional(),
  reason: z.string().optional(),
});
