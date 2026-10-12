import { z } from "zod";
import { IsoDate } from "./common.js";

/** Quiz Short bookend media is portrait Full HD, the same canvas the Short renders on. */
export const QUIZ_SHORT_BOOKEND_WIDTH = 1080;
export const QUIZ_SHORT_BOOKEND_HEIGHT = 1920;

export const QuizShortBookendKindSchema = z.enum(["intro", "outro"]);
export type QuizShortBookendKind = z.infer<typeof QuizShortBookendKindSchema>;

/**
 * The blank area of the intro loop where the quiz title is drawn, in 1080x1920 canvas pixels.
 * The default matches the framed panel of the reference intro: it stops above the mascot's
 * ears and inside the decorative border, and stays clear of the Shorts UI on the right edge.
 */
export const QuizShortTitleCanvasSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(QUIZ_SHORT_BOOKEND_WIDTH - 200),
    y: z
      .number()
      .int()
      .min(0)
      .max(QUIZ_SHORT_BOOKEND_HEIGHT - 200),
    width: z.number().int().min(200).max(QUIZ_SHORT_BOOKEND_WIDTH),
    height: z.number().int().min(200).max(QUIZ_SHORT_BOOKEND_HEIGHT),
  })
  .strict()
  .refine((rect) => rect.x + rect.width <= QUIZ_SHORT_BOOKEND_WIDTH && rect.y + rect.height <= QUIZ_SHORT_BOOKEND_HEIGHT, {
    message: "Title canvas must fit inside the 1080x1920 frame",
  });
export type QuizShortTitleCanvas = z.infer<typeof QuizShortTitleCanvasSchema>;

export const DEFAULT_QUIZ_SHORT_TITLE_CANVAS: QuizShortTitleCanvas = { x: 110, y: 280, width: 860, height: 900 };

export const QuizShortBookendClipMetaSchema = z.object({
  filename: z.string().min(1),
  duration_seconds: z.number().positive(),
  width: z.literal(QUIZ_SHORT_BOOKEND_WIDTH),
  height: z.literal(QUIZ_SHORT_BOOKEND_HEIGHT),
  fps: z.number().positive(),
  has_audio: z.boolean(),
  thumbnail_filename: z.string().optional(),
  sha256: z.string().length(64).optional(),
});
export type QuizShortBookendClipMeta = z.infer<typeof QuizShortBookendClipMetaSchema>;

/** One uploaded Quiz Short intro/outro pair, grouped under a built-in style preset. */
export const QuizShortBookendPairSchema = z.object({
  schema_version: z.literal(1).default(1),
  pair_id: z.string().min(1),
  channel_id: z.string().min(1),
  style_preset_id: z.string().min(1),
  name: z.string().min(1).max(50),
  status: z.enum(["active", "disabled"]).default("active"),
  /** The intro is always stored without audio: the Short's BGM starts on frame 0 over it. */
  intro: QuizShortBookendClipMetaSchema,
  outro: QuizShortBookendClipMetaSchema,
  title_canvas: QuizShortTitleCanvasSchema.default(DEFAULT_QUIZ_SHORT_TITLE_CANVAS),
  transition_type: z.string().min(1).default("stinger_swipe"),
  transition_duration_seconds: z.number().min(0).max(1.5).default(0.5),
  upload_fingerprint: z.string().length(64).optional(),
  created_at: IsoDate,
  updated_at: IsoDate,
});
export type QuizShortBookendPair = z.infer<typeof QuizShortBookendPairSchema>;

/** How a Quiz Short picks its bookends; `style_builtin` follows the Short's style preset category. */
export const QuizShortBookendSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("style_builtin") }),
  z.object({ mode: z.literal("specific_pair"), pair_id: z.string().min(1) }),
  z.object({ mode: z.literal("none") }),
]);
export type QuizShortBookendSelection = z.infer<typeof QuizShortBookendSelectionSchema>;

/**
 * The pinned bookend decision of one Quiz Short, so retries and later stages share one draw.
 * The fingerprint covers the media files only; title canvas edits apply on the next render.
 */
export const QuizShortBookendSnapshotSchema = z.object({
  version: z.literal(1),
  selection_key: z.string(),
  style_preset_id: z.string(),
  pair_id: z.string().nullable(),
  fingerprint: z.string().nullable(),
  intro_duration_seconds: z.number().nonnegative(),
  outro_duration_seconds: z.number().nonnegative(),
  outro_has_audio: z.boolean(),
  selected_at: IsoDate,
});
export type QuizShortBookendSnapshot = z.infer<typeof QuizShortBookendSnapshotSchema>;

export type QuizShortBookendCategorySummary = {
  style_preset_id: string;
  name: string;
  icon: string;
  total_count: number;
  ready_count: number;
};
