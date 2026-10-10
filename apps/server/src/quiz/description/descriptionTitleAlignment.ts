import type { VideoTitle } from "@studio/shared";

export type DescriptionTitleContext = Pick<VideoTitle, "title" | "primary_keyword" | "source">;

const DEFAULT_PRIMARY_KEYWORD_RULE = `1. TOPIC & PRIMARY KEYWORD: Identify the main niche topic and 1 high-intent search phrase (e.g. "world geography quiz", "science trivia challenge").`;

/**
 * Template titles derive their keyword mechanically, so only LLM-chosen or
 * user-written keywords are strong enough to lock the description to.
 */
export function resolveLockedPrimaryKeyword(videoTitle?: DescriptionTitleContext | null): string | null {
  if (!videoTitle || videoTitle.source === "fallback") return null;
  return videoTitle.primary_keyword.trim() || null;
}

export function buildTitleContextLines(videoTitle?: DescriptionTitleContext | null): string[] {
  if (!videoTitle) return [];
  return [`- YouTube Video Title (shown directly above the description): "${videoTitle.title}"`];
}

export function describePrimaryKeywordRule(videoTitle?: DescriptionTitleContext | null): string {
  const lockedKeyword = resolveLockedPrimaryKeyword(videoTitle);
  if (!lockedKeyword) return DEFAULT_PRIMARY_KEYWORD_RULE;
  return `1. TOPIC & PRIMARY KEYWORD: The primary keyword is locked to "${lockedKeyword}" because the video title targets it. Return it verbatim as primary_keyword so the title and description rank for the same search phrase.`;
}

export function describeHookTitleRule(videoTitle?: DescriptionTitleContext | null): string {
  return videoTitle ? ` Line 1 must not simply repeat the video title; viewers already see it.` : "";
}
