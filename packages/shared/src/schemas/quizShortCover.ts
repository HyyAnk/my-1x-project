import { z } from "zod";

/**
 * The Quiz Short cover manifest: one 1080x1920 cover planned from the hook question. It is a
 * different artifact from the Episode thumbnail manifest (no layout catalog, no ratio variants),
 * so the web reads it through its own type instead of the Episode one.
 */
export const QuizShortCoverManifestSchema = z.object({
  version: z.literal(1),
  prompt_version: z.string().min(1),
  fingerprint: z.string().min(1),
  asset_path: z.string().min(1),
  hook_text: z.string().min(1),
  badge_text: z.string().min(1),
  archetype_name: z.string().min(1),
  width: z.literal(1080),
  height: z.literal(1920),
  provider: z.string().optional(),
  model: z.string().optional(),
  generated_at: z.string().min(1),
});
export type QuizShortCoverManifest = z.infer<typeof QuizShortCoverManifestSchema>;
