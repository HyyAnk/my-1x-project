import { THUMBNAIL_COMPOSITIONS, type ThumbnailComposition } from "@studio/shared";

/** How many of the most recent distinct compositions are avoided (always leaves at least one choice). */
const AVOIDED_RECENT_COUNT = 2;

/**
 * Picks a composition for a new single-subject thumbnail, avoiding the ones used most recently
 * by this episode and its channel so consecutive videos in the grid do not share one layout.
 *
 * @param recent Compositions ordered newest first (this episode's current thumbnail, then the channel's latest episodes).
 */
export function selectThumbnailComposition(recent: readonly ThumbnailComposition[], rng: () => number = Math.random): ThumbnailComposition {
  const distinctRecent = [...new Set(recent)];
  const avoided = new Set(distinctRecent.slice(0, Math.min(AVOIDED_RECENT_COUNT, THUMBNAIL_COMPOSITIONS.length - 1)));
  const candidates = THUMBNAIL_COMPOSITIONS.filter((composition) => !avoided.has(composition));
  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[index] ?? THUMBNAIL_COMPOSITIONS[0];
}
