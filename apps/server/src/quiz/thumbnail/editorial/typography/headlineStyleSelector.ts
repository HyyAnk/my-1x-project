import { THUMBNAIL_HEADLINE_STYLES, ThumbnailHeadlineStyleSchema, type ThumbnailHeadlineStyle } from "@studio/shared";
import { containsAnyKeyword } from "../../utils/keywordMatch.js";
import { HEADLINE_STYLE_CATALOG } from "./headlineStyleCatalog.js";

/** How many of the most recent distinct headline styles are avoided. */
const AVOIDED_RECENT_COUNT = 2;

export interface SelectHeadlineStyleInput {
  /** Style suggested by the planner model; used when valid and not recently used. */
  preferred?: string | null;
  /** Episode topic text used to favor fitting styles. */
  topicText: string;
  /** Styles used recently by this episode and its channel, newest first. */
  recent: readonly ThumbnailHeadlineStyle[];
  rng?: () => number;
}

function pick<T>(items: readonly T[], rng: () => number): T | undefined {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/**
 * Chooses the headline lettering style: the planner's suggestion when it is fresh, otherwise a
 * topic-fitting style, otherwise any style, always avoiding the channel's two latest styles.
 */
export function selectHeadlineStyle(input: SelectHeadlineStyleInput): ThumbnailHeadlineStyle {
  const rng = input.rng ?? Math.random;
  const avoided = new Set([...new Set(input.recent)].slice(0, AVOIDED_RECENT_COUNT));
  const fresh = THUMBNAIL_HEADLINE_STYLES.filter((style) => !avoided.has(style));
  const preferred = ThumbnailHeadlineStyleSchema.safeParse(input.preferred).data;
  if (preferred && fresh.includes(preferred)) return preferred;
  const fitting = fresh.filter((style) => containsAnyKeyword(input.topicText, HEADLINE_STYLE_CATALOG[style].topicAffinity));
  return pick(fitting, rng) ?? pick(fresh, rng) ?? THUMBNAIL_HEADLINE_STYLES[0];
}
