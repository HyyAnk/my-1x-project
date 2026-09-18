import { z } from "zod";

export const UploadMascotSlotVideoParamsSchema = z.object({
  mascotId: z.string().trim().min(1, "mascotId is required"),
  styleId: z.string().trim().min(1, "styleId is required"),
  state: z.enum(["thinking", "celebrate"]),
  slot: z.coerce.number().int().min(1).max(10),
});
export type UploadMascotSlotVideoParams = z.infer<typeof UploadMascotSlotVideoParamsSchema>;

export const UploadMascotSlotVideoBodySchema = z.object({
  data: z.string().min(1, "Video data is required"),
  filename: z.string().trim().min(1).default("source.mp4"),
  mime_type: z.string().trim().optional(),
  fixture_mode: z.boolean().optional(),
});
export type UploadMascotSlotVideoBody = z.infer<typeof UploadMascotSlotVideoBodySchema>;

export const GetAnimationProcessingJobParamsSchema = z.object({
  mascotId: z.string().trim().min(1, "mascotId is required"),
  jobId: z.string().trim().min(1, "jobId is required"),
});
export type GetAnimationProcessingJobParams = z.infer<typeof GetAnimationProcessingJobParamsSchema>;

export const GetStyleAnimationSlotsParamsSchema = z.object({
  mascotId: z.string().trim().min(1, "mascotId is required"),
  styleId: z.string().trim().min(1, "styleId is required"),
});
export type GetStyleAnimationSlotsParams = z.infer<typeof GetStyleAnimationSlotsParamsSchema>;

export const CancelAnimationProcessingJobBodySchema = z
  .object({
    reason: z.string().trim().optional(),
  })
  .optional();
export type CancelAnimationProcessingJobBody = z.infer<typeof CancelAnimationProcessingJobBodySchema>;
