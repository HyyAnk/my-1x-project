import { z } from "zod";
import { QuizImageStyleSchema, ShortReelGenerationTargetSchema } from "../enums.js";
import { ShortReelRecordSchema, ShortReelEditCommandSchema } from "./shortReel.schema.js";
import { TaskSchema } from "../events.js";

export const ListShortReelsResponseSchema = z
  .object({
    short_reels: z.array(ShortReelRecordSchema),
  })
  .strict();

export const GetShortReelResponseSchema = z
  .object({
    short_reel: ShortReelRecordSchema,
    task: TaskSchema.nullable().optional(),
  })
  .strict();

export const UpdateShortReelRequestSchema = z
  .object({
    expected_revision: z.number().int().min(1),
    request_id: z.string().min(1),
    command: ShortReelEditCommandSchema,
  })
  .strict();

export const UpdateShortReelResponseSchema = z
  .object({
    short_reel: ShortReelRecordSchema,
  })
  .strict();

export const GenerateShortReelTargetSchema = ShortReelGenerationTargetSchema;

export const GenerateShortReelRequestSchema = z
  .object({
    expected_revision: z.number().int().min(1),
    request_id: z.string().min(1),
    target: GenerateShortReelTargetSchema,
  })
  .strict();

export const GenerateShortReelResponseSchema = z
  .object({
    task: TaskSchema,
    short_reel: ShortReelRecordSchema,
  })
  .strict();

export const CancelShortReelRequestSchema = z
  .object({
    operation_id: z.string().min(1),
    request_id: z.string().min(1),
  })
  .strict();

export const CancelShortReelResponseSchema = z
  .object({
    acknowledged: z.boolean(),
    short_reel: ShortReelRecordSchema,
    task: TaskSchema.nullable().optional(),
  })
  .strict();

export const CreateShortReelRequestSchema = z
  .object({
    question_id: z.string().trim().min(1),
    visual_style: z.union([QuizImageStyleSchema, z.literal("mixed")]).optional(),
  })
  .strict();

export const CreateShortReelResponseSchema = z
  .object({
    short_reel: ShortReelRecordSchema,
  })
  .strict();

export type ListShortReelsResponse = z.infer<typeof ListShortReelsResponseSchema>;
export type GetShortReelResponse = z.infer<typeof GetShortReelResponseSchema>;
export type UpdateShortReelRequest = z.infer<typeof UpdateShortReelRequestSchema>;
export type UpdateShortReelResponse = z.infer<typeof UpdateShortReelResponseSchema>;
export type GenerateShortReelTarget = z.infer<typeof GenerateShortReelTargetSchema>;
export type GenerateShortReelRequest = z.infer<typeof GenerateShortReelRequestSchema>;
export type GenerateShortReelResponse = z.infer<typeof GenerateShortReelResponseSchema>;
export type CancelShortReelRequest = z.infer<typeof CancelShortReelRequestSchema>;
export type CancelShortReelResponse = z.infer<typeof CancelShortReelResponseSchema>;
export type CreateShortReelRequest = z.infer<typeof CreateShortReelRequestSchema>;
export type CreateShortReelResponse = z.infer<typeof CreateShortReelResponseSchema>;
