import { z } from "zod";
import { SLOTS_PER_STATE } from "../animationConstants.js";
import { AnimationStateSchema } from "./manifest.schema.js";
import { MascotSlotStatusSchema } from "./slotAnimation.schema.js";

export const MascotAnimationAttemptSchema = z.object({
  attempt_number: z.number().int().min(1),
  status: MascotSlotStatusSchema,
  fingerprint: z.string().trim().min(1),
  error_message: z.string().nullable().optional(),
  logs: z.array(z.string()).optional(),
  started_at: z.string().trim().min(1),
  completed_at: z.string().trim().nullable().optional(),
});

export const MascotAnimationJobSchema = z.object({
  id: z.string().trim().min(1),
  batch_id: z.string().trim().optional(),
  mascot_id: z.string().trim().min(1),
  style_id: z.string().trim().min(1),
  state: AnimationStateSchema,
  slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
  recipe_id: z.string().trim().min(1),
  status: MascotSlotStatusSchema,
  fingerprint: z.string().trim().min(1),
  attempts: z.array(MascotAnimationAttemptSchema).default([]),
  current_attempt: z.number().int().min(1).optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().trim().min(1),
  updated_at: z.string().trim().min(1),
});

export const MascotAnimationBatchSchema = z.object({
  id: z.string().trim().min(1),
  mascot_id: z.string().trim().min(1),
  style_id: z.string().trim().optional(),
  job_ids: z.array(z.string().trim().min(1)),
  total_jobs: z.number().int().min(0),
  completed_jobs: z.number().int().min(0),
  failed_jobs: z.number().int().min(0),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  created_at: z.string().trim().min(1),
  updated_at: z.string().trim().min(1),
});
