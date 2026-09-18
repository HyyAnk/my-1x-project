/**
 * Shared Mascot Style Concept Generation Job Zod Schemas
 */

import { z } from "zod";
import { MASCOT_STYLE_JOB_STATUSES, MASCOT_STYLE_BATCH_STATUSES, QUEUE_STYLE_GENERATION_MODES } from "./styleJobConstants.js";

export const MascotStyleJobStatusSchema = z.enum(MASCOT_STYLE_JOB_STATUSES);

export const MascotStyleBatchStatusSchema = z.enum(MASCOT_STYLE_BATCH_STATUSES);

export const MascotStyleConceptJobSchema = z.object({
  id: z.string().min(1),
  mascot_id: z.string().min(1),
  style_id: z.string().min(1),
  style_name: z.string(),
  status: MascotStyleJobStatusSchema,
  prompt: z.string().nullable().optional(),
  anchor_image_url: z.string().nullable().optional(),
  raw_anchor_image_url: z.string().nullable().optional(),
  prompt_used: z.string().nullable().optional(),
  placeholder: z.boolean().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string().min(1),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export const MascotStyleBatchJobSchema = z.object({
  id: z.string().min(1),
  mascot_id: z.string().min(1),
  status: MascotStyleBatchStatusSchema,
  total_styles: z.number().int().min(0),
  completed_count: z.number().int().min(0),
  failed_count: z.number().int().min(0),
  active_style_ids: z.array(z.string()),
  items: z.array(MascotStyleConceptJobSchema),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const QueueStyleGenerationModeSchema = z.enum(QUEUE_STYLE_GENERATION_MODES);

export const QueueStyleGenerationItemSchema = z.object({
  style_id: z.string().min(1),
  style_name: z.string().optional(),
  prompt: z.string().optional(),
});

export const QueueStyleGenerationInputSchema = z.object({
  styles: z.array(QueueStyleGenerationItemSchema).min(1),
  mode: QueueStyleGenerationModeSchema.optional().default("batch"),
});

export const StyleBatchStatusResponseSchema = z.object({
  active_batch: MascotStyleBatchJobSchema.nullable(),
  queued_style_ids: z.array(z.string()),
  active_style_ids: z.array(z.string()),
  recent_batches: z.array(MascotStyleBatchJobSchema).optional(),
});

export const CancelStyleGenerationInputSchema = z.object({
  batch_id: z.string().optional(),
  style_id: z.string().optional(),
  reason: z.string().optional(),
});
