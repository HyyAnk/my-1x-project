import type { VideoDescription } from "@studio/shared";

const PARAGRAPH_SEPARATOR = /\n\s*\n/;

function buildDefaultScoringBlock(description: VideoDescription): string {
  const { beginner, intermediate, expert, cta_text: ctaText } = description.scoring_cta;
  return `🏆 SCORING TIERS:\n• ${beginner}\n• ${intermediate}\n• ${expert}\n👉 ${ctaText}`;
}

/**
 * Returns the scoring block exactly as it appears in the published description
 * (localized header included), falling back to an English layout for legacy text.
 */
export function extractScoringBlock(description: VideoDescription): string {
  const beginnerLine = `• ${description.scoring_cta.beginner.trim()}`;
  const paragraph = description.full_description_text
    .split(PARAGRAPH_SEPARATOR)
    .map((block) => block.trim())
    .find((block) => block.split("\n").some((line) => line.trim() === beginnerLine));
  return paragraph ?? buildDefaultScoringBlock(description);
}
