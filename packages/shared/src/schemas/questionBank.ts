import { z } from "zod";
import { QuizAgeBandSchema, QuizQuestionFormatSchema } from "../enums.js";

export const BankGameplayArchetypeIdSchema = z.enum([
  "deep_trivia",
  "visual_spotting",
  "verdict_fact_myth",
  "versus_faceoff",
  "visual_identification",
  "speed_blitz",
  "mystery_reveal",
  "clue_deduction",
]);
export type BankGameplayArchetypeId = z.infer<typeof BankGameplayArchetypeIdSchema>;

export const BankChoiceSchema = z.object({
  id: z.string().trim().min(1).max(32),
  text: z.string().trim().min(1).max(200),
  is_correct: z.boolean().optional(),
  visual_prompt: z.string().trim().max(1000).optional(),
});
export type BankChoice = z.infer<typeof BankChoiceSchema>;

export const BankVisualSpecSchema = z.object({
  intent: z.enum(["question_illustration", "choice_illustration", "none"]).default("question_illustration"),
  prompt: z.string().trim().max(1000).optional(),
  aspect_ratio: z.enum(["16:9", "9:16"]).default("16:9"),
});
export type BankVisualSpec = z.infer<typeof BankVisualSpecSchema>;

export const BankTranslationChoiceSchema = z.object({
  id: z.string().trim().min(1).max(32),
  text: z.string().trim().min(1).max(250),
});
export type BankTranslationChoice = z.infer<typeof BankTranslationChoiceSchema>;

export const BankTranslationContentSchema = z.object({
  language: z.string().trim().min(1).max(40),
  question: z.string().trim().min(1).max(400),
  choices: BankTranslationChoiceSchema.array().min(2).max(4),
  explanation: z.string().trim().min(1).max(900),
  fun_fact: z.string().trim().max(700).default(""),
  translated_at: z.string().datetime().optional(),
  verified: z.boolean().default(false),
});
export type BankTranslationContent = z.infer<typeof BankTranslationContentSchema>;

export const BankQuestionStatusSchema = z.enum(["draft", "approved", "archived"]).default("approved");
export type BankQuestionStatus = z.infer<typeof BankQuestionStatusSchema>;

export const BankQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    archetype_id: BankGameplayArchetypeIdSchema,
    domain_id: z.string().trim().min(1).max(80),
    subtopic_id: z.string().trim().min(1).max(80),
    language: z.string().trim().min(1).max(40).optional(),
    question: z.string().trim().min(1).max(350),
    format: QuizQuestionFormatSchema,
    choices: BankChoiceSchema.array().min(2).max(4),
    correct_choice_id: z.string().trim().min(1),
    explanation: z.string().trim().min(1).max(800),
    fun_fact: z.string().trim().max(600).default(""),
    visual_spec: BankVisualSpecSchema.optional(),
    translations: z.record(z.string(), BankTranslationContentSchema).optional(),
    age_band: QuizAgeBandSchema.default("family"),
    difficulty: z.number().int().min(1).max(5).default(2),
    thinking_seconds: z.number().positive().max(30).optional(),
    tags: z.string().trim().array().default([]),
    status: BankQuestionStatusSchema,
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    const choiceIds = new Set(data.choices.map((c) => c.id));
    if (!choiceIds.has(data.correct_choice_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correct_choice_id"],
        message: `correct_choice_id "${data.correct_choice_id}" must exist in choices`,
      });
    }
  });
export type BankQuestion = z.infer<typeof BankQuestionSchema>;

export const BankSubtopicBatchSchema = z.object({
  schema_version: z.literal(2).default(2),
  archetype_id: BankGameplayArchetypeIdSchema,
  domain_id: z.string().trim().min(1).max(80),
  subtopic_id: z.string().trim().min(1).max(80),
  subtopic_title: z.string().trim().min(1).max(120),
  updated_at: z.string().datetime().optional(),
  questions: BankQuestionSchema.array(),
});
export type BankSubtopicBatch = z.infer<typeof BankSubtopicBatchSchema>;

export const BankSubtopicMetaSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).default(""),
});
export type BankSubtopicMeta = z.infer<typeof BankSubtopicMetaSchema>;

export const BankDomainMetaSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).default(""),
  icon: z.string().trim().max(50).default("Sparkle"),
  subtopics: BankSubtopicMetaSchema.array().default([]),
});
export type BankDomainMeta = z.infer<typeof BankDomainMetaSchema>;

export const BankTaxonomySchema = z.object({
  schema_version: z.literal(2).default(2),
  updated_at: z.string().datetime().optional(),
  domains: BankDomainMetaSchema.array(),
});
export type BankTaxonomy = z.infer<typeof BankTaxonomySchema>;

export const BankIndexSchema = z.object({
  schema_version: z.literal(2).default(2),
  target_total: z.number().int().positive().default(10000),
  current_total: z.number().int().nonnegative().default(0),
  by_archetype: z.record(z.string(), z.number().int().nonnegative()).default({}),
  by_domain: z.record(z.string(), z.number().int().nonnegative()).default({}),
  updated_at: z.string().datetime().optional(),
});
export type BankIndex = z.infer<typeof BankIndexSchema>;

export interface BankQuestionWithCooldown extends BankQuestion {
  channel_cooldown?: {
    is_cooldown: boolean;
    days_remaining: number;
    last_used_at?: string;
    episode_id?: string;
    episode_title?: string;
  };
}
