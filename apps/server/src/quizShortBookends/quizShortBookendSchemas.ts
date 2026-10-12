import { z } from "zod";
import { QuizShortTitleCanvasSchema, findBuiltInPresetById } from "@studio/shared";

const BuiltInPresetIdSchema = z
  .string()
  .min(1)
  .refine((value) => Boolean(findBuiltInPresetById(value)), { message: "Unknown built-in style preset" })
  .transform((value) => findBuiltInPresetById(value)!.id);

export const CreateQuizShortBookendPairInputSchema = z.object({
  /** Client-generated id that doubles as the idempotency key of the upload. */
  pair_id: z.string().regex(/^spair_[A-Za-z0-9-]{8,64}$/),
  style_preset_id: BuiltInPresetIdSchema,
  intro_data: z.string().min(1),
  outro_data: z.string().min(1),
  /** The outro keeps its own audio only when asked; by default the Short's BGM plays alone. */
  outro_keep_audio: z.boolean().default(false),
  title_canvas: QuizShortTitleCanvasSchema.optional(),
});
export type CreateQuizShortBookendPairInput = z.output<typeof CreateQuizShortBookendPairInputSchema>;

export const UpdateQuizShortBookendPairInputSchema = z
  .object({
    style_preset_id: BuiltInPresetIdSchema.optional(),
    status: z.enum(["active", "disabled"]).optional(),
    title_canvas: QuizShortTitleCanvasSchema.optional(),
  })
  .strict();
export type UpdateQuizShortBookendPairInput = z.output<typeof UpdateQuizShortBookendPairInputSchema>;
