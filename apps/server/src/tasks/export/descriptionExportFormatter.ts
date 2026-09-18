import type { VideoDescription } from "@studio/shared";

export interface FormatDescriptionInput {
  title: string;
  description?: VideoDescription | null;
  fallbackText?: string | null;
}

export function formatExportDescriptionText(input: FormatDescriptionInput): string {
  const { title, description, fallbackText } = input;
  const sections: string[] = [];

  // Title section
  sections.push(`[TITLE]\n${title.trim()}`);

  // Description body section
  const mainText = (description?.full_description_text ?? fallbackText ?? "").trim();
  if (mainText) {
    sections.push(`[DESCRIPTION]\n${mainText}`);
  }

  // Hashtags section
  const hashtags = description?.hashtags?.filter((h) => h.trim().length > 0) ?? [];
  if (hashtags.length > 0) {
    sections.push(`[HASHTAGS]\n${hashtags.join(" ")}`);
  }

  // Keywords / Tags section
  const keywords: string[] = [];
  if (description?.primary_keyword) {
    keywords.push(description.primary_keyword);
  }
  if (description?.keyword_variations && Array.isArray(description.keyword_variations)) {
    keywords.push(...description.keyword_variations);
  }
  const cleanKeywords = Array.from(new Set(keywords.map((k) => k.trim()).filter((k) => k.length > 0)));
  if (cleanKeywords.length > 0) {
    sections.push(`[TAGS / KEYWORDS]\n${cleanKeywords.join(", ")}`);
  }

  // Category section
  if (description?.suggested_playlist_category) {
    sections.push(`[CATEGORY]\n${description.suggested_playlist_category.trim()}`);
  }

  return `${sections.join("\n\n")}\n`;
}
