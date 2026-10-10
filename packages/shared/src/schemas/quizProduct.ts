import { z } from "zod";
import { IsoDate } from "./common.js";

/**
 * A quiz product is any record the Quiz V2 pipeline can take from questions to a rendered
 * MP4. Episodes (landscape) and Quiz Shorts (portrait) are the two kinds today. Short Reels
 * are a separate scripted product and are not rendered by the pipeline.
 */
export const QuizProductKindSchema = z.enum(["episode", "quiz_short"]);
export type QuizProductKind = z.infer<typeof QuizProductKindSchema>;

export const QuizProductRefSchema = z
  .object({
    kind: QuizProductKindSchema,
    channel_id: z.string().min(1),
    product_id: z.string().min(1),
  })
  .strict();
export type QuizProductRef = z.infer<typeof QuizProductRefSchema>;

export function episodeProductRef(channelId: string, episodeId: string): QuizProductRef {
  return { kind: "episode", channel_id: channelId, product_id: episodeId };
}

export function quizShortProductRef(channelId: string, quizShortId: string): QuizProductRef {
  return { kind: "quiz_short", channel_id: channelId, product_id: quizShortId };
}

/** Media and render bookkeeping shared by every quiz product record. */
export const QuizProductMediaFieldsSchema = z.object({
  narration_asset_path: z.string().nullable().default(null),
  narration_generated_at: IsoDate.nullable().default(null),
  narration_duration_seconds: z.number().positive().nullable().default(null),
  narration_segment_count: z.number().int().nonnegative().default(0),
  measured_narration_words_per_second: z.number().positive().nullable().default(null),
  video_asset_path: z.string().nullable().default(null),
  video_generated_at: IsoDate.nullable().default(null),
  video_duration_seconds: z.number().positive().nullable().default(null),
  render_manifest_path: z.string().nullable().default(null),
  render_stale: z.boolean().default(false),
});
export type QuizProductMediaFields = z.infer<typeof QuizProductMediaFieldsSchema>;
