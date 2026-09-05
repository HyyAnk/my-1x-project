import type { VideoDescriptionScoringCta } from "@studio/shared";

export interface AssembleDescriptionInput {
  hookLines: string;
  semanticParagraph: string;
  scoringCta: VideoDescriptionScoringCta;
  suggestedPlaylistCategory: string;
  hashtags: string[];
  language?: string;
}

/**
 * Normalizes hashtags by removing duplicate # symbols and spaces.
 */
export function normalizeHashtags(hashtags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of hashtags) {
    const clean = raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (!clean) continue;
    const tag = `#${clean}`;
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(tag);
    }
  }

  return result;
}

/**
 * Assembles the full, beautifully formatted description text ready for YouTube / TikTok / Reels publication.
 */
export function assembleFullDescription(input: AssembleDescriptionInput): {
  fullText: string;
  charCount: number;
  hashtags: string[];
} {
  const { hookLines, semanticParagraph, scoringCta, suggestedPlaylistCategory, language = "English" } = input;
  const normalizedTags = normalizeHashtags(input.hashtags);

  const scoringHeader = "🏆 SCORING TIERS:";
  const playlistHeader = "📂 Playlist Category:";

  const sections: string[] = [
    hookLines.trim(),
    semanticParagraph.trim(),
    [
      scoringHeader,
      `• ${scoringCta.beginner.trim()}`,
      `• ${scoringCta.intermediate.trim()}`,
      `• ${scoringCta.expert.trim()}`,
      `👉 ${scoringCta.cta_text.trim()}`,
    ].join("\n"),
    `${playlistHeader} ${suggestedPlaylistCategory.trim()}`,
    normalizedTags.join(" "),
  ];

  const fullText = sections.filter(Boolean).join("\n\n").trim();
  const charCount = fullText.length;

  return {
    fullText,
    charCount,
    hashtags: normalizedTags,
  };
}
