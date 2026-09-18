import { z } from "zod";

export const MascotStyleAnimationParamsSchema = z.object({
  mascotId: z.string().trim().min(1, "mascotId is required"),
  styleId: z.string().trim().min(1, "styleId is required"),
});
export type MascotStyleAnimationParams = z.infer<typeof MascotStyleAnimationParamsSchema>;

export const PlanStyleAnimationsBodySchema = z
  .object({
    force: z.boolean().optional(),
    providerRevision: z.string().trim().optional(),
    toolVersion: z.string().trim().optional(),
    state: z.enum(["thinking", "celebrate"]).optional(),
    slotIndex: z.number().int().min(1).max(10).optional(),
  })
  .optional();
export type PlanStyleAnimationsBody = z.infer<typeof PlanStyleAnimationsBodySchema>;

export const MascotAnimationBatchParamsSchema = z.object({
  mascotId: z.string().trim().min(1, "mascotId is required"),
  batchId: z.string().trim().min(1, "batchId is required"),
});
export type MascotAnimationBatchParams = z.infer<typeof MascotAnimationBatchParamsSchema>;

export const StartAnimationBatchBodySchema = z
  .object({
    fixtureMode: z.boolean().optional(),
    sync: z.boolean().optional(),
  })
  .optional();
export type StartAnimationBatchBody = z.infer<typeof StartAnimationBatchBodySchema>;

export const MascotAnimationJobParamsSchema = z.object({
  mascotId: z.string().trim().min(1, "mascotId is required"),
  jobId: z.string().trim().min(1, "jobId is required"),
});
export type MascotAnimationJobParams = z.infer<typeof MascotAnimationJobParamsSchema>;

export const RetryAnimationJobBodySchema = z
  .object({
    fixtureMode: z.boolean().optional(),
  })
  .optional();
export type RetryAnimationJobBody = z.infer<typeof RetryAnimationJobBodySchema>;

export const CurateAnimationJobBodySchema = z.object({
  approved: z.boolean(),
  reviewed_by: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  selection_tag: z.string().trim().nullable().optional(),
});
export type CurateAnimationJobBody = z.infer<typeof CurateAnimationJobBodySchema>;
