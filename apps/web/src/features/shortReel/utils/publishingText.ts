import type { ReelPublishingPayload } from "@studio/shared";

/**
 * Formats a Short-Reel publishing payload into canonical two-field clipboard text.
 * Strictly outputs Title and Description; does not append duplicate hashtags or CTA.
 */
export function formatPublishingText(payload: ReelPublishingPayload): string {
  const title = (payload.title ?? "").trim();
  const description = (payload.description ?? "").trim();

  return `TITLE:\n${title}\n\nDESCRIPTION:\n${description}`;
}
