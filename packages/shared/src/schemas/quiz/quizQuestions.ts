import { z } from "zod";
import { QuizAgeBandSchema, type QuizQuestionFormat, QuizQuestionFormatSchema } from "../../enums.js";
import {
  QUIZ_MAX_CHOICES_PER_QUESTION,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_CHOICES_PER_QUESTION,
  QUIZ_STANDARD_CHOICES_PER_QUESTION,
  QUIZ_TRUE_FALSE_CHOICES_PER_QUESTION,
} from "../common.js";

export function quizChoiceCountForFormat(format: QuizQuestionFormat): number {
  return format === "true_false" ? QUIZ_TRUE_FALSE_CHOICES_PER_QUESTION : QUIZ_STANDARD_CHOICES_PER_QUESTION;
}

export const QuizChoiceSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/),
  text: z.string().trim().min(1).max(180),
});

export type QuizChoice = z.infer<typeof QuizChoiceSchema>;

export const QuizQuestionValidationSchema = z.object({
  semantic_status: z.enum(["pending", "validated"]).default("validated"),
  source_coverage: z.boolean().default(false),
  fact_locked: z.boolean().default(true),
});

export type QuizQuestionValidation = z.infer<typeof QuizQuestionValidationSchema>;

export const QuizQuestionSchema = z
  .object({
    id: z.string().min(1).max(80),
    number: z.number().int().positive(),
    format: QuizQuestionFormatSchema,
    difficulty: z.number().int().min(1).max(5),
    question: z.string().trim().min(1).max(320),
    choices: QuizChoiceSchema.array().min(QUIZ_MIN_CHOICES_PER_QUESTION).max(QUIZ_MAX_CHOICES_PER_QUESTION),
    correct_choice_id: z.string().min(1),
    explanation: z.string().trim().min(1).max(600),
    fun_fact: z.string().trim().max(600).default(""),
    source_ids: z.string().min(1).array().default([]),
    visual_opportunity: z.string().trim().max(1000).default(""),
    validation: QuizQuestionValidationSchema.default({}),
  })
  .superRefine((question, ctx) => {
    const choiceIds = new Set<string>();
    const choiceTexts = new Set<string>();
    for (const choice of question.choices) {
      if (choiceIds.has(choice.id))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: `Choice ID ${choice.id} is duplicated` });
      choiceIds.add(choice.id);
      const normalizedText = choice.text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (choiceTexts.has(normalizedText))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: "Visible choices must be unique after normalization" });
      choiceTexts.add(normalizedText);
    }
    if (!choiceIds.has(question.correct_choice_id))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correct_choice_id"],
        message: "Canonical answer must reference a visible choice",
      });
    const requiredChoiceCount = quizChoiceCountForFormat(question.format);
    if (question.choices.length !== requiredChoiceCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["choices"],
        message:
          question.format === "true_false"
            ? "True or false questions require exactly two choices"
            : "Quiz questions require exactly three choices: A, B, and C",
      });
    }
  });

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizV2Schema = z
  .object({
    schema_version: z.literal(2),
    episode_id: z.string().min(1),
    age_band: QuizAgeBandSchema,
    language: z.string().trim().min(1).max(80),
    questions: QuizQuestionSchema.array().min(1).max(QUIZ_MAX_QUESTION_COUNT),
  })
  .superRefine((quiz, ctx) => {
    const ids = new Set<string>();
    const numbers = new Set<number>();
    quiz.questions.forEach((question, index) => {
      if (ids.has(question.id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "id"],
          message: `Question ID ${question.id} is duplicated`,
        });
      ids.add(question.id);
      if (numbers.has(question.number))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "number"],
          message: `Question number ${question.number} is duplicated`,
        });
      numbers.add(question.number);
      if (question.number !== index + 1)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["questions", index, "number"], message: "Question numbers must be sequential" });
    });
  });

export type QuizV2 = z.infer<typeof QuizV2Schema>;
