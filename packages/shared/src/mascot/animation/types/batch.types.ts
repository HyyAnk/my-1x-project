import type { AnimationLoopPolicy, AnimationState, MascotSlotStatus } from "../animationConstants.js";

export interface MascotAnimationAttempt {
  attempt_number: number;
  status: MascotSlotStatus;
  fingerprint: string;
  error_message?: string | null;
  logs?: string[];
  started_at: string;
  completed_at?: string | null;
}

export interface MascotAnimationJob {
  id: string;
  batch_id?: string;
  mascot_id: string;
  style_id: string;
  state: AnimationState;
  slot_index: number;
  recipe_id: string;
  status: MascotSlotStatus;
  fingerprint: string;
  attempts: MascotAnimationAttempt[];
  current_attempt?: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export type MascotAnimationBatchStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface MascotAnimationBatch {
  id: string;
  mascot_id: string;
  style_id?: string;
  job_ids: string[];
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  status: MascotAnimationBatchStatus;
  created_at: string;
  updated_at: string;
}

export interface MascotAnimationRecipe {
  id: string;
  state: AnimationState;
  slot_index: number;
  name: string;
  description: string;
  action_instruction: string;
  energy_level: "low" | "moderate" | "high";
  loop_policy: AnimationLoopPolicy;
  movement_intent: string;
}
