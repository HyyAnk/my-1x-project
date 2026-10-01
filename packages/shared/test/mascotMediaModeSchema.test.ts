import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  AppConfigSchema,
  ChannelMascotConfigSchema,
  ChannelMascotMediaModeSchema,
  MascotStateMediaModeSchema,
  VideoSettingsInputSchema,
  resolveEffectiveMascotMediaMode,
  type AppConfig,
  type ChannelMascotConfig,
  type ChannelMascotMediaMode,
  type MascotStateMediaMode,
  type VideoSettingsInput,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Mascot State Media Mode Schema & Contracts (Phase 1)", () => {
  describe("MascotStateMediaModeSchema", () => {
    it("accepts valid media modes: static and animation", () => {
      const staticMode: MascotStateMediaMode = MascotStateMediaModeSchema.parse("static");
      const animationMode: MascotStateMediaMode = MascotStateMediaModeSchema.parse("animation");

      assert.equal(staticMode, "static");
      assert.equal(animationMode, "animation");
    });

    it("rejects invalid media mode values", () => {
      const invalidValues = ["inherit", "video", "spritesheet", "none", "", 123, null];

      for (const value of invalidValues) {
        assert.throws(
          () => MascotStateMediaModeSchema.parse(value),
          { name: "ZodError" },
          `Expected ZodError for invalid value: ${String(value)}`,
        );
      }
    });
  });

  describe("ChannelMascotMediaModeSchema", () => {
    it("accepts static, animation, and inherit", () => {
      const staticMode: ChannelMascotMediaMode = ChannelMascotMediaModeSchema.parse("static");
      const animationMode: ChannelMascotMediaMode = ChannelMascotMediaModeSchema.parse("animation");
      const inheritMode: ChannelMascotMediaMode = ChannelMascotMediaModeSchema.parse("inherit");

      assert.equal(staticMode, "static");
      assert.equal(animationMode, "animation");
      assert.equal(inheritMode, "inherit");
    });

    it("rejects invalid channel media mode values", () => {
      const invalidValues = ["default", "auto", "video", "", null];

      for (const value of invalidValues) {
        assert.throws(
          () => ChannelMascotMediaModeSchema.parse(value),
          { name: "ZodError" },
          `Expected ZodError for invalid channel mode: ${String(value)}`,
        );
      }
    });
  });

  describe("AppConfigSchema.video_generation.mascot_media_mode", () => {
    const createBaseConfig = () => ({
      active_engine: "codex" as const,
      video_generation: {
        provider: "hyperframes",
        model: "",
        hyperframes_command: "npx hyperframes",
        render_quality: "draft" as const,
        fps: 30,
        max_scene_duration_seconds: 8,
        default_scene_duration_seconds: 6,
        narration_words_per_second: 2.3,
        aspect_ratio: "16:9" as const,
        max_concurrent_tasks: 1,
        fast_render_mode: false,
      },
      image_generation: {
        enabled: true,
        images_per_bundle: 1,
        provider: "gpti2" as const,
        base_url: "",
        model: "gpt-image-2",
        api_key: "",
        quality: "low",
        max_concurrent_tasks: 3,
      },
      codex: {
        max_concurrent_tasks: 3,
        transport: "app_server" as const,
        app_server_endpoint: "stdio://",
        command: "codex",
        model: "",
        experimental_api: false,
        api_base_url: "",
        api_key: "",
      },
      antigravity: {
        max_concurrent_tasks: 3,
        command: "agy",
        model: "gemini-2.5-pro",
        api_base_url: "",
        api_key: "",
      },
      audio_generation: {
        provider: "chatterbox",
        service_url: "http://127.0.0.1:8890",
        exaggeration: 0.5,
        cfg_weight: 0.5,
        max_concurrent_tasks: 2,
        merge_gap_ms: 300,
        match_target_duration: true,
      },
    });

    it("defaults mascot_media_mode to 'static' when omitted from video_generation", () => {
      const base = createBaseConfig();
      const parsed: AppConfig = AppConfigSchema.parse(base);

      assert.equal(parsed.video_generation.mascot_media_mode, "static");
    });

    it("defaults mascot_media_mode to 'static' when video_generation schema parsed standalone", () => {
      const parsed = AppConfigSchema.shape.video_generation.parse({});

      assert.equal(parsed.mascot_media_mode, "static");
    });

    it("accepts explicit 'static' mascot_media_mode", () => {
      const base = createBaseConfig();
      base.video_generation.mascot_media_mode = "static" as const;
      const parsed: AppConfig = AppConfigSchema.parse(base);

      assert.equal(parsed.video_generation.mascot_media_mode, "static");
    });

    it("accepts explicit 'animation' mascot_media_mode", () => {
      const base = createBaseConfig();
      const withAnimation = {
        ...base,
        video_generation: {
          ...base.video_generation,
          mascot_media_mode: "animation" as const,
        },
      };
      const parsed: AppConfig = AppConfigSchema.parse(withAnimation);

      assert.equal(parsed.video_generation.mascot_media_mode, "animation");
    });

    it("rejects invalid mascot_media_mode in AppConfigSchema", () => {
      const base = createBaseConfig();
      assert.throws(
        () =>
          AppConfigSchema.parse({
            ...base,
            video_generation: {
              ...base.video_generation,
              mascot_media_mode: "inherit",
            },
          }),
        { name: "ZodError" },
      );
    });
  });

  describe("ChannelMascotConfigSchema.mascot_media_mode", () => {
    it("defaults mascot_media_mode to undefined when omitted", () => {
      const parsed: ChannelMascotConfig = ChannelMascotConfigSchema.parse({});

      assert.equal(parsed.mascot_media_mode, undefined);
    });

    it("accepts explicit 'static' channel media mode override", () => {
      const parsed: ChannelMascotConfig = ChannelMascotConfigSchema.parse({
        mascot_media_mode: "static",
      });

      assert.equal(parsed.mascot_media_mode, "static");
    });

    it("accepts explicit 'animation' channel media mode override", () => {
      const parsed: ChannelMascotConfig = ChannelMascotConfigSchema.parse({
        mascot_media_mode: "animation",
      });

      assert.equal(parsed.mascot_media_mode, "animation");
    });

    it("accepts explicit 'inherit' channel media mode", () => {
      const parsed: ChannelMascotConfig = ChannelMascotConfigSchema.parse({
        mascot_media_mode: "inherit",
      });

      assert.equal(parsed.mascot_media_mode, "inherit");
    });

    it("rejects invalid channel mascot_media_mode", () => {
      assert.throws(
        () =>
          ChannelMascotConfigSchema.parse({
            mascot_media_mode: "invalid_mode",
          }),
        { name: "ZodError" },
      );
    });
  });

  describe("VideoSettingsInputSchema.mascot_media_mode", () => {
    it("allows omitting mascot_media_mode as optional", () => {
      const parsed: VideoSettingsInput = VideoSettingsInputSchema.parse({
        fps: 30,
      });

      assert.equal(parsed.mascot_media_mode, undefined);
    });

    it("accepts explicit 'static' in video settings input", () => {
      const parsed: VideoSettingsInput = VideoSettingsInputSchema.parse({
        mascot_media_mode: "static",
      });

      assert.equal(parsed.mascot_media_mode, "static");
    });

    it("accepts explicit 'animation' in video settings input", () => {
      const parsed: VideoSettingsInput = VideoSettingsInputSchema.parse({
        mascot_media_mode: "animation",
      });

      assert.equal(parsed.mascot_media_mode, "animation");
    });

    it("rejects non-MascotStateMediaMode values in video settings input", () => {
      assert.throws(
        () =>
          VideoSettingsInputSchema.parse({
            mascot_media_mode: "inherit",
          }),
        { name: "ZodError" },
      );
    });
  });

  describe("resolveEffectiveMascotMediaMode", () => {
    it("returns channel static mode when channel config specifies 'static', overriding global 'animation'", () => {
      const mode = resolveEffectiveMascotMediaMode({ mascot_media_mode: "static" }, "animation");
      assert.equal(mode, "static");
    });

    it("returns channel animation mode when channel config specifies 'animation', overriding global 'static'", () => {
      const mode = resolveEffectiveMascotMediaMode({ mascot_media_mode: "animation" }, "static");
      assert.equal(mode, "animation");
    });

    it("returns global mode when channel config specifies 'inherit'", () => {
      const modeAnim = resolveEffectiveMascotMediaMode({ mascot_media_mode: "inherit" }, "animation");
      assert.equal(modeAnim, "animation");

      const modeStatic = resolveEffectiveMascotMediaMode({ mascot_media_mode: "inherit" }, "static");
      assert.equal(modeStatic, "static");

      const modeDefault = resolveEffectiveMascotMediaMode({ mascot_media_mode: "inherit" }, undefined);
      assert.equal(modeDefault, "static");
    });

    it("returns global mode when channel mascot_media_mode is undefined", () => {
      const modeAnim = resolveEffectiveMascotMediaMode({ enabled: true }, "animation");
      assert.equal(modeAnim, "animation");

      const modeStatic = resolveEffectiveMascotMediaMode({ enabled: true }, "static");
      assert.equal(modeStatic, "static");

      const modeDefault = resolveEffectiveMascotMediaMode({ enabled: true }, undefined);
      assert.equal(modeDefault, "static");
    });

    it("returns global mode or defaults to 'static' when channel config is null or undefined", () => {
      assert.equal(resolveEffectiveMascotMediaMode(null, "animation"), "animation");
      assert.equal(resolveEffectiveMascotMediaMode(null, "static"), "static");
      assert.equal(resolveEffectiveMascotMediaMode(null, undefined), "static");

      assert.equal(resolveEffectiveMascotMediaMode(undefined, "animation"), "animation");
      assert.equal(resolveEffectiveMascotMediaMode(undefined, "static"), "static");
      assert.equal(resolveEffectiveMascotMediaMode(undefined, undefined), "static");
    });
  });
});

