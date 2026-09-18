import type { Episode } from "@studio/shared";
import { RepositoryError } from "../../repository/errors.js";
import { normalizeHashtags } from "./descriptionFormatter.js";
import type { DescriptionDefaults } from "./descriptionFallbackLocales.js";

export interface AssembledDescriptionFields {
  topicCategory: string;
  primaryKeyword: string;
  keywordVariations: string[];
  hookLines: string;
  semanticParagraph: string;
  scoringCta: {
    beginner: string;
    intermediate: string;
    expert: string;
    cta_text: string;
  };
  suggestedPlaylistCategory: string;
  hashtags: string[];
}

/**
 * Extracts and parses JSON from raw LLM string response.
 */
export function parseDescriptionJsonResponse(rawText: string): Record<string, unknown> {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\r?\n([\s\S]*?)\r?\n```$/i, "$1").trim();
  // If there's still text around JSON, match first { to last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/**
 * Assembles and validates description fields from raw JSON response and locale defaults.
 */
export function assembleDescriptionFields(
  rawJson: Record<string, unknown>,
  episode: Episode,
  normLang: string,
  defaults: DescriptionDefaults,
): AssembledDescriptionFields {
  const topicCategory = typeof rawJson.topic_category === "string" ? rawJson.topic_category.trim() : episode.topic.title;
  const primaryKeyword = typeof rawJson.primary_keyword === "string" ? rawJson.primary_keyword.trim() : episode.topic.title;
  const keywordVariations = Array.isArray(rawJson.keyword_variations)
    ? (rawJson.keyword_variations as string[]).map((k) => String(k).trim()).filter(Boolean)
    : [];

  if (!defaults.defaultHookLines && (!rawJson.hook_lines || typeof rawJson.hook_lines !== "string" || !rawJson.hook_lines.trim())) {
    throw new RepositoryError(
      `DESCRIPTION_LOCALIZATION_FAILED: Missing hook lines for ${normLang} description`,
      "DESCRIPTION_LOCALIZATION_FAILED",
    );
  }
  const hookLines =
    typeof rawJson.hook_lines === "string" && rawJson.hook_lines.trim() ? rawJson.hook_lines.trim() : defaults.defaultHookLines!;

  if (
    !defaults.defaultSemantic &&
    (!rawJson.semantic_paragraph || typeof rawJson.semantic_paragraph !== "string" || !rawJson.semantic_paragraph.trim())
  ) {
    throw new RepositoryError(
      `DESCRIPTION_LOCALIZATION_FAILED: Missing semantic paragraph for ${normLang} description`,
      "DESCRIPTION_LOCALIZATION_FAILED",
    );
  }
  const semanticParagraph =
    typeof rawJson.semantic_paragraph === "string" && rawJson.semantic_paragraph.trim()
      ? rawJson.semantic_paragraph.trim()
      : defaults.defaultSemantic!;

  const rawScoring = (rawJson.scoring_cta && typeof rawJson.scoring_cta === "object" ? rawJson.scoring_cta : {}) as Record<string, unknown>;

  const scoringCta = {
    beginner: typeof rawScoring.beginner === "string" && rawScoring.beginner.trim() ? rawScoring.beginner.trim() : defaults.defaultBeginner,
    intermediate:
      typeof rawScoring.intermediate === "string" && rawScoring.intermediate.trim()
        ? rawScoring.intermediate.trim()
        : defaults.defaultIntermediate,
    expert: typeof rawScoring.expert === "string" && rawScoring.expert.trim() ? rawScoring.expert.trim() : defaults.defaultExpert,
    cta_text: typeof rawScoring.cta_text === "string" && rawScoring.cta_text.trim() ? rawScoring.cta_text.trim() : defaults.defaultCtaText,
  };

  const suggestedPlaylistCategory =
    typeof rawJson.suggested_playlist_category === "string" ? rawJson.suggested_playlist_category.trim() : topicCategory;

  const rawTags = Array.isArray(rawJson.hashtags)
    ? (rawJson.hashtags as string[]).map((t) => String(t).trim()).filter(Boolean)
    : ["#quiz", "#trivia"];
  const hashtags = normalizeHashtags(rawTags);

  return {
    topicCategory,
    primaryKeyword,
    keywordVariations,
    hookLines,
    semanticParagraph,
    scoringCta,
    suggestedPlaylistCategory,
    hashtags,
  };
}
