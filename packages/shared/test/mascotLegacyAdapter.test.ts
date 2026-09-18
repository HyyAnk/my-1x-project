import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  MascotProfileSchema,
  adaptMascotV1ToV2,
  adaptMascotConfigV1ToV2,
  adaptMascotAssetsV1ToV2,
  synthesizeLegacyCoreStyle,
  type MascotProfile,
  type MascotRenderBundleV2,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Mascot Legacy Adapter & Schema Deprecations (Stage 5)", () => {
  describe("MascotProfileSchema actions default", () => {
    it("parses valid mascot profile without actions field and defaults to empty object", () => {
      const parsed = MascotProfileSchema.parse({
        id: "mascot_v2_clean",
        name: "Clean V2 Mascot",
        master_prompt: "A friendly robotic mascot",
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      });

      assert.equal(parsed.id, "mascot_v2_clean");
      assert.deepEqual(parsed.actions, {});
    });

    it("parses mascot profile with explicit deprecated actions", () => {
      const parsed = MascotProfileSchema.parse({
        id: "mascot_v1_legacy",
        name: "Legacy V1 Mascot",
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "https://example.com/thinking.png",
            frames_count: 1,
            fps: 8,
            loop: true,
          },
        },
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      });

      assert.equal(parsed.actions.thinking?.sprite_url, "https://example.com/thinking.png");
    });
  });

  describe("synthesizeLegacyCoreStyle with V2 render_bundle", () => {
    it("synthesizes core style from render_bundle.assets.actions when actions is empty", () => {
      const profile: Partial<MascotProfile> = {
        id: "v2_bundle_mascot",
        name: "Bundle Mascot",
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
        render_bundle: {
          config: adaptMascotConfigV1ToV2(),
          assets: {
            actions: {
              thinking: {
                version: 2,
                action: "thinking",
                image_url: "https://example.com/bundle-thinking.png",
                registration: {
                  source_width: 512,
                  source_height: 512,
                  content_bounds: { x: 10, y: 10, width: 492, height: 492 },
                  pivot: { x: 256, y: 512 },
                  offset_x: 5,
                  offset_y: -5,
                },
                motion: {
                  preset: "pulse",
                  speed: 1.5,
                  intensity: "dynamic",
                },
              },
              celebrate: {
                version: 2,
                action: "celebrate",
                image_url: "https://example.com/bundle-celebrate.png",
                registration: {
                  source_width: 512,
                  source_height: 512,
                  content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                  pivot: { x: 256, y: 512 },
                  offset_x: 0,
                  offset_y: 0,
                },
                motion: {
                  preset: "jump",
                  speed: 2.0,
                  intensity: "normal",
                },
              },
            },
            master: {
              version: 2,
              image_url: "https://example.com/bundle-master.png",
              registration: {
                source_width: 512,
                source_height: 512,
                content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                pivot: { x: 256, y: 512 },
                offset_x: 0,
                offset_y: 0,
              },
            },
          },
        },
      };

      const style = synthesizeLegacyCoreStyle(profile);
      assert.equal(style.id, "core");
      assert.equal(style.anchor_image_url, "https://example.com/bundle-master.png");

      const thinking = style.states.thinking[0];
      assert.ok(thinking);
      assert.equal(thinking.image_url, "https://example.com/bundle-thinking.png");
      assert.equal(thinking.motion_preset, "pulse");
      assert.equal(thinking.motion_speed, 1.5);
      assert.equal(thinking.motion_intensity, "dynamic");
      assert.deepEqual(thinking.pivot, { x: 256, y: 512 });

      const celebrate = style.states.celebrate[0];
      assert.ok(celebrate);
      assert.equal(celebrate.image_url, "https://example.com/bundle-celebrate.png");
      assert.equal(celebrate.motion_preset, "jump");
      assert.equal(celebrate.motion_speed, 2.0);
    });

    it("prioritizes render_bundle.assets.actions over legacy profile.actions", () => {
      const profile: Partial<MascotProfile> = {
        id: "hybrid_mascot",
        name: "Hybrid Mascot",
        master_image_url: "https://example.com/legacy-master.png",
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "https://example.com/legacy-thinking.png",
            motion_preset: "sway",
            motion_speed: 1.0,
          },
        },
        render_bundle: {
          config: adaptMascotConfigV1ToV2(),
          assets: {
            actions: {
              thinking: {
                version: 2,
                action: "thinking",
                image_url: "https://example.com/v2-thinking.png",
                registration: {
                  source_width: 512,
                  source_height: 512,
                  content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                  pivot: { x: 256, y: 512 },
                  offset_x: 0,
                  offset_y: 0,
                },
                motion: {
                  preset: "breathe",
                  speed: 1.8,
                  intensity: "subtle",
                },
              },
            },
            master: null,
          },
        },
      };

      const style = synthesizeLegacyCoreStyle(profile);
      const thinking = style.states.thinking[0];
      assert.ok(thinking);
      assert.equal(thinking.image_url, "https://example.com/v2-thinking.png");
      assert.equal(thinking.motion_preset, "breathe");
      assert.equal(thinking.motion_speed, 1.8);
      assert.equal(thinking.motion_intensity, "subtle");
    });
  });

  describe("adaptMascotV1ToV2 zero-overhead pass-through", () => {
    const existingBundle: MascotRenderBundleV2 = {
      config: adaptMascotConfigV1ToV2(),
      assets: {
        actions: {
          thinking: {
            version: 2,
            action: "thinking",
            image_url: "https://example.com/v2.png",
            registration: {
              source_width: 512,
              source_height: 512,
              content_bounds: { x: 0, y: 0, width: 512, height: 512 },
              pivot: { x: 256, y: 512 },
              offset_x: 0,
              offset_y: 0,
            },
            motion: {
              preset: "sway",
              speed: 1.0,
              intensity: "normal",
            },
          },
        },
        master: null,
      },
    };

    it("returns identical render_bundle reference when config is omitted", () => {
      const mascot: MascotProfile = {
        id: "v2_mascot",
        name: "V2 Mascot",
        description: "",
        visual_style: "pixar_3d",
        master_prompt: "",
        master_image_url: null,
        color_theme: "#06b6d4",
        actions: {},
        styles: [],
        render_bundle: existingBundle,
        assigned_channel_ids: [],
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      };

      const result = adaptMascotV1ToV2(mascot);
      assert.strictEqual(result, existingBundle);
    });

    it("applies config override without mutating or re-adapting assets when config is supplied", () => {
      const mascot: MascotProfile = {
        id: "v2_mascot_config",
        name: "V2 Mascot Config",
        description: "",
        visual_style: "pixar_3d",
        master_prompt: "",
        master_image_url: null,
        color_theme: "#06b6d4",
        actions: {},
        styles: [],
        render_bundle: existingBundle,
        assigned_channel_ids: [],
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      };

      const result = adaptMascotV1ToV2(mascot, { enabled: false });
      assert.ok(result);
      assert.equal(result.config.visibility.enabled, false);
      assert.strictEqual(result.assets, existingBundle.assets);
    });

    it("returns null for null or undefined mascot", () => {
      assert.strictEqual(adaptMascotV1ToV2(null), null);
      assert.strictEqual(adaptMascotV1ToV2(undefined), null);
    });

    it("falls back to adapting legacy actions when render_bundle is not present", () => {
      const legacyMascot: MascotProfile = {
        id: "v1_legacy_mascot",
        name: "V1 Legacy Mascot",
        description: "",
        visual_style: "pixar_3d",
        master_prompt: "",
        master_image_url: "https://example.com/master.png",
        color_theme: "#06b6d4",
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "https://example.com/legacy-thinking.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 10,
            offset_y: -20,
          },
        },
        styles: [],
        assigned_channel_ids: [],
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      };

      const result = adaptMascotV1ToV2(legacyMascot);
      assert.ok(result);
      assert.equal(result.assets.actions.thinking?.image_url, "https://example.com/legacy-thinking.png");
      assert.equal(result.assets.actions.thinking?.registration.offset_x, 10);
      assert.equal(result.assets.actions.thinking?.registration.offset_y, -20);
      assert.equal(result.assets.master?.image_url, "https://example.com/master.png");
    });
  });

  describe("adaptMascotAssetsV1ToV2 helper", () => {
    it("adapts actions and master image safely", () => {
      const legacyMascot: MascotProfile = {
        id: "v1_assets_mascot",
        name: "V1 Assets Mascot",
        description: "",
        visual_style: "pixar_3d",
        master_prompt: "",
        master_image_url: "https://example.com/master.png",
        color_theme: "#06b6d4",
        actions: {
          celebrate: {
            action: "celebrate",
            sprite_url: "https://example.com/celebrate.png",
            frames_count: 4,
            fps: 12,
            loop: false,
            frame_width: 256,
            frame_height: 256,
            offset_x: 0,
            offset_y: 0,
          },
        },
        styles: [],
        assigned_channel_ids: [],
        created_at: "2026-09-16T00:00:00.000Z",
        updated_at: "2026-09-16T00:00:00.000Z",
      };

      const catalog = adaptMascotAssetsV1ToV2(legacyMascot);
      assert.ok(catalog.actions.celebrate);
      assert.equal(catalog.actions.celebrate?.image_url, "https://example.com/celebrate.png");
      assert.ok(catalog.actions.celebrate?.legacy_animation);
      assert.equal(catalog.actions.celebrate?.legacy_animation?.frames_count, 4);
      assert.equal(catalog.master?.image_url, "https://example.com/master.png");
    });
  });
});
