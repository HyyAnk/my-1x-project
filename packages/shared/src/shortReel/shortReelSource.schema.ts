import { z } from "zod";
import { BankQuestionSchema, type BankQuestion } from "../schemas/questionBank.js";
import { acceptLegacyVerdictAliases } from "../enums/quiz/legacyVerdictAliases.js";
import { canonicalJsonStringify, sha256Hex } from "../utils/contentHash.js";

export { canonicalJsonStringify, sha256Hex };

export function isEnglishLanguage(lang?: string | null): boolean {
  if (!lang) return false;
  const trimmed = lang.trim().toLowerCase();
  return trimmed === "english" || trimmed === "en" || trimmed.startsWith("en-") || trimmed.startsWith("en_");
}

export const REEL_ARCHETYPES = ["versus_faceoff", "deep_trivia", "verdict_yes_no"] as const;
export const ReelArchetypeSchema = acceptLegacyVerdictAliases(z.enum(REEL_ARCHETYPES));
export type ReelArchetype = z.infer<typeof ReelArchetypeSchema>;

export const ShortReelSourceProvenanceSchema = z.enum(["source", "verified_translation"]);
export type ShortReelSourceProvenance = z.infer<typeof ShortReelSourceProvenanceSchema>;

export const ShortReelSourceChoiceSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    is_correct: z.boolean(),
  })
  .strict();
export type ShortReelSourceChoice = z.infer<typeof ShortReelSourceChoiceSchema>;

export function computeSourceContentHash(
  originalQuestion: BankQuestion,
  projection: {
    question_id: string;
    archetype_id: string;
    question_text: string;
    choices: ShortReelSourceChoice[];
    correct_choice_id: string;
    explanation: string;
    selected_answer_text: string;
    source_language: string | null;
    translation_provenance: ShortReelSourceProvenance;
    original_updated_at: string | null;
  },
): string {
  const payload = {
    original_question: originalQuestion,
    projection,
  };
  const serialized = canonicalJsonStringify(payload);
  return sha256Hex(serialized);
}

/**
 * Snapshots written before the True/False retirement hashed the original ids, which parsing now rewrites
 * to Yes/No. Recomputing with each retired id combination keeps those snapshots verifiable.
 */
function matchesRetiredVerdictSourceHash(
  contentHash: string,
  originalQuestion: BankQuestion,
  projection: Parameters<typeof computeSourceContentHash>[1],
): boolean {
  if (originalQuestion.archetype_id !== "verdict_yes_no") return false;
  for (const archetype of ["verdict_true_false", "verdict_fact_myth", "verdict_yes_no"]) {
    for (const format of ["true_false", "yes_no"]) {
      for (const projectionArchetype of ["verdict_true_false", projection.archetype_id]) {
        const legacyQuestion = { ...originalQuestion, archetype_id: archetype, format } as unknown as BankQuestion;
        if (computeSourceContentHash(legacyQuestion, { ...projection, archetype_id: projectionArchetype }) === contentHash) return true;
      }
    }
  }
  return false;
}

function sourceContentHashMatches(
  contentHash: string,
  originalQuestion: BankQuestion,
  projection: Parameters<typeof computeSourceContentHash>[1],
): boolean {
  if (computeSourceContentHash(originalQuestion, projection) === contentHash) return true;
  return matchesRetiredVerdictSourceHash(contentHash, originalQuestion, projection);
}

export const CompleteShortReelSourceSnapshotSchema = z
  .object({
    fidelity: z.literal("complete").default("complete"),
    original_question: BankQuestionSchema,
    question_id: z.string().min(1),
    archetype_id: ReelArchetypeSchema,
    question_text: z.string().min(1),
    choices: z.array(ShortReelSourceChoiceSchema),
    correct_choice_id: z.string().min(1),
    explanation: z.string().min(1),
    selected_answer_text: z.string().min(1),
    source_language: z.string().nullable(),
    translation_provenance: ShortReelSourceProvenanceSchema,
    content_hash: z.string().length(64),
    original_updated_at: z.string().nullable(),
  })
  .strict()
  .superRefine((source, ctx) => {
    const choiceIds = new Set(source.choices.map((c) => c.id));
    if (choiceIds.size !== source.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source choices must have unique IDs",
        path: ["choices"],
      });
    }

    if (source.archetype_id === "versus_faceoff" && source.choices.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `versus_faceoff requires exactly 2 choices (found ${source.choices.length})`,
        path: ["choices"],
      });
    }

    if (source.archetype_id === "verdict_yes_no" && source.choices.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${source.archetype_id} requires exactly 2 choices (found ${source.choices.length})`,
        path: ["choices"],
      });
    }

    if (source.archetype_id === "deep_trivia" && source.choices.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `deep_trivia requires exactly 3 choices (found ${source.choices.length})`,
        path: ["choices"],
      });
    }

    const correctChoices = source.choices.filter((c) => c.is_correct);
    if (correctChoices.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Source must have exactly 1 correct choice (found ${correctChoices.length})`,
        path: ["choices"],
      });
    } else {
      const correctChoice = correctChoices[0];
      if (correctChoice.id !== source.correct_choice_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correct_choice_id "${source.correct_choice_id}" does not match correct choice "${correctChoice.id}"`,
          path: ["correct_choice_id"],
        });
      }
      if (source.selected_answer_text !== correctChoice.text) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "selected_answer_text must match text of correct choice",
          path: ["selected_answer_text"],
        });
      }
    }

    if (source.original_question.id !== source.question_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `question_id "${source.question_id}" does not match original_question.id "${source.original_question.id}"`,
        path: ["question_id"],
      });
    }

    if (source.original_question.archetype_id !== source.archetype_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `archetype_id "${source.archetype_id}" does not match original_question.archetype_id "${source.original_question.archetype_id}"`,
        path: ["archetype_id"],
      });
    }

    if (source.original_question.status !== "approved") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "original_question status must be 'approved'",
        path: ["original_question", "status"],
      });
    }

    if (source.original_question.correct_choice_id !== source.correct_choice_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `correct_choice_id "${source.correct_choice_id}" does not match original_question.correct_choice_id "${source.original_question.correct_choice_id}"`,
        path: ["correct_choice_id"],
      });
    }

    // Strict provenance fidelity check against original question / translation
    if (source.translation_provenance === "source") {
      if (!isEnglishLanguage(source.original_question.language)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `original_question language must be English for 'source' provenance (received '${source.original_question.language ?? ""}')`,
          path: ["translation_provenance"],
        });
      }
      if (source.source_language !== (source.original_question.language ?? null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "source_language does not match original_question.language",
          path: ["source_language"],
        });
      }
      if (source.question_text !== source.original_question.question) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "question_text does not match original_question.question",
          path: ["question_text"],
        });
      }
      if (source.explanation !== source.original_question.explanation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "explanation does not match original_question.explanation",
          path: ["explanation"],
        });
      }
      if (source.choices.length !== source.original_question.choices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "choices length does not match original_question.choices",
          path: ["choices"],
        });
      } else {
        for (const choice of source.choices) {
          const origChoice = source.original_question.choices.find((c) => c.id === choice.id);
          if (!origChoice || origChoice.text !== choice.text) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Choice "${choice.id}" text does not match original_question choice`,
              path: ["choices"],
            });
          }
        }
      }
    } else if (source.translation_provenance === "verified_translation") {
      const translations = source.original_question.translations ?? {};
      const matchingTranslation = Object.values(translations).find((trans) => {
        if (!trans.verified) return false;
        if (trans.language && !isEnglishLanguage(trans.language)) return false;
        if (trans.question !== source.question_text) return false;
        if (trans.explanation !== source.explanation) return false;
        if (trans.choices.length !== source.choices.length) return false;
        return source.choices.every((sc) => {
          const tc = trans.choices.find((c) => c.id === sc.id);
          return tc && tc.text === sc.text;
        });
      });

      if (!matchingTranslation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Projection does not match any valid verified English translation in original_question",
          path: ["translation_provenance"],
        });
      }
    }

    // Strict content hash derivation check
    const projection = {
      question_id: source.question_id,
      archetype_id: source.archetype_id,
      question_text: source.question_text,
      choices: source.choices,
      correct_choice_id: source.correct_choice_id,
      explanation: source.explanation,
      selected_answer_text: source.selected_answer_text,
      source_language: source.source_language,
      translation_provenance: source.translation_provenance,
      original_updated_at: source.original_updated_at,
    };
    if (!sourceContentHashMatches(source.content_hash, source.original_question, projection)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `content_hash does not match canonical source content hash`,
        path: ["content_hash"],
      });
    }
  });

export const IncompleteLegacyShortReelSourceSnapshotSchema = z
  .object({
    fidelity: z.literal("incomplete").default("incomplete"),
    original_question: z.undefined().optional(),
    question_id: z.string().min(1),
    archetype_id: ReelArchetypeSchema,
    question_text: z.string().min(1),
    choices: z.array(ShortReelSourceChoiceSchema),
    correct_choice_id: z.string().min(1),
    explanation: z.string().min(1),
    selected_answer_text: z.string().min(1),
    source_language: z.string().nullable().optional(),
    translation_provenance: ShortReelSourceProvenanceSchema.optional(),
    content_hash: z.string(),
    original_updated_at: z.string().nullable().optional(),
  })
  .strict()
  .superRefine((source, ctx) => {
    const choiceIds = new Set(source.choices.map((c) => c.id));
    if (choiceIds.size !== source.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source choices must have unique IDs",
        path: ["choices"],
      });
    }

    if (source.archetype_id === "versus_faceoff" && source.choices.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `versus_faceoff requires exactly 2 choices (found ${source.choices.length})`,
        path: ["choices"],
      });
    }

    if (source.archetype_id === "verdict_yes_no" && source.choices.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${source.archetype_id} requires exactly 2 choices (found ${source.choices.length})`,
        path: ["choices"],
      });
    }

    if (source.archetype_id === "deep_trivia" && source.choices.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `deep_trivia requires exactly 3 choices (found ${source.choices.length})`,
        path: ["choices"],
      });
    }

    const correctChoices = source.choices.filter((c) => c.is_correct);
    if (correctChoices.length !== 1 || correctChoices[0].id !== source.correct_choice_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Legacy source must have exactly 1 correct choice matching correct_choice_id",
        path: ["choices"],
      });
    }
  });

export const ShortReelSourceSnapshotSchema = z.union([
  CompleteShortReelSourceSnapshotSchema,
  IncompleteLegacyShortReelSourceSnapshotSchema,
]);

export type CompleteShortReelSourceSnapshot = z.infer<typeof CompleteShortReelSourceSnapshotSchema>;
export type IncompleteLegacyShortReelSourceSnapshot = z.infer<typeof IncompleteLegacyShortReelSourceSnapshotSchema>;
export type ShortReelSourceSnapshot = z.infer<typeof ShortReelSourceSnapshotSchema>;
