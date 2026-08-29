/**
 * Shared branding contracts, constants, and helpers for Channel Brand Mark.
 */

export const CHANNEL_BRAND_NAME_MAX_LENGTH = 32;
export const CHANNEL_BRAND_NAME_FALLBACK = "Channel";

/**
 * Resolves the final display brand name for Channel Brand Mark.
 *
 * Resolution order:
 * 1. Episode-level brand override (if non-empty after trimming)
 * 2. Channel display name (if non-empty after trimming)
 * 3. Fallback default constant ("Channel")
 *
 * Note: Does not silently truncate values; length constraints must be validated
 * via schema validation before resolution.
 */
export function resolveChannelBrandName(episodeBrandOverride?: string | null, channelDisplayName?: string | null): string {
  const override = typeof episodeBrandOverride === "string" ? episodeBrandOverride.trim() : "";
  if (override.length > 0) return override;

  const channelName = typeof channelDisplayName === "string" ? channelDisplayName.trim() : "";
  if (channelName.length > 0) return channelName;

  return CHANNEL_BRAND_NAME_FALLBACK;
}
