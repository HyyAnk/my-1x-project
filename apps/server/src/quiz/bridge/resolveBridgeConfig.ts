import type { BridgeSceneConfig, Channel } from "@studio/shared";
import { BridgeSceneConfigSchema } from "@studio/shared";

/**
 * Resolves the effective BridgeSceneConfig by merging channel defaults with optional overrides.
 */
export function resolveEffectiveBridgeConfig(
  channel?: Channel | null,
  overrides?: Partial<BridgeSceneConfig> | null,
): BridgeSceneConfig {
  const channelConfig = channel?.bridge_scene_config;
  const merged = {
    ...channelConfig,
    ...(overrides ?? {}),
    timing: {
      ...(channelConfig?.timing ?? {}),
      ...(overrides?.timing ?? {}),
    },
  };
  return BridgeSceneConfigSchema.parse(merged);
}

/**
 * Resolves the display name of the channel for speech narration and visual cards.
 * Prioritizes bridgeConfig.channelDisplayName > channel.display_name > channel.slug.
 * Automatically handles the "feli" slug to produce the proper "Felix" brand name.
 */
export function resolveBridgeChannelDisplayName(
  channel?: Channel | null,
  bridgeConfig?: BridgeSceneConfig | null,
): string {
  if (bridgeConfig?.channelDisplayName?.trim()) {
    return bridgeConfig.channelDisplayName.trim();
  }
  const displayName = channel?.display_name?.trim();
  if (displayName && displayName.toLowerCase() !== "feli") {
    return displayName;
  }
  if (channel?.slug?.toLowerCase() === "feli" || displayName?.toLowerCase() === "feli") {
    return "Felix";
  }
  if (displayName) {
    return displayName;
  }
  if (channel?.slug?.trim()) {
    const slug = channel.slug.trim();
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  return "Felix";
}
