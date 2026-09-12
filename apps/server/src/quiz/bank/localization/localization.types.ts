import { z } from "zod";
import type { QuizQuestion, ShortReelDisplayProjection } from "@studio/shared";
import type { LLMClient } from "../../../utils/promptSanitizer.js";

export type { ShortReelDisplayProjection };

export const SUPPORTED_BASE_LANGUAGES = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"] as const;
export type SupportedBaseLanguage = (typeof SUPPORTED_BASE_LANGUAGES)[number];

export const LocalizedQuizChoiceSchema = z
  .object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1),
  })
  .strict();

export const LocalizedQuizQuestionSchema = z
  .object({
    question_id: z.string().trim().min(1),
    question: z.string().trim().min(1),
    choices: z.array(LocalizedQuizChoiceSchema).min(2),
    explanation: z.string().trim().min(1),
  })
  .strict();

export const ProductLocalizationArtifactSchema = z
  .object({
    schema_version: z.literal(1),
    product_id: z.string().trim().min(1),
    content_kind: z.enum(["episode", "short_reel"]),
    target_language: z.enum(SUPPORTED_BASE_LANGUAGES),
    source_question_ids: z.array(z.string().trim().min(1)),
    source_content_hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
    status: z.enum(["applied", "failed"]),
    quiz_questions: z.array(LocalizedQuizQuestionSchema),
    video_description: z.string().trim().optional(),
    thumbnail_text: z.string().trim().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export type ProductLocalizationArtifact = z.infer<typeof ProductLocalizationArtifactSchema>;

export type TranslateFunction = (params: {
  targetLanguage: SupportedBaseLanguage;
  items: Record<string, string>;
}) => Promise<Record<string, string>>;

export interface LocalizeProductContentInput {
  targetLanguage?: string;
  productId: string;
  contentKind: "episode" | "short_reel";
  sourceQuestionIds: string[];
  sourceContentHashes: string[];
  quizQuestions: QuizQuestion[];
  videoDescription?: string;
  thumbnailText?: string;
  translateFn?: TranslateFunction;
  llmClient?: LLMClient | null;
}

export type RepositoryStorageAccessor = {
  getChannel(channelId: string): Promise<{ slug: string }>;
  resolvePath(...segments: string[]): string;
  writeJsonAtomic?(filePath: string, data: unknown): Promise<void>;
};
