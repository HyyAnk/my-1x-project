import type { ReelPublishingPayload } from "@studio/shared";

/**
 * Deterministically formats the Short-Reel publishing copy for export and packaging.
 * Produces exactly TITLE and DESCRIPTION sections, preserving hashtags inside the description,
 * with no duplicated hashtags or extra CTA sections.
 */
export function buildPublishingExport(payload: ReelPublishingPayload): string {
  const title = (payload.title ?? "").trim();
  const description = (payload.description ?? "").trim();
  return `TITLE: ${title}\n\nDESCRIPTION:\n${description}\n`;
}
