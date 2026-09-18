/**
 * Mascot Variant Media Availability & Graceful Fallback Contracts
 *
 * Implements strict availability predicates to guarantee that only variants
 * backed by real media (transparent WebM video or valid 3D character still images)
 * are eligible for rendering. Rejects empty slots, failed statuses, and mock fixture paths.
 */

export interface MascotVariantMediaCandidate {
  id?: string;
  slot_index?: number;
  image_url?: string | null;
  transparent_image_url?: string | null;
  status?: string | null;
  animation?: {
    transparent_video_url?: string | null;
    atlas_url?: string | null;
    manifest_url?: string | null;
    frame_count?: number;
    fps?: number;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface MascotStateResolutionResult<T = MascotVariantMediaCandidate> {
  visible: boolean;
  variant: T | null;
  mediaUrl: string | null;
  mediaType: "video" | "image" | null;
  isAnchorFallback: boolean;
}

const MOCK_FIXTURE_PATTERNS = ["fixture", "placeholder", "synthetic", "mock", "atlas.png", "rainbow"] as const;

const UNAVAILABLE_VARIANT_STATUSES = new Set([
  "empty",
  "failed",
  "qa_failed",
  "generating",
  "generating_image",
  "generating_video",
  "matting",
]);

/**
 * Checks whether a given media URL contains mock fixture identifiers or synthetic placeholder paths.
 */
export function isMockFixtureIdentifier(url?: string | null): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  const normalized = url.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  return MOCK_FIXTURE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Predicate to determine if a mascot variant is backed by real, renderable media.
 * Returns true if:
 * 1. Has non-empty, non-mock transparent WebM video URL in animation, OR
 * 2. Has non-empty, non-mock image_url (or transparent_image_url).
 * Returns false for null/undefined, empty slots, failed statuses, or mock fixture atlas references without real media.
 */
export function isMascotVariantAvailable<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate>(
  variant?: T | null,
): variant is T {
  if (!variant || typeof variant !== "object") {
    return false;
  }

  if (variant.status && UNAVAILABLE_VARIANT_STATUSES.has(variant.status.toLowerCase().trim())) {
    return false;
  }

  const rawVideoUrl = variant.animation?.transparent_video_url;
  const hasValidVideo = typeof rawVideoUrl === "string" && rawVideoUrl.trim().length > 0 && !isMockFixtureIdentifier(rawVideoUrl);

  const rawImageUrl = variant.image_url ?? variant.transparent_image_url;
  const hasValidImage = typeof rawImageUrl === "string" && rawImageUrl.trim().length > 0 && !isMockFixtureIdentifier(rawImageUrl);

  return hasValidVideo || hasValidImage;
}

/**
 * Filters an array of variants, retaining only those backed by real available media.
 */
export function filterAvailableVariants<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate>(variants?: T[] | null): T[] {
  if (!Array.isArray(variants)) {
    return [];
  }
  return variants.filter(isMascotVariantAvailable);
}

/**
 * Resolves a state variant applying the graceful fallback policy:
 * - If available variants exist: selects among available variants.
 * - If 0 available variants exist: attempts style anchor image fallback if present and valid.
 * - If no anchor image is available: returns null (invisible, zero broken canvas).
 */
export function resolveStateVariantWithFallback<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate>(
  variants?: T[] | null,
  anchorImageUrl?: string | null,
  selectVariant?: (available: T[]) => T | null,
): MascotStateResolutionResult<T> | null {
  const available = filterAvailableVariants(variants);

  if (available.length > 0) {
    const selected = selectVariant ? selectVariant(available) : available[0];
    if (selected) {
      const rawVideoUrl = selected.animation?.transparent_video_url;
      const hasValidVideo = typeof rawVideoUrl === "string" && rawVideoUrl.trim().length > 0 && !isMockFixtureIdentifier(rawVideoUrl);

      const rawImageUrl = (selected.image_url ?? selected.transparent_image_url)?.trim();
      const mediaUrl = hasValidVideo ? rawVideoUrl.trim() : rawImageUrl || null;
      const mediaType = hasValidVideo ? "video" : mediaUrl ? "image" : null;

      return {
        visible: true,
        variant: selected,
        mediaUrl,
        mediaType,
        isAnchorFallback: false,
      };
    }
  }

  const trimmedAnchor = anchorImageUrl?.trim();
  if (trimmedAnchor && !isMockFixtureIdentifier(trimmedAnchor)) {
    return {
      visible: true,
      variant: null,
      mediaUrl: trimmedAnchor,
      mediaType: "image",
      isAnchorFallback: true,
    };
  }

  return null;
}
