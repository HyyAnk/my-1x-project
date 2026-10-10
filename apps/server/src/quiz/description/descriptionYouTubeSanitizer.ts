import { VIDEO_DESCRIPTION_MAX_CHARS } from "@studio/shared";

/** YouTube rejects tag lists longer than 500 characters (multi-word tags count their quotes). */
export const YOUTUBE_TAGS_MAX_CHARS = 500;
/** Stored descriptions keep at most 10 hashtags; YouTube ignores every hashtag past 60 and shows only 3 above the title. */
export const YOUTUBE_HASHTAGS_MAX = 10;

const ANGLE_BRACKETS: Record<string, string> = { "<": "‹", ">": "›" };
const HASHTAG_DISALLOWED = /[^\p{L}\p{M}\p{N}_]/gu;
const TAG_DISALLOWED = /[<>,]/g;

/**
 * YouTube's API rejects descriptions containing "<" or ">", so they become look-alike quotes.
 */
export function stripAngleBrackets(text: string): string {
  return text.replace(/[<>]/g, (char) => ANGLE_BRACKETS[char]);
}

/**
 * Keeps only characters YouTube accepts inside a hashtag, so "#Pac-Man" stays one clickable tag.
 */
export function sanitizeHashtagBody(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(HASHTAG_DISALLOWED, "");
}

/**
 * Cuts an over-long description at the last paragraph that still fits YouTube's limit.
 */
export function truncateToYouTubeLimit(text: string, maxChars: number = VIDEO_DESCRIPTION_MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, maxChars);
  const paragraphEnd = head.lastIndexOf("\n\n");
  return (paragraphEnd > 0 ? head.slice(0, paragraphEnd) : head).trimEnd();
}

export function sanitizeYouTubeDescription(text: string): string {
  return truncateToYouTubeLimit(stripAngleBrackets(text).trim());
}

function tagCost(tag: string): number {
  return tag.includes(" ") ? tag.length + 2 : tag.length;
}

/**
 * Cleans, de-duplicates and budgets keyword tags to YouTube's 500-character tag limit.
 */
export function sanitizeYouTubeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  let budget = YOUTUBE_TAGS_MAX_CHARS;
  for (const raw of tags) {
    const tag = raw.replace(TAG_DISALLOWED, " ").replace(/\s+/g, " ").trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    const cost = tagCost(tag) + (result.length > 0 ? 1 : 0);
    if (cost > budget) continue;
    seen.add(key);
    result.push(tag);
    budget -= cost;
  }
  return result;
}
