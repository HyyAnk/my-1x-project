import { z } from "zod";
import { MascotBoundsSchema, MascotCanvasSizeSchema, MascotPointSchema } from "../../renderRegistrationSchema.js";
import {
  ANIMATION_SLOT_STATUSES,
  MASCOT_SLOT_STATE_MACHINE_STATUSES,
  SLOTS_PER_STATE,
  TOTAL_ANIMATION_SLOTS,
  type AnimationState,
} from "../animationConstants.js";
import { AnimationStateSchema, MascotPublishedAnimationAssetSchema } from "./manifest.schema.js";
import { MascotAnimationRevisionSchema, MascotProcessedAnimationSchema } from "./videoJob.schema.js";
import type { MascotAnimatedStateVariant, MascotProcessedAnimation } from "../types/index.js";

export const MascotSlotStatusSchema = z.enum(ANIMATION_SLOT_STATUSES);
export const MascotSlotStateSchema = z.enum(MASCOT_SLOT_STATE_MACHINE_STATUSES);

export const MascotSourceVariantSchema = z
  .object({
    style_id: z.string().trim().min(1, "Style ID cannot be empty"),
    state: AnimationStateSchema,
    slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
    image_url: z.string().trim(),
    raw_image_url: z.string().trim().nullable().optional(),
    transparent_image_url: z.string().trim().nullable().optional(),
    canvas: MascotCanvasSizeSchema,
    content_bounds: MascotBoundsSchema,
    pivot: MascotPointSchema,
    source_fingerprint: z.string().trim().min(1, "Source fingerprint cannot be empty"),
    status: z.union([MascotSlotStateSchema, MascotSlotStatusSchema]).default("empty"),
  })
  .superRefine((variant, ctx) => {
    if (variant.content_bounds.x + variant.content_bounds.width > variant.canvas.width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content_bounds", "width"],
        message: "Content bounds exceed canvas width",
      });
    }
    if (variant.content_bounds.y + variant.content_bounds.height > variant.canvas.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content_bounds", "height"],
        message: "Content bounds exceed canvas height",
      });
    }
    if (variant.pivot.x > variant.canvas.width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pivot", "x"],
        message: "Pivot exceeds canvas width",
      });
    }
    if (variant.pivot.y > variant.canvas.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pivot", "y"],
        message: "Pivot exceeds canvas height",
      });
    }
  });

export const MascotSlotProjectionSchema = z.object({
  style_id: z.string().trim().min(1),
  state: AnimationStateSchema,
  slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
  status: MascotSlotStateSchema,
  active_job_id: z.string().trim().nullable().optional(),
  active_attempt: z.number().int().positive().nullable().optional(),
  active_revision_id: z.string().trim().nullable().optional(),
  active_revision: MascotAnimationRevisionSchema.nullable().optional(),
  source_video_url: z.string().trim().nullable().optional(),
  source_video_fingerprint: z.string().trim().nullable().optional(),
  error_code: z.string().trim().nullable().optional(),
  error_message: z.string().trim().nullable().optional(),
  updated_at: z.string().trim().min(1),
});

export const MascotAnimatedStateVariantSchema = z
  .object({
    id: z.string().trim().min(1),
    slot_index: z.number().int().min(1).max(SLOTS_PER_STATE),
    image_url: z.string().default(""),
    prompt_modifier: z.string().optional(),
    status: z.union([MascotSlotStatusSchema, MascotSlotStateSchema]).default("not_started"),
    generation_revision: z.number().int().positive().optional(),
    animation: MascotPublishedAnimationAssetSchema.optional(),
    created_at: z.string().optional(),
  })
  .superRefine((slot, ctx) => {
    if (slot.status === "ready" && !slot.animation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["animation"],
        message: "A ready animation slot must include a valid animation asset",
      });
    }
  });

export function isAnimationSlotPublishEligible(slot: MascotAnimatedStateVariant): boolean {
  if (slot.status !== "ready" || !slot.animation) return false;
  const parseResult = MascotPublishedAnimationAssetSchema.safeParse(slot.animation);
  return parseResult.success;
}

export function isProcessedAnimationPublishEligible(animation: MascotProcessedAnimation): boolean {
  if (animation.status !== "ready") return false;
  const parseResult = MascotProcessedAnimationSchema.safeParse(animation);
  return parseResult.success;
}

export function isStyleAnimationPublishEligible(
  thinkingSlots: MascotAnimatedStateVariant[],
  celebrateSlots: MascotAnimatedStateVariant[],
): {
  eligible: boolean;
  readyCount: number;
  totalRequired: number;
  missingSlots: { state: AnimationState; slot_index: number }[];
} {
  const missingSlots: { state: AnimationState; slot_index: number }[] = [];
  let readyCount = 0;

  for (let i = 1; i <= SLOTS_PER_STATE; i += 1) {
    const thinkingMatch = thinkingSlots.find((s) => s.slot_index === i);
    if (thinkingMatch && isAnimationSlotPublishEligible(thinkingMatch)) {
      readyCount += 1;
    } else {
      missingSlots.push({ state: "thinking", slot_index: i });
    }

    const celebrateMatch = celebrateSlots.find((s) => s.slot_index === i);
    if (celebrateMatch && isAnimationSlotPublishEligible(celebrateMatch)) {
      readyCount += 1;
    } else {
      missingSlots.push({ state: "celebrate", slot_index: i });
    }
  }

  return {
    eligible: readyCount === TOTAL_ANIMATION_SLOTS && missingSlots.length === 0,
    readyCount,
    totalRequired: TOTAL_ANIMATION_SLOTS,
    missingSlots,
  };
}
