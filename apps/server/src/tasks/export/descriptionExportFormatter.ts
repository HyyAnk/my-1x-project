import type { VideoDescription } from "@studio/shared";
import { sanitizeYouTubeDescription, sanitizeYouTubeTags } from "../../quiz/description/descriptionYouTubeSanitizer.js";

export interface FormatDescriptionInput {
  title: string;
  description?: VideoDescription | null;
  fallbackText?: string | null;
  /** Pre-processed body (e.g. with refreshed chapters) that overrides the stored text. */
  bodyText?: string | null;
}

/** Collects primary and variation keywords as YouTube-safe tags within the 500-character budget. */
export function collectDescriptionTags(description?: VideoDescription | null): string[] {
  if (!description) return [];
  return sanitizeYouTubeTags([description.primary_keyword, ...(description.keyword_variations ?? [])]);
}

export function formatExportDescriptionText(input: FormatDescriptionInput): string {
  const { title, description, fallbackText, bodyText } = input;
  const sections: string[] = [];

  // Title section
  sections.push(`[TITLE]\n${title.trim()}`);

  // Description body section
  const mainText = sanitizeYouTubeDescription(bodyText || description?.full_description_text || fallbackText || "");
  if (mainText) {
    sections.push(`[DESCRIPTION]\n${mainText}`);
  }

  // Hashtags section
  const hashtags = description?.hashtags?.filter((h) => h.trim().length > 0) ?? [];
  if (hashtags.length > 0) {
    sections.push(`[HASHTAGS]\n${hashtags.join(" ")}`);
  }

  // Keywords / Tags section
  const cleanKeywords = collectDescriptionTags(description);
  if (cleanKeywords.length > 0) {
    sections.push(`[TAGS / KEYWORDS]\n${cleanKeywords.join(", ")}`);
  }

  // Category section
  if (description?.suggested_playlist_category) {
    sections.push(`[CATEGORY]\n${description.suggested_playlist_category.trim()}`);
  }

  return `${sections.join("\n\n")}\n`;
}
