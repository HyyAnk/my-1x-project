import { z } from "zod";
import { IsoDate, QUIZ_MAX_QUESTION_COUNT } from "./common.js";

export const VIDEO_DESCRIPTION_MAX_CHARS = 900;
export const VIDEO_DESCRIPTION_OPTIMAL_CHARS = 500;

export const VideoDescriptionScoringCtaSchema = z.object({
  beginner: z.string().trim().min(1),
  intermediate: z.string().trim().min(1),
  expert: z.string().trim().min(1),
  cta_text: z.string().trim().min(1),
});

export type VideoDescriptionScoringCta = z.infer<typeof VideoDescriptionScoringCtaSchema>;

export const VideoDescriptionSchema = z.object({
  topic_category: z.string().trim().min(1),
  primary_keyword: z.string().trim().min(1),
  keyword_variations: z.array(z.string().trim()).default([]),
  question_count: z.number().int().min(1).max(QUIZ_MAX_QUESTION_COUNT),
  hook_lines: z.string().trim().min(1),
  semantic_paragraph: z.string().trim().min(1),
  scoring_cta: VideoDescriptionScoringCtaSchema,
  suggested_playlist_category: z.string().trim().min(1),
  hashtags: z.array(z.string().trim()).min(1).max(10).default([]),
  full_description_text: z.string().trim().min(1),
  char_count: z.number().int().nonnegative().default(0),
  language: z.string().trim().default("English"),
  generated_at: IsoDate,
  updated_at: IsoDate.optional(),
});

export type VideoDescription = z.infer<typeof VideoDescriptionSchema>;

export const VideoDescriptionInputSchema = z.object({
  topic_category: z.string().trim().optional(),
  primary_keyword: z.string().trim().optional(),
  keyword_variations: z.array(z.string().trim()).optional(),
  hook_lines: z.string().trim().optional(),
  semantic_paragraph: z.string().trim().optional(),
  scoring_cta: VideoDescriptionScoringCtaSchema.optional(),
  suggested_playlist_category: z.string().trim().optional(),
  hashtags: z.array(z.string().trim()).optional(),
  full_description_text: z.string().trim().min(1),
});

export type VideoDescriptionInput = z.infer<typeof VideoDescriptionInputSchema>;

export const GenerateVideoDescriptionInputSchema = z.object({
  force: z.boolean().optional().default(false),
  tone_hint: z.string().trim().optional(),
});

export type GenerateVideoDescriptionInput = z.infer<typeof GenerateVideoDescriptionInputSchema>;
