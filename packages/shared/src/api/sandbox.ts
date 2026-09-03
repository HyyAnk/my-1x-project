import { z } from "zod";
import {
  DirectorArchetypeSchema,
  MascotActionTypeSchema,
  QuizAnswerCardStyleSchema,
  QuizBackgroundStyleSchema,
  QuizQuestionBoxStyleSchema,
  QuizQuestionCounterStyleSchema,
  QuizQuestionFormatSchema,
  QuizThinkingBarStyleSchema,
  QuizVisualThemeSchema,
} from "../enums.js";
import { QUIZ_MAX_CHOICES_PER_QUESTION, QUIZ_MIN_CHOICES_PER_QUESTION } from "../schemas.js";
import { MascotRenderAspectRatioSchema } from "../mascot/renderSchema.js";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "../branding.js";
import { QuizPreviewLayoutIdSchema } from "../quizLayouts.js";
import { sandboxPreviewLayoutIssues } from "../sandboxPreviewLayoutPolicy.js";

export * from "../sandboxPreviewLayoutPolicy.js";

export const SandboxPreviewInputBaseSchema = z.object({
  aspect_ratio: MascotRenderAspectRatioSchema.optional().default("16:9"),
  theme: QuizVisualThemeSchema.optional().default("candy_arcade"),
  palette_id: z.string().optional().default("lime"),
  layout_id: QuizPreviewLayoutIdSchema.optional().default("media_left_choices_right"),
  question_format: QuizQuestionFormatSchema.optional(),
  archetype: DirectorArchetypeSchema.optional(),
  thinking_bar_style: QuizThinkingBarStyleSchema.optional().default("star_slider"),
  question_box_style: QuizQuestionBoxStyleSchema.optional().default("candy_pop"),
  answer_card_style: QuizAnswerCardStyleSchema.optional().default("glossy_arcade"),
  counter_style: QuizQuestionCounterStyleSchema.optional().default("hanging_woodsign"),
  background_style: QuizBackgroundStyleSchema.optional().default("candy_rays"),
  phase: z.enum(["question", "choices", "thinking", "reveal", "explain"]).optional().default("thinking"),
  timeline_time_seconds: z.number().min(0).max(15).optional(),
  question_text: z.string().optional().default("Which planet in our solar system has the most prominent rings?"),
  choices: z
    .array(z.string().trim().min(1))
    .min(QUIZ_MIN_CHOICES_PER_QUESTION)
    .max(QUIZ_MAX_CHOICES_PER_QUESTION)
    .optional()
    .default(["Jupiter", "Saturn", "Uranus"]),
  correct_choice_index: z
    .number()
    .int()
    .min(0)
    .max(QUIZ_MAX_CHOICES_PER_QUESTION - 1)
    .optional()
    .default(1),
  question_number: z.number().int().min(1).optional().default(1),
  total_questions: z.number().int().min(1).optional().default(10),
  countdown_progress: z.number().min(0).max(1).optional().default(0.5), // 0 to 1
  fact_card_title: z.string().optional().default("BẠN CÓ BIẾT?"),
  fact_card_text: z.string().optional().default("Hành tinh này có các đặc điểm kỳ thú và hệ thống vành đai ấn tượng nhất trong vũ trụ!"),
  mascot_id: z.string().nullable().optional(),
  mascot_enabled: z.boolean().optional().default(true),
  mascot_action: MascotActionTypeSchema.optional().default("thinking"),
  mascot_position: z.enum(["bottom_left", "bottom_right"]).optional().default("bottom_left"),
  mascot_scale: z.number().optional().default(1.0),
  mascot_offset_x: z.number().optional().default(0),
  mascot_offset_y: z.number().optional().default(0),
  mascot_flip_x: z.boolean().optional().default(false),
  mascot_phase: z.enum(["intro", "question", "choices", "thinking", "reveal", "explain", "outro"]).optional(),
  mascot_reveal_outcome: z.enum(["correct", "wrong", "timeout"]).optional().default("correct"),
  mascot_timeline_time_seconds: z.number().min(0).max(3600).optional(),
  mascot_playing: z.boolean().optional().default(false),
  mascot_show_in_intro: z.boolean().optional().default(true),
  mascot_show_in_outro: z.boolean().optional().default(true),
  mascot_show_in_question: z.boolean().optional().default(true),
  channel_brand_name: z.string().trim().max(CHANNEL_BRAND_NAME_MAX_LENGTH).optional().default(""),
  mode: z.enum(["snapshot", "rehearsal"]).optional().default("snapshot"),
  style_catalog_revision: z.string().trim().min(1).optional(),
});

export const SandboxPreviewInputSchema = SandboxPreviewInputBaseSchema.superRefine((input, ctx) => {
  if (input.correct_choice_index >= input.choices.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["correct_choice_index"],
      message: "Correct choice must reference a visible choice",
    });
  }
  for (const layoutIssue of sandboxPreviewLayoutIssues(input)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["layout_id"],
      message: `${layoutIssue.code}: ${layoutIssue.message}`,
      params: { layoutIssue },
    });
  }
});

export type SandboxPreviewInput = z.infer<typeof SandboxPreviewInputSchema>;
export type SandboxPreviewRequest = z.input<typeof SandboxPreviewInputSchema>;

export const SandboxPreviewResponseSchema = z.object({
  html: z.string(),
  css: z.string(),
  contrast_report: z.object({
    ok: z.boolean(),
    ratio: z.number().optional(),
    required_ratio: z.number().optional(),
    message: z.string().optional(),
  }),
});

export type SandboxPreviewResponse = z.infer<typeof SandboxPreviewResponseSchema>;
