import { describe, expect, it } from "vitest";
import type { Channel } from "@studio/shared";
import {
  resolveBridgeChannelDisplayName,
  resolveEffectiveBridgeConfig,
} from "../src/quiz/bridge/resolveBridgeConfig.js";

describe("Stage 8: Channel Configuration & Dynamic Customization Layer", () => {
  describe("resolveEffectiveBridgeConfig", () => {
    it("returns default configuration with default pauses and stinger transition when channel has no config", () => {
      const config = resolveEffectiveBridgeConfig(null);

      expect(config.enabled).toBe(true);
      expect(config.enableTopicScene).toBe(true);
      expect(config.enableCtaScene).toBe(true);
      expect(config.timing.topicPauseSeconds).toBe(0.5);
      expect(config.timing.ctaPauseSeconds).toBe(2.0);
      expect(config.timing.transitionType).toBe("brand_logo_stinger");
    });

    it("respects channel-level bridge_scene_config", () => {
      const mockChannel = {
        bridge_scene_config: {
          enabled: true,
          enableTopicScene: true,
          enableCtaScene: false,
          timing: {
            topicPauseSeconds: 3.5,
            ctaPauseSeconds: 1.0,
            transitionType: "crossfade",
          },
          customCtaText: "Subscribe now!",
        },
      } as unknown as Channel;

      const config = resolveEffectiveBridgeConfig(mockChannel);

      expect(config.enabled).toBe(true);
      expect(config.enableTopicScene).toBe(true);
      expect(config.enableCtaScene).toBe(false);
      expect(config.timing.topicPauseSeconds).toBe(3.5);
      expect(config.timing.ctaPauseSeconds).toBe(1.0);
      expect(config.timing.transitionType).toBe("crossfade");
      expect(config.customCtaText).toBe("Subscribe now!");
    });

    it("applies episode-level overrides on top of channel defaults", () => {
      const mockChannel = {
        bridge_scene_config: {
          enabled: true,
          enableTopicScene: true,
          enableCtaScene: true,
          timing: {
            topicPauseSeconds: 2.0,
            ctaPauseSeconds: 2.0,
          },
        },
      } as unknown as Channel;

      const config = resolveEffectiveBridgeConfig(mockChannel, {
        enabled: false,
      });

      expect(config.enabled).toBe(false);
    });
  });

  describe("resolveBridgeChannelDisplayName", () => {
    it("prioritizes bridgeConfig.channelDisplayName when explicitly set", () => {
      const name = resolveBridgeChannelDisplayName(
        { slug: "feli", display_name: "Feli" } as Channel,
        { enabled: true, enableTopicScene: true, enableCtaScene: true, timing: { topicPauseSeconds: 2, ctaPauseSeconds: 2, transitionType: "cut" }, channelDisplayName: "Felix The Cat" },
      );

      expect(name).toBe("Felix The Cat");
    });

    it("maps feli slug or Feli display_name to Felix", () => {
      expect(resolveBridgeChannelDisplayName({ slug: "feli", display_name: "Feli" } as Channel)).toBe("Felix");
      expect(resolveBridgeChannelDisplayName({ slug: "feli" } as Channel)).toBe("Felix");
    });

    it("preserves standard display names for other channels", () => {
      expect(
        resolveBridgeChannelDisplayName({
          slug: "quiz-masters",
          display_name: "Quiz Masters World",
        } as Channel),
      ).toBe("Quiz Masters World");
    });

    it("capitalizes slug when display_name is missing", () => {
      expect(resolveBridgeChannelDisplayName({ slug: "historyquiz" } as Channel)).toBe("Historyquiz");
    });

    it("falls back gracefully when channel is missing or null", () => {
      expect(resolveBridgeChannelDisplayName(null)).toBe("Felix");
    });
  });
});
