/**
 * Shared Mascot Slot Generation Job TypeScript Interfaces and Types
 */

import type {
  MASCOT_SLOT_JOB_STATUSES,
  MASCOT_SLOT_BATCH_STATUSES,
  MASCOT_SLOT_JOB_STATES,
  QUEUE_SLOT_GENERATION_MODES,
} from "./slotJobConstants.js";

export type MascotSlotJobStatus = (typeof MASCOT_SLOT_JOB_STATUSES)[number];
export type MascotSlotBatchStatus = (typeof MASCOT_SLOT_BATCH_STATUSES)[number];
export type MascotSlotJobState = (typeof MASCOT_SLOT_JOB_STATES)[number];
export type QueueSlotGenerationMode = (typeof QUEUE_SLOT_GENERATION_MODES)[number];

export interface MascotSlotGenerationJob {
  id: string;
  mascot_id: string;
  style_id: string;
  state: MascotSlotJobState;
  slot_index: number;
  status: MascotSlotJobStatus;
  prompt_modifier?: string | null;
  prompt_used?: string | null;
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface MascotSlotBatchJob {
  id: string;
  mascot_id: string;
  style_id: string;
  status: MascotSlotBatchStatus;
  total_slots: number;
  completed_count: number;
  failed_count: number;
  active_slot_keys: string[];
  items: MascotSlotGenerationJob[];
  created_at: string;
  updated_at: string;
}

export interface QueueSlotGenerationItem {
  state: MascotSlotJobState;
  slot_index: number;
  prompt_modifier?: string;
}

export interface QueueSlotGenerationInput {
  style_id: string;
  slots: QueueSlotGenerationItem[];
  mode: QueueSlotGenerationMode;
}

export interface SlotBatchStatusResponse {
  active_batch: MascotSlotBatchJob | null;
  queued_slot_keys: string[];
  active_slot_keys: string[];
  recent_batches?: MascotSlotBatchJob[];
}

export interface CancelSlotGenerationInput {
  style_id: string;
  batch_id?: string;
  reason?: string;
}
