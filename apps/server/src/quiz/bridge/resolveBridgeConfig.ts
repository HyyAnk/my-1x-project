import type { BridgeSceneConfig, Channel, QuizV2 } from "@studio/shared";
import { BridgeSceneConfigSchema } from "@studio/shared";
import { extractBridgeShowcaseItems } from "../assets/bridgeTopicEntityExtractor.js";

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
 * Resolves the effective BridgeSceneConfig for an episode, populating showcase items from the quiz
 * when the topic bridge and showcase are enabled.
 */
export function resolveEpisodeBridgeConfig(
  channel?: Channel | null,
  quiz?: QuizV2 | null,
  overrides?: Partial<BridgeSceneConfig> | null,
): BridgeSceneConfig {
  const bridgeConfig = resolveEffectiveBridgeConfig(channel, overrides);
  if (
    quiz &&
    bridgeConfig.enabled !== false &&
    bridgeConfig.enableTopicScene !== false &&
    bridgeConfig.enableShowcase !== false
  ) {
    if (!bridgeConfig.showcaseItems || bridgeConfig.showcaseItems.length !== 4) {
      bridgeConfig.showcaseItems = extractBridgeShowcaseItems(quiz, { bridgeConfig });
    }
  }
  return bridgeConfig;
}

/**
 * Resolves the display name of the channel for speech narration and visual cards.
 * Prioritizes episodeBrandOverride > bridgeConfig.channelDisplayName > channel.display_name > channel.channel_brand_name > channel.slug.
 */
export function resolveBridgeChannelDisplayName(
  channel?: Channel | null,
  bridgeConfig?: BridgeSceneConfig | null,
  episodeBrandOverride?: string | null,
): string {
  if (episodeBrandOverride?.trim()) {
    return episodeBrandOverride.trim();
  }
  if (bridgeConfig?.channelDisplayName?.trim()) {
    return bridgeConfig.channelDisplayName.trim();
  }
  const displayName = channel?.display_name?.trim();
  if (displayName) {
    return displayName;
  }
  const channelBrandName = (channel as { channel_brand_name?: string })?.channel_brand_name?.trim();
  if (channelBrandName) {
    return channelBrandName;
  }
  if (channel?.slug?.trim()) {
    const slug = channel.slug.trim();
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  return "Felix";
}
