import type { Episode, QuizV2 } from "@studio/shared";
import { normalizeTargetLanguage, type ProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import { getDescriptionSectionLocale } from "./descriptionSectionLocales.js";
import { sanitizeHashtagBody } from "./descriptionYouTubeSanitizer.js";

const MAX_TEASER_QUESTIONS = 3;
const MAX_TOPIC_HASHTAG_LENGTH = 30;
const TERMINAL_PUNCTUATION = /[.!?。！？]$/u;

export interface FallbackEnrichmentInput {
  normLang: string;
  episode: Episode;
  quiz: QuizV2;
  localization?: ProductLocalizationArtifact | null;
}

function safeLanguageKey(language: string): string | null {
  try {
    return normalizeTargetLanguage(language);
  } catch {
    return null;
  }
}

/**
 * Returns question texts in the target language, or nothing when only another
 * language is available (mixing languages breaks the description's integrity).
 */
function resolveTeaserQuestions(input: FallbackEnrichmentInput): string[] {
  const applied = input.localization?.status === "applied" ? input.localization : null;
  const sameLanguage = safeLanguageKey(input.quiz.language) === input.normLang;
  if (!applied && !sameLanguage) return [];
  return input.quiz.questions.slice(0, MAX_TEASER_QUESTIONS).map((question) => {
    const localized = applied?.quiz_questions?.find((item) => item.question_id === question.id)?.question;
    const text = (localized || question.question).trim();
    return TERMINAL_PUNCTUATION.test(text) ? text : `${text}?`;
  });
}

/** Builds a CamelCase topic hashtag such as "#AncientWonders", or null when it would be too long. */
export function buildTopicHashtag(title: string): string | null {
  const camel = title
    .split(/\s+/)
    .map((word) => sanitizeHashtagBody(word))
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return camel && camel.length <= MAX_TOPIC_HASHTAG_LENGTH ? `#${camel}` : null;
}

/**
 * Makes the template fallback unique per episode by teasing the episode's own questions
 * (questions never contain their answers) and adding a topic hashtag, so repeated
 * provider failures never publish identical descriptions across a channel.
 */
export function enrichFallbackDescription(fallback: Record<string, unknown>, input: FallbackEnrichmentInput): Record<string, unknown> {
  const teasers = resolveTeaserQuestions(input);
  const lead = getDescriptionSectionLocale(input.normLang).fallbackTeaserLead;
  const fallbackSemantic = typeof fallback.semantic_paragraph === "string" ? fallback.semantic_paragraph : "";
  const base = input.normLang === "en" ? input.episode.topic.hook : fallbackSemantic;
  const semantic = teasers.length > 0 ? [base.trim(), lead, ...teasers].filter(Boolean).join(" ") : fallback.semantic_paragraph;

  const localizedTitle = input.localization?.status === "applied" ? input.localization.thumbnail_text : undefined;
  const topicTitle = input.normLang === "en" ? input.episode.topic.title : localizedTitle;
  const topicHashtag = topicTitle ? buildTopicHashtag(topicTitle) : null;
  const baseHashtags = Array.isArray(fallback.hashtags) ? (fallback.hashtags as string[]) : [];
  const hashtags = topicHashtag ? [topicHashtag, ...baseHashtags] : baseHashtags;

  return { ...fallback, semantic_paragraph: semantic, hashtags };
}
