import type { VideoDescriptionScoringCta } from "@studio/shared";
import type { DescriptionChapter } from "./description.types.js";
import { formatChaptersBlock } from "./descriptionChapters.js";
import { getDescriptionSectionLocale } from "./descriptionSectionLocales.js";
import { YOUTUBE_HASHTAGS_MAX, sanitizeHashtagBody, sanitizeYouTubeDescription } from "./descriptionYouTubeSanitizer.js";

export interface AssembleDescriptionInput {
  hookLines: string;
  semanticParagraph: string;
  scoringCta: VideoDescriptionScoringCta;
  /** Internal taxonomy label; kept for metadata but never printed in the public description. */
  suggestedPlaylistCategory: string;
  hashtags: string[];
  chapters?: DescriptionChapter[];
  /** Pre-built channel footer (playlist, subscribe and about lines); omitted when empty. */
  channelFooter?: string;
  language?: string;
}

/**
 * Normalizes hashtags to YouTube-clickable form: one leading "#", no spaces or punctuation, no duplicates.
 */
export function normalizeHashtags(hashtags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of hashtags) {
    const clean = sanitizeHashtagBody(raw);
    if (!clean) continue;
    const tag = `#${clean}`;
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(tag);
    }
  }

  return result.slice(0, YOUTUBE_HASHTAGS_MAX);
}

/**
 * Assembles the full, beautifully formatted description text ready for YouTube / TikTok / Reels publication.
 */
export function assembleFullDescription(input: AssembleDescriptionInput): {
  fullText: string;
  charCount: number;
  hashtags: string[];
} {
  const { hookLines, semanticParagraph, scoringCta, chapters = [], channelFooter = "", language = "English" } = input;
  const normalizedTags = normalizeHashtags(input.hashtags);
  const locale = getDescriptionSectionLocale(language);

  const sections: string[] = [
    hookLines.trim(),
    semanticParagraph.trim(),
    formatChaptersBlock(chapters, locale.chaptersHeader),
    [
      locale.scoringHeader,
      `• ${scoringCta.beginner.trim()}`,
      `• ${scoringCta.intermediate.trim()}`,
      `• ${scoringCta.expert.trim()}`,
      `👉 ${scoringCta.cta_text.trim()}`,
    ].join("\n"),
    channelFooter.trim(),
    normalizedTags.join(" "),
  ];

  const fullText = sanitizeYouTubeDescription(sections.filter(Boolean).join("\n\n"));
  const charCount = fullText.length;

  return {
    fullText,
    charCount,
    hashtags: normalizedTags,
  };
}
