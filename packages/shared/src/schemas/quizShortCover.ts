import { z } from "zod";

export const QUIZ_SHORT_COVER_HOOK_MAX_CHARS = 30;
export const QUIZ_SHORT_COVER_HOOK_HISTORY_LIMIT = 12;

/** Where the cover's hook banner came from. */
export const QuizShortCoverHookSourceSchema = z.enum(["llm", "question", "custom"]);
export type QuizShortCoverHookSource = z.infer<typeof QuizShortCoverHookSourceSchema>;

/**
 * The Quiz Short cover manifest: one 1080x1920 cover planned from a hook question. It is a
 * different artifact from the Episode thumbnail manifest (no layout catalog, no ratio variants),
 * so the web reads it through its own type instead of the Episode one.
 */
export const QuizShortCoverManifestSchema = z.object({
  version: z.literal(1),
  prompt_version: z.string().min(1),
  fingerprint: z.string().min(1),
  asset_path: z.string().min(1),
  hook_text: z.string().min(1),
  /** Index of the quiz question the hook was written from. */
  hook_question_index: z.number().int().nonnegative().optional(),
  hook_source: QuizShortCoverHookSourceSchema.optional(),
  /** Hooks of earlier covers, newest last, so a regenerated cover never repeats a recent one. */
  previous_hooks: z.array(z.string()).max(QUIZ_SHORT_COVER_HOOK_HISTORY_LIMIT).optional(),
  badge_text: z.string().min(1),
  archetype_name: z.string().min(1),
  width: z.literal(1080),
  height: z.literal(1920),
  provider: z.string().optional(),
  model: z.string().optional(),
  generated_at: z.string().min(1),
});
export type QuizShortCoverManifest = z.infer<typeof QuizShortCoverManifestSchema>;

/** Body of the cover regenerate route. Every field is optional: an empty body means "write me a fresh plan". */
export const QuizShortCoverGenerateInputSchema = z.object({
  hook_text: z
    .string()
    .trim()
    .min(1)
    .max(QUIZ_SHORT_COVER_HOOK_MAX_CHARS * 2)
    .optional(),
  question_index: z.number().int().nonnegative().optional(),
});
export type QuizShortCoverGenerateInput = z.infer<typeof QuizShortCoverGenerateInputSchema>;
