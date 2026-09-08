import { z } from "zod";
import { BankQuestionSchema, type BankQuestion } from "../schemas/questionBank.js";

export function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  let i: number;
  let j: number;
  let result = "";

  const words: number[] = [];
  const bytes = new TextEncoder().encode(ascii);
  const bitLength = bytes.length * 8;

  let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
    0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
    0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
    0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
    0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < bytes.length; i++) {
    words[i >> 2] |= (bytes[i] & 0xff) << ((3 - (i % 4)) * 8);
  }

  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const w: number[] = [];
  for (i = 0; i < words.length; i += 16) {
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [(temp1 + temp2) | 0, oldHash[0], oldHash[1], oldHash[2], (oldHash[3] + temp1) | 0, oldHash[4], oldHash[5], oldHash[6]];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }

  return result;
}

export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJsonStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return `{${pairs.join(",")}}`;
}

export function isEnglishLanguage(lang?: string | null): boolean {
  if (!lang) return false;
  const trimmed = lang.trim().toLowerCase();
  return trimmed === "english" || trimmed === "en" || trimmed.startsWith("en-") || trimmed.startsWith("en_");
}

export const ReelArchetypeSchema = z.enum(["versus_faceoff", "deep_trivia"]);
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
    const expectedHash = computeSourceContentHash(source.original_question, {
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
    });

    if (source.content_hash !== expectedHash) {
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
