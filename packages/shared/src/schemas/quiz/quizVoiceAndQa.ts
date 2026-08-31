import { z } from "zod";
import { QuizIssueStageSchema, VoicePauseClassSchema, VoicePhraseDeliverySchema, VoiceSegmentRoleSchema } from "../../enums.js";
import { IsoDate } from "../common.js";

export const VoicePhraseSchema = z.object({
  text: z.string().trim().min(1),
  delivery: VoicePhraseDeliverySchema.default("normal"),
  pause_after: VoicePauseClassSchema.default("none"),
});

export type VoicePhrase = z.infer<typeof VoicePhraseSchema>;

export const VoiceSegmentSchema = z.object({
  segment_id: z.string().min(1),
  role: VoiceSegmentRoleSchema,
  question_id: z.string().nullable().default(null),
  text: z.string().trim().min(1),
  duration_seconds: z.number().nonnegative().nullable().default(null),
  phrases: VoicePhraseSchema.array().default([]),
});

export type VoiceSegment = z.infer<typeof VoiceSegmentSchema>;

export const VoicePlanSchema = z
  .object({ schema_version: z.literal(2), episode_id: z.string().min(1), segments: VoiceSegmentSchema.array().min(1) })
  .superRefine((plan, ctx) => {
    if (new Set(plan.segments.map((segment) => segment.segment_id)).size !== plan.segments.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["segments"], message: "Voice segment IDs must be unique" });
  });

export type VoicePlan = z.infer<typeof VoicePlanSchema>;

export const QuizIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["blocker", "warning", "info"]),
  message: z.string().min(1),
  next_action: z.string().min(1),
  question_ids: z.string().array().default([]),
  stage: QuizIssueStageSchema,
});

export type QuizIssue = z.infer<typeof QuizIssueSchema>;

export const QuizAssessmentSchema = z.object({
  schema_version: z.literal(2),
  episode_id: z.string().min(1),
  assessed_at: IsoDate,
  score: z.number().int().min(0).max(100),
  rating: z.enum(["production_ready", "needs_review", "not_ready"]),
  categories: z.object({
    semantic: z.number().int().min(0).max(100),
    visual: z.number().int().min(0).max(100),
    pacing: z.number().int().min(0).max(100),
    audio: z.number().int().min(0).max(100),
    variety: z.number().int().min(0).max(100),
    render_integrity: z.number().int().min(0).max(100),
  }),
  candy_arcade_visual: z
    .object({
      pacing: z.number().int().min(0).max(20),
      hierarchy: z.number().int().min(0).max(15),
      asset_consistency: z.number().int().min(0).max(15),
      motion: z.number().int().min(0).max(15),
      reveal: z.number().int().min(0).max(10),
      transition: z.number().int().min(0).max(10),
      readability: z.number().int().min(0).max(10),
      visual_variety: z.number().int().min(0).max(5),
      total: z.number().int().min(0).max(100),
    })
    .optional(),
  issues: QuizIssueSchema.array(),
});

export type QuizAssessment = z.infer<typeof QuizAssessmentSchema>;
