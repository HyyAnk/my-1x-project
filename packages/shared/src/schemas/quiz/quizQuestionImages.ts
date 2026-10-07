import { z } from "zod";
import { ImageDimensionsSchema } from "./quizAssets.js";

export const QuestionImageStatusSchema = z.enum([
  "ai_generated",
  "user_uploaded",
  "fallback",
  "generating",
  "missing",
]);
export type QuestionImageStatus = z.infer<typeof QuestionImageStatusSchema>;

export const QuestionImageSourceSchema = z.enum([
  "explicit_episode",
  "channel_reusable",
  "cache",
  "provider",
  "fallback",
  "demo",
  "none",
]);
export type QuestionImageSource = z.infer<typeof QuestionImageSourceSchema>;

export const QuestionImageSlotPurposeSchema = z.enum([
  "hero_question_image",
  "answer_option",
  "supporting_media",
]);
export type QuestionImageSlotPurpose = z.infer<typeof QuestionImageSlotPurposeSchema>;

export const QuestionImageSlotSchema = z.object({
  slot_id: z.string().min(1),
  asset_id: z.string().min(1),
  label: z.string().default("Hero Image"),
  choice_id: z.string().optional(),
  choice_text: z.string().optional(),
  purpose: QuestionImageSlotPurposeSchema.default("hero_question_image"),
  aspect_ratio: z.string().default("16:9"),
  status: QuestionImageStatusSchema,
  source: QuestionImageSourceSchema,
  image_url: z.string().nullable().default(null),
  prompt: z.string().default(""),
  user_selected: z.boolean().default(false),
  price_vnd: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  dimensions: ImageDimensionsSchema.optional(),
  filename: z.string().optional(),
  updated_at: z.string().optional(),
  error_message: z.string().optional(),
});
export type QuestionImageSlot = z.infer<typeof QuestionImageSlotSchema>;

export const QuestionImageItemSchema = z.object({
  question_number: z.number().int().positive(),
  question_id: z.string().min(1),
  question_text: z.string(),
  layout_id: z.string().optional(),
  asset_id: z.string().min(1),
  status: QuestionImageStatusSchema,
  source: QuestionImageSourceSchema,
  image_url: z.string().nullable().default(null),
  prompt: z.string().default(""),
  aspect_ratio: z.string().default("16:9"),
  user_selected: z.boolean().default(false),
  price_vnd: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  dimensions: ImageDimensionsSchema.optional(),
  filename: z.string().optional(),
  updated_at: z.string().optional(),
  error_message: z.string().optional(),
  slots: z.array(QuestionImageSlotSchema).default([]),
});
export type QuestionImageItem = z.infer<typeof QuestionImageItemSchema>;

export const QuestionImagesOverviewResponseSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().min(1),
  total_questions: z.number().int().nonnegative(),
  ready_count: z.number().int().nonnegative(),
  uploaded_count: z.number().int().nonnegative(),
  missing_count: z.number().int().nonnegative(),
  items: z.array(QuestionImageItemSchema),
});
export type QuestionImagesOverviewResponse = z.infer<typeof QuestionImagesOverviewResponseSchema>;

export const UploadQuestionImageInputSchema = z.object({
  data: z.string().min(1, "Image data is required"),
  filename: z.string().trim().max(255).optional(),
  mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
  slot_id: z.string().trim().optional(),
  asset_id: z.string().trim().optional(),
});
export type UploadQuestionImageInput = z.infer<typeof UploadQuestionImageInputSchema>;

export const UploadQuestionImageResponseSchema = z.object({
  success: z.boolean(),
  item: QuestionImageItemSchema,
  invalidated: z.array(z.string()).default([]),
});
export type UploadQuestionImageResponse = z.infer<typeof UploadQuestionImageResponseSchema>;

export const ResetQuestionImageResponseSchema = z.object({
  success: z.boolean(),
  item: QuestionImageItemSchema,
  invalidated: z.array(z.string()).default([]),
});
export type ResetQuestionImageResponse = z.infer<typeof ResetQuestionImageResponseSchema>;

export const GenerateQuestionImageInputSchema = z.object({
  prompt_override: z.string().trim().optional(),
  force: z.boolean().optional().default(false),
});
export type GenerateQuestionImageInput = z.infer<typeof GenerateQuestionImageInputSchema>;
