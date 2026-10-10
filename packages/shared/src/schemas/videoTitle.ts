import { z } from "zod";
import { IsoDate } from "./common.js";

/** YouTube rejects titles longer than 100 characters. */
export const VIDEO_TITLE_MAX_CHARS = 100;
/** Titles longer than this are truncated in search results and on mobile. */
export const VIDEO_TITLE_VISIBLE_CHARS = 70;
/** The primary keyword must start within this many characters to count as front-loaded. */
export const VIDEO_TITLE_KEYWORD_WINDOW_CHARS = 40;

export const VideoTitleSourceSchema = z.enum(["llm", "fallback", "manual"]);

export type VideoTitleSource = z.infer<typeof VideoTitleSourceSchema>;

export const VideoTitleSchema = z.object({
  title: z.string().trim().min(1).max(VIDEO_TITLE_MAX_CHARS),
  primary_keyword: z.string().trim().min(1),
  char_count: z.number().int().nonnegative(),
  language: z.string().trim().default("English"),
  source: VideoTitleSourceSchema,
  generated_at: IsoDate,
  updated_at: IsoDate.optional(),
});

export type VideoTitle = z.infer<typeof VideoTitleSchema>;

export const VideoTitleInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(VIDEO_TITLE_MAX_CHARS)
    .refine((value) => !/[<>]/.test(value), { message: "YouTube titles cannot contain < or >" }),
  primary_keyword: z.string().trim().min(1).optional(),
});

export type VideoTitleInput = z.infer<typeof VideoTitleInputSchema>;

export const GenerateVideoTitleInputSchema = z.object({
  tone_hint: z.string().trim().optional(),
});

export type GenerateVideoTitleInput = z.infer<typeof GenerateVideoTitleInputSchema>;
