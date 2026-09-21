/**
 * Shared Mascot Style Generation Job TypeScript Interfaces and Types
 */

import type { MASCOT_STYLE_JOB_STATUSES, MASCOT_STYLE_BATCH_STATUSES, QUEUE_STYLE_GENERATION_MODES } from "./styleJobConstants.js";

export type MascotStyleJobStatus = (typeof MASCOT_STYLE_JOB_STATUSES)[number];
export type MascotStyleBatchStatus = (typeof MASCOT_STYLE_BATCH_STATUSES)[number];
export type QueueStyleGenerationMode = (typeof QUEUE_STYLE_GENERATION_MODES)[number];

export interface MascotStyleConceptJob {
  id: string;
  mascot_id: string;
  style_id: string;
  style_name: string;
  status: MascotStyleJobStatus;
  prompt?: string | null;
  anchor_image_url?: string | null;
  raw_anchor_image_url?: string | null;
  prompt_used?: string | null;
  placeholder?: boolean;
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface MascotStyleBatchJob {
  id: string;
  mascot_id: string;
  status: MascotStyleBatchStatus;
  total_styles: number;
  completed_count: number;
  failed_count: number;
  active_style_ids: string[];
  items: MascotStyleConceptJob[];
  created_at: string;
  updated_at: string;
}

export interface QueueStyleGenerationItem {
  style_id: string;
  style_name?: string;
  prompt: string;
}

export interface QueueStyleGenerationInput {
  styles: QueueStyleGenerationItem[];
  mode?: QueueStyleGenerationMode;
}

export interface StyleBatchStatusResponse {
  active_batch: MascotStyleBatchJob | null;
  queued_style_ids: string[];
  active_style_ids: string[];
  recent_batches?: MascotStyleBatchJob[];
}

export interface CancelStyleGenerationInput {
  batch_id?: string;
  style_id?: string;
  reason?: string;
}
