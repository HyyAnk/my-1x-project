import {
  ANIMATION_STATES,
  buildAnimationPrompt,
  computeAnimationSourceFingerprint,
  getRecipeBySlot,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  SLOTS_PER_STATE,
  TOTAL_ANIMATION_SLOTS,
  type AnimationPromptContext,
  type AnimationState,
  type MascotAnimationBatch,
  type MascotAnimationJob,
  type MascotProfile,
} from "@studio/shared";
import type { AnimationRepository } from "./animationRepositoryTypes.js";

export interface AnimationPlanSlotItem {
  state: AnimationState;
  slot_index: number;
  recipe_id: string;
  action_instruction: string;
  prompt: string;
  source_fingerprint: string;
  status: "queued" | "skipped";
  skip_reason?: "fingerprint_match" | "already_ready" | "unselected";
  job?: MascotAnimationJob;
}

export interface AnimationStylePlan {
  mascot_id: string;
  style_id: string;
  batch_id: string;
  total_slots: number;
  planned_jobs: MascotAnimationJob[];
  skipped_slots: AnimationPlanSlotItem[];
  all_slots: AnimationPlanSlotItem[];
  created_at: string;
}

export interface AnimationPlanOptions {
  batchId?: string;
  providerRevision?: string;
  toolVersion?: string;
  force?: boolean;
  state?: AnimationState;
  slotIndex?: number;
}

export function planStyleAnimation(mascot: MascotProfile, styleId: string, options?: AnimationPlanOptions): AnimationStylePlan {
  const style = (mascot.styles || []).find((s) => s.id === styleId);
  if (!style) {
    throw new Error(`Style ${styleId} not found in mascot ${mascot.id}`);
  }

  const batchId = options?.batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const promptContext: AnimationPromptContext = {
    characterName: mascot.name,
    characterDescription: mascot.description || mascot.name,
    visualStyle: mascot.visual_style,
    anchorKeyword: style.keyword,
  };

  const allSlots: AnimationPlanSlotItem[] = [];
  const plannedJobs: MascotAnimationJob[] = [];
  const skippedSlots: AnimationPlanSlotItem[] = [];

  for (const state of ANIMATION_STATES) {
    const existingVariants = style.states?.[state] || [];

    for (let slotIndex = 1; slotIndex <= SLOTS_PER_STATE; slotIndex += 1) {
      const recipe = getRecipeBySlot(state, slotIndex);
      if (!recipe) {
        throw new Error(`No recipe found for state ${state} slot ${slotIndex}`);
      }

      const prompt = buildAnimationPrompt(recipe, promptContext);
      const sourceFingerprint = computeAnimationSourceFingerprint({
        styleAnchorIdOrUrl: style.anchor_image_url || style.id,
        recipeId: recipe.id,
        prompt,
        frameCount: REQUIRED_FRAME_COUNT,
        fps: REQUIRED_FPS,
        providerRevision: options?.providerRevision,
        toolVersion: options?.toolVersion,
      });

      const existingSlot = existingVariants.find((v) => v.slot_index === slotIndex);
      const isAlreadyReady = existingSlot?.status === "ready" && existingSlot.animation;
      const isFingerprintMatch = existingSlot?.animation?.source_fingerprint === sourceFingerprint;

      const isTargetState = !options?.state || options.state === state;
      const isTargetSlot = options?.slotIndex === undefined || options.slotIndex === slotIndex;
      const isTargeted = isTargetState && isTargetSlot;

      if (!isTargeted) {
        const item: AnimationPlanSlotItem = {
          state,
          slot_index: slotIndex,
          recipe_id: recipe.id,
          action_instruction: recipe.action_instruction,
          prompt,
          source_fingerprint: sourceFingerprint,
          status: "skipped",
          skip_reason: "unselected",
        };
        skippedSlots.push(item);
        allSlots.push(item);
      } else if (!options?.force && isAlreadyReady && isFingerprintMatch) {
        const item: AnimationPlanSlotItem = {
          state,
          slot_index: slotIndex,
          recipe_id: recipe.id,
          action_instruction: recipe.action_instruction,
          prompt,
          source_fingerprint: sourceFingerprint,
          status: "skipped",
          skip_reason: "fingerprint_match",
        };
        skippedSlots.push(item);
        allSlots.push(item);
      } else {
        const jobId = `job_${mascot.id}_${style.id}_${state}_${slotIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        const job: MascotAnimationJob = {
          id: jobId,
          batch_id: batchId,
          mascot_id: mascot.id,
          style_id: style.id,
          state,
          slot_index: slotIndex,
          recipe_id: recipe.id,
          status: "queued",
          fingerprint: sourceFingerprint,
          attempts: [],
          created_at: now,
          updated_at: now,
        };

        const item: AnimationPlanSlotItem = {
          state,
          slot_index: slotIndex,
          recipe_id: recipe.id,
          action_instruction: recipe.action_instruction,
          prompt,
          source_fingerprint: sourceFingerprint,
          status: "queued",
          job,
        };

        plannedJobs.push(job);
        allSlots.push(item);
      }
    }
  }

  if (allSlots.length !== TOTAL_ANIMATION_SLOTS) {
    throw new Error(`Invariant violation: planned slots count (${allSlots.length}) must equal exactly ${TOTAL_ANIMATION_SLOTS}`);
  }

  return {
    mascot_id: mascot.id,
    style_id: style.id,
    batch_id: batchId,
    total_slots: TOTAL_ANIMATION_SLOTS,
    planned_jobs: plannedJobs,
    skipped_slots: skippedSlots,
    all_slots: allSlots,
    created_at: now,
  };
}

export function planMultiStyleAnimation(
  mascot: MascotProfile,
  options?: AnimationPlanOptions & { styleIds?: string[] },
): AnimationStylePlan[] {
  const styles = mascot.styles || [];
  const targetStyles = options?.styleIds ? styles.filter((s) => options.styleIds?.includes(s.id)) : styles;

  return targetStyles.map((style) => planStyleAnimation(mascot, style.id, options));
}

export async function persistStylePlan(
  repository: AnimationRepository,
  plan: AnimationStylePlan,
): Promise<{ batch: MascotAnimationBatch; savedJobs: MascotAnimationJob[] }> {
  const now = new Date().toISOString();
  const batch: MascotAnimationBatch = {
    id: plan.batch_id,
    mascot_id: plan.mascot_id,
    style_id: plan.style_id,
    job_ids: plan.planned_jobs.map((j) => j.id),
    total_jobs: plan.planned_jobs.length,
    completed_jobs: 0,
    failed_jobs: 0,
    status: plan.planned_jobs.length === 0 ? "completed" : "pending",
    created_at: plan.created_at || now,
    updated_at: now,
  };

  await repository.saveBatch(batch);
  const savedJobs: MascotAnimationJob[] = [];
  for (const job of plan.planned_jobs) {
    savedJobs.push(await repository.saveJob(job));
  }

  return { batch, savedJobs };
}
