import { describe, expect, it } from "vitest";
import type { ChannelMascotConfig, MascotProfile } from "@studio/shared";
import { source } from "../src/quiz/render/candyArcade/candyArcadeAudio.js";
import {
  getMascotPreloadTags,
  getMascotPreloadUrls,
  renderMascotHtmlLayer,
  resolveMascotLayout,
  resolveMascotPose,
  shouldRenderMascot,
} from "../src/quiz/render/mascotStateResolver.js";

describe("MascotStateResolver", () => {
  const baseMascot: MascotProfile = {
    id: "mascot_123",
    name: "Milo the Fox",
    description: "Cute fox",
    visual_style: "pixar_3d",
    master_prompt: "Cute fox",
    master_image_url: "/api/mascots/mascot_123/assets/master.png",
    color_theme: "#06b6d4",
    actions: {},
    assigned_channel_ids: [],
    created_at: "2026-08-29T00:00:00.000Z",
    updated_at: "2026-08-29T00:00:00.000Z",
  };

  describe("shouldRenderMascot", () => {
    it("returns false if mascot is null or undefined", () => {
      expect(shouldRenderMascot(null, null, "question")).toBe(false);
      expect(shouldRenderMascot(undefined, null, "intro")).toBe(false);
    });

    it("returns false if config is disabled", () => {
      const config: ChannelMascotConfig = {
        enabled: false,
        position: "bottom_left",
        scale: 1,
        offset_x: 0,
        offset_y: 0,
        show_in_intro: true,
        show_in_outro: true,
        show_in_question: true,
      };
      expect(shouldRenderMascot(baseMascot, config, "question")).toBe(false);
    });

    it("checks phase flags accurately", () => {
      const config: ChannelMascotConfig = {
        enabled: true,
        position: "bottom_left",
        scale: 1,
        offset_x: 0,
        offset_y: 0,
        show_in_intro: false,
        show_in_outro: true,
        show_in_question: true,
      };
      expect(shouldRenderMascot(baseMascot, config, "intro")).toBe(false);
      expect(shouldRenderMascot(baseMascot, config, "outro")).toBe(true);
      expect(shouldRenderMascot(baseMascot, config, "question")).toBe(true);
    });
  });

  describe("resolveMascotPose", () => {
    it("returns exact action when available", () => {
      const mascot: MascotProfile = {
        ...baseMascot,
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "/assets/think.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 10,
            offset_y: -5,
            motion_preset: "sway",
            motion_speed: 1.2,
            motion_intensity: "dynamic",
          },
        },
      };

      const pose = resolveMascotPose(mascot, "thinking");
      expect(pose.action).toBe("thinking");
      expect(pose.url).toBe("/assets/think.png");
      expect(pose.frames).toBe(1);
      expect(pose.fps).toBe(8);
      expect(pose.offX).toBe(10);
      expect(pose.offY).toBe(-5);
      expect(pose.motionPreset).toBe("sway");
      expect(pose.motionSpeed).toBe(1.2);
      expect(pose.motionIntensity).toBe("dynamic");
    });

    it("falls back through hierarchy when requested action is missing", () => {
      const mascot: MascotProfile = {
        ...baseMascot,
        actions: {
          wave: {
            action: "wave",
            sprite_url: "/assets/wave.png",
            frames_count: 4,
            fps: 12,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
            motion_preset: "wave",
          },
        },
      };

      // celebrate -> wave -> idle -> master
      const celebratePose = resolveMascotPose(mascot, "celebrate");
      expect(celebratePose.action).toBe("wave");
      expect(celebratePose.url).toBe("/assets/wave.png");
      expect(celebratePose.frames).toBe(4);
      expect(celebratePose.fps).toBe(12);
    });

    it("falls back to master concept image when no matching actions exist", () => {
      const pose = resolveMascotPose(baseMascot, "celebrate");
      expect(pose.action).toBe("master");
      expect(pose.url).toBe(baseMascot.master_image_url);
      expect(pose.frames).toBe(1);
      expect(pose.motionPreset).toBe("jump");
    });
  });

  describe("resolveMascotLayout", () => {
    it("provides defaults when config is null", () => {
      const layout = resolveMascotLayout(null);
      expect(layout.position).toBe("bottom_left");
      expect(layout.scale).toBe(1.0);
      expect(layout.configOffsetX).toBe(0);
      expect(layout.configOffsetY).toBe(0);
    });

    it("correctly extracts config values", () => {
      const config: ChannelMascotConfig = {
        enabled: true,
        position: "bottom_right",
        scale: 1.25,
        offset_x: 20,
        offset_y: -15,
        show_in_intro: true,
        show_in_outro: true,
        show_in_question: true,
      };
      const layout = resolveMascotLayout(config);
      expect(layout.position).toBe("bottom_right");
      expect(layout.scale).toBe(1.25);
      expect(layout.configOffsetX).toBe(20);
      expect(layout.configOffsetY).toBe(-15);
    });
  });

  describe("getMascotPreloadUrls & getMascotPreloadTags", () => {
    it("extracts unique URLs for preloading", () => {
      const mascot: MascotProfile = {
        ...baseMascot,
        actions: {
          wave: {
            action: "wave",
            sprite_url: "/assets/wave.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
          },
          thinking: {
            action: "thinking",
            sprite_url: "/assets/think.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
          },
        },
      };

      const urls = getMascotPreloadUrls(mascot);
      expect(urls).toContain("/api/mascots/mascot_123/assets/master.png");
      expect(urls).toContain("/assets/wave.png");
      expect(urls).toContain("/assets/think.png");

      const tags = getMascotPreloadTags(mascot, (u) => `cdn://${u}`);
      expect(tags).toContain('<link rel="preload" href="cdn:///api/mascots/mascot_123/assets/master.png" as="image">');
      expect(tags).toContain('<link rel="preload" href="cdn:///assets/wave.png" as="image">');
    });

    it("returns empty string for null mascot", () => {
      expect(getMascotPreloadTags(null)).toBe("");
    });

    it("preloads animation atlases as image and WebM videos as video", () => {
      const animMascot: MascotProfile = {
        ...baseMascot,
        styles: [
          {
            id: "cyber",
            name: "Cyber",
            keyword: "cyberpunk",
            anchor_image_url: "/api/mascots/mascot_123/assets/anchor.png",
            is_default: true,
            states: {
              thinking: [
                {
                  id: "t1",
                  slot_index: 1,
                  image_url: "/api/mascots/mascot_123/assets/think.png",
                  animation: {
                    version: 1,
                    state: "thinking",
                    slot_index: 1,
                    frame_count: 10,
                    fps: 10,
                    loop: true,
                    transparent_video_url: "/api/mascots/mascot_123/styles/cyber/animations/thinking/1/artifacts/video_transparent.webm",
                    atlas_url: "/api/mascots/mascot_123/styles/cyber/animations/thinking/1/artifacts/atlas.png",
                    manifest_url: "/api/mascots/mascot_123/styles/cyber/animations/thinking/1/artifacts/manifest.json",
                    registration: {
                      source_width: 512,
                      source_height: 512,
                      content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                      pivot: { x: 256, y: 512 },
                      offset_x: 0,
                      offset_y: 0,
                    },
                    content_fingerprint: "c1",
                    source_fingerprint: "s1",
                  },
                },
              ],
              celebrate: [],
            },
            created_at: "2026-08-29T00:00:00.000Z",
            updated_at: "2026-08-29T00:00:00.000Z",
          },
        ],
      };

      const urls = getMascotPreloadUrls(animMascot);
      expect(urls).toContain("/api/mascots/mascot_123/styles/cyber/animations/thinking/1/artifacts/video_transparent.webm");
      expect(urls).toContain("/api/mascots/mascot_123/styles/cyber/animations/thinking/1/artifacts/atlas.png");

      // When mapped with source():
      const tags = getMascotPreloadTags(animMascot, source);
      expect(tags).toContain(
        '<link rel="preload" href="./mascot-assets/mascot_123_cyber_thinking_s1_video_transparent.webm" as="video" type="video/webm">',
      );
      expect(tags).toContain('<link rel="preload" href="./mascot-assets/mascot_123_cyber_thinking_s1_atlas.png" as="image">');
      expect(tags).not.toMatch(/<link rel="preload"[^>]*\/api\/mascots\//);
    });

    it("filters out unmapped or broken /api/ URLs to prevent offline render check errors", () => {
      const mascotWithBrokenRoutes: MascotProfile = {
        ...baseMascot,
        master_image_url: "/api/broken/unmapped/master.png",
        actions: {
          wave: {
            action: "wave",
            sprite_url: "/api/broken/wave.png",
          },
        },
      };

      // Without source mapper, raw /api/ routes are filtered out
      const tags = getMascotPreloadTags(mascotWithBrokenRoutes);
      expect(tags).toBe("");
    });
  });

  describe("renderMascotHtmlLayer", () => {
    it("renders intro phase correctly", () => {
      const config: ChannelMascotConfig = {
        enabled: true,
        position: "bottom_left",
        scale: 1,
        offset_x: 0,
        offset_y: 0,
        show_in_intro: true,
        show_in_outro: false,
        show_in_question: false,
      };
      const html = renderMascotHtmlLayer(baseMascot, config, "intro");
      expect(html).toContain("mascot-intro");
      expect(html).toContain("anchor-bottom_left");
    });

    it("renders question phase with think and celebrate layers", () => {
      const config: ChannelMascotConfig = {
        enabled: true,
        position: "bottom_left",
        scale: 1,
        offset_x: 0,
        offset_y: 0,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
      };
      const html = renderMascotHtmlLayer(baseMascot, config, "question");
      expect(html).toContain("mascot-stage");
      expect(html).toContain("state-thinking");
      expect(html).toContain("state-celebrate");
    });

    it("renders overrideAction when specified", () => {
      const html = renderMascotHtmlLayer(baseMascot, null, "question", { overrideAction: "point" });
      expect(html).toContain("state-point");
    });
  });
});
