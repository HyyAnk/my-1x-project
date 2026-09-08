import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { z } from "zod";
import { nowIso, type QuizQuestion } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";

export const SUPPORTED_BASE_LANGUAGES = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"] as const;
export type SupportedBaseLanguage = (typeof SUPPORTED_BASE_LANGUAGES)[number];

const LANGUAGE_NAME_MAP: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  japanese: "ja",
  korean: "ko",
  chinese: "zh",
  vietnamese: "vi",
};

export function normalizeTargetLanguage(lang?: string): SupportedBaseLanguage {
  const raw = (lang || "en").trim().toLowerCase();
  const mapped = LANGUAGE_NAME_MAP[raw] || raw;
  const base = mapped.split(/[-_]/)[0];

  if (base === "vi") {
    throw new RepositoryError(
      "UNSUPPORTED_TARGET_LANGUAGE: Vietnamese language is strictly prohibited by system specification.",
      "UNSUPPORTED_TARGET_LANGUAGE",
    );
  }

  if (!SUPPORTED_BASE_LANGUAGES.includes(base as SupportedBaseLanguage)) {
    throw new RepositoryError(
      `UNSUPPORTED_TARGET_LANGUAGE: Target language "${lang}" is not supported. Supported base languages: ${SUPPORTED_BASE_LANGUAGES.join(", ")}`,
      "UNSUPPORTED_TARGET_LANGUAGE",
    );
  }

  return base as SupportedBaseLanguage;
}

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

function requireTranslatedText(translations: Record<string, string>, key: string): string {
  const value = translations[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new RepositoryError(`LOCALIZATION_CONTENT_INCOMPLETE: Missing translation for "${key}"`, "LOCALIZATION_CONTENT_INCOMPLETE");
  }
  return value.trim();
}

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
}

/**
 * Localizes product-only consumer text fields (quiz display, video description, thumbnail text)
 * without ever altering canonical English source data or writing back to Question Bank.
 */
export async function localizeProductContent(input: LocalizeProductContentInput): Promise<ProductLocalizationArtifact> {
  const {
    targetLanguage,
    productId,
    contentKind,
    sourceQuestionIds,
    sourceContentHashes,
    quizQuestions,
    videoDescription,
    thumbnailText,
    translateFn,
  } = input;

  const normLang = normalizeTargetLanguage(targetLanguage);
  const now = nowIso();

  // 1. English target fast path (zero translation calls)
  if (normLang === "en") {
    return ProductLocalizationArtifactSchema.parse({
      schema_version: 1,
      product_id: productId,
      content_kind: contentKind,
      target_language: "en",
      source_question_ids: sourceQuestionIds,
      source_content_hashes: sourceContentHashes,
      status: "applied",
      quiz_questions: quizQuestions.map((q) => ({
        question_id: q.id,
        question: q.question,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
        explanation: q.explanation || "",
      })),
      ...(videoDescription ? { video_description: videoDescription } : {}),
      ...(thumbnailText ? { thumbnail_text: thumbnailText } : {}),
      created_at: now,
      updated_at: now,
    });
  }

  // 2. Non-English translation via provider
  const itemsToTranslate: Record<string, string> = {};

  quizQuestions.forEach((q) => {
    itemsToTranslate[`${q.id}_question`] = q.question;
    if (q.explanation) itemsToTranslate[`${q.id}_explanation`] = q.explanation;
    q.choices.forEach((c) => {
      itemsToTranslate[`${q.id}_choice_${c.id}`] = c.text;
    });
  });

  if (videoDescription) itemsToTranslate["product_video_description"] = videoDescription;
  if (thumbnailText) itemsToTranslate["product_thumbnail_text"] = thumbnailText;

  if (!translateFn) {
    throw new RepositoryError(`Cannot localize to "${normLang}": no translation provider configured`, "TRANSLATION_PROVIDER_MISSING");
  }

  const translatedMap = await translateFn({
    targetLanguage: normLang,
    items: itemsToTranslate,
  });

  // 3. Strict Choice and Content Integrity Validation
  const localizedQuestions = quizQuestions.map((q) => {
    const localizedChoices = q.choices.map((c) => {
      const translatedChoiceText = translatedMap[`${q.id}_choice_${c.id}`];
      if (!translatedChoiceText || !translatedChoiceText.trim()) {
        throw new RepositoryError(
          `LOCALIZATION_CHOICE_INTEGRITY_FAILED: Missing translation for choice "${c.id}" in question "${q.id}"`,
          "LOCALIZATION_CHOICE_INTEGRITY_FAILED",
        );
      }
      return {
        id: c.id,
        text: translatedChoiceText.trim(),
      };
    });

    return {
      question_id: q.id,
      question: requireTranslatedText(translatedMap, `${q.id}_question`),
      choices: localizedChoices,
      explanation: q.explanation ? requireTranslatedText(translatedMap, `${q.id}_explanation`) : "",
    };
  });

  const localizedDesc = videoDescription ? requireTranslatedText(translatedMap, "product_video_description") : undefined;
  const localizedThumb = thumbnailText ? requireTranslatedText(translatedMap, "product_thumbnail_text") : undefined;

  return ProductLocalizationArtifactSchema.parse({
    schema_version: 1,
    product_id: productId,
    content_kind: contentKind,
    target_language: normLang,
    source_question_ids: sourceQuestionIds,
    source_content_hashes: sourceContentHashes,
    status: "applied",
    quiz_questions: localizedQuestions,
    ...(localizedDesc ? { video_description: localizedDesc } : {}),
    ...(localizedThumb ? { thumbnail_text: localizedThumb } : {}),
    created_at: now,
    updated_at: now,
  });
}

export async function saveProductLocalizationArtifact(
  repo: RepositoryService,
  channelId: string,
  episodeSlug: string,
  artifact: ProductLocalizationArtifact,
): Promise<void> {
  const channel = await repo.getChannel(channelId);
  const validated = ProductLocalizationArtifactSchema.parse(artifact);
  const episodeDir = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug);
  await mkdir(episodeDir, { recursive: true });
  await repo.writeJsonAtomic(path.join(episodeDir, "localization.json"), validated);
}

export async function loadProductLocalizationArtifact(
  repo: RepositoryService,
  channelId: string,
  episodeSlug: string,
): Promise<ProductLocalizationArtifact | null> {
  const channel = await repo.getChannel(channelId);
  const filePath = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug, "localization.json");
  try {
    const raw = await readFile(filePath, "utf8");
    return ProductLocalizationArtifactSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
