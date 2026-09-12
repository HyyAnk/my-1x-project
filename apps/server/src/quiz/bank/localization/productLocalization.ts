import type { ShortReelDisplayProjection } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import {
  SUPPORTED_BASE_LANGUAGES,
  type SupportedBaseLanguage,
  type ProductLocalizationArtifact,
} from "./localization.types.js";

export type { ShortReelDisplayProjection };

export {
  SUPPORTED_BASE_LANGUAGES,
  type SupportedBaseLanguage,
  LocalizedQuizChoiceSchema,
  LocalizedQuizQuestionSchema,
  ProductLocalizationArtifactSchema,
  type ProductLocalizationArtifact,
  type TranslateFunction,
  type LocalizeProductContentInput,
  type RepositoryStorageAccessor,
} from "./localization.types.js";

export {
  createProductTranslationAdapter,
  localizeProductContent,
} from "./productTranslationService.js";

export {
  saveProductLocalizationArtifact,
  loadProductLocalizationArtifact,
  saveShortReelLocalizationArtifact,
  loadShortReelLocalizationArtifact,
  findConfirmationReceiptForProduct,
  resolveEpisodeTargetLanguage,
  resolveShortReelTargetLanguage,
} from "./productLocalizationStore.js";

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

export function extractShortReelDisplayProjection(
  source: {
    question_text: string;
    selected_choice_id?: string;
    correct_choice_id?: string;
    selected_answer_text: string;
    explanation?: string;
  },
  localization?: ProductLocalizationArtifact | null,
): ShortReelDisplayProjection {
  if (!localization || localization.target_language === "en" || !localization.quiz_questions?.length) {
    return {
      question_text: source.question_text,
      selected_answer_text: source.selected_answer_text,
      explanation: source.explanation,
      video_description: localization?.video_description,
      thumbnail_text: localization?.thumbnail_text,
    };
  }

  const localizedQ = localization.quiz_questions[0];
  const choiceMap = new Map(localizedQ.choices.map((c) => [c.id, c.text]));
  const choiceId = source.selected_choice_id || source.correct_choice_id;
  const projectedAnswerText =
    (choiceId ? choiceMap.get(choiceId) : undefined) || choiceMap.get("c1") || choiceMap.get("a") || source.selected_answer_text;

  return {
    question_text: localizedQ.question || source.question_text,
    selected_answer_text: projectedAnswerText || source.selected_answer_text,
    explanation: localizedQ.explanation || source.explanation,
    video_description: localization.video_description,
    thumbnail_text: localization.thumbnail_text,
  };
}
