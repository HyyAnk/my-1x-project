import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  AppConfigSchema,
  ImageFallbackConfigSchema,
  IMGSTUDIO_DEFAULT_MODEL_ID,
  IMGSTUDIO_MODELS,
  resolveImgStudioModelName,
  isSupportedImgStudioResolution,
  type ImageFallbackConfig,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("ImgStudio Fallback Configuration & Catalog Tests", () => {
  describe("Model Catalog & Constants", () => {
    it("exports the default model ID matching Qwen Image 3.0 Pro", () => {
      assert.equal(IMGSTUDIO_DEFAULT_MODEL_ID, "2d059365-a09a-4fd5-aa9e-b5335d09bbe9");
      const defaultModel = IMGSTUDIO_MODELS.find((m) => m.id === IMGSTUDIO_DEFAULT_MODEL_ID);
      assert.ok(defaultModel, "Default model must exist in the catalog");
      assert.equal(defaultModel.name, "Qwen Image 3.0 Pro");
      assert.equal(defaultModel.max_resolution, "2K");
    });

    it("defines exactly 10 supported models with expected IDs and resolutions", () => {
      assert.equal(IMGSTUDIO_MODELS.length, 10);

      const expectedCatalog: Record<string, { name: string; max_resolution: "1K" | "2K" }> = {
        "2d059365-a09a-4fd5-aa9e-b5335d09bbe9": { name: "Qwen Image 3.0 Pro", max_resolution: "2K" },
        "686ef278-e903-49a0-9e3c-2401fd396d22": { name: "GPT-Image-2", max_resolution: "2K" },
        "2924ac96-8708-4e2a-8700-df3eebbfa380": { name: "GPT-Image-2-Quality-Slow", max_resolution: "2K" },
        "c604136c-0756-49a0-a826-cfc72b68cb9a": { name: "Gemini-3.1-Flash-Image", max_resolution: "2K" },
        "301fed0f-82b9-47f7-b2a0-e710ae5e4d55": { name: "Gemini-3-Pro-Image", max_resolution: "2K" },
        "3a869437-b87a-460b-9fe7-23c27d234f3a": { name: "Gemini-2.5-Flash-Image", max_resolution: "2K" },
        "618e7813-24e8-462c-a3d4-0a0a509be700": { name: "Grok-Imagine-Image-2.0", max_resolution: "1K" },
        "flow-nano-banana-2": { name: "Flow · Nano Banana 2", max_resolution: "2K" },
        "flow-nano-banana-pro": { name: "Flow · Nano Banana Pro", max_resolution: "2K" },
        "flow-nano-banana-2-lite": { name: "Flow · Nano Banana 2 Lite", max_resolution: "2K" },
      };

      for (const [id, expected] of Object.entries(expectedCatalog)) {
        const found = IMGSTUDIO_MODELS.find((m) => m.id === id);
        assert.ok(found, `Expected model ID ${id} to exist in catalog`);
        assert.equal(found.name, expected.name);
        assert.equal(found.max_resolution, expected.max_resolution);
      }
    });

    it("ensures all model IDs are unique", () => {
      const ids = IMGSTUDIO_MODELS.map((m) => m.id);
      const uniqueIds = new Set(ids);
      assert.equal(uniqueIds.size, ids.length);
    });
  });

  describe("Helper Functions", () => {
    it("resolveImgStudioModelName returns proper names for known models", () => {
      assert.equal(resolveImgStudioModelName("2d059365-a09a-4fd5-aa9e-b5335d09bbe9"), "Qwen Image 3.0 Pro");
      assert.equal(resolveImgStudioModelName("618e7813-24e8-462c-a3d4-0a0a509be700"), "Grok-Imagine-Image-2.0");
      assert.equal(resolveImgStudioModelName("flow-nano-banana-pro"), "Flow · Nano Banana Pro");
    });

    it("resolveImgStudioModelName returns the modelId itself for unknown IDs", () => {
      const unknownId = "custom-external-model-123";
      assert.equal(resolveImgStudioModelName(unknownId), unknownId);
    });

    it("isSupportedImgStudioResolution respects max_resolution bounds", () => {
      const grokId = "618e7813-24e8-462c-a3d4-0a0a509be700"; // max 1K
      const qwenId = "2d059365-a09a-4fd5-aa9e-b5335d09bbe9"; // max 2K

      // Grok (1K max)
      assert.equal(isSupportedImgStudioResolution(grokId, "1K"), true);
      assert.equal(isSupportedImgStudioResolution(grokId, "1k"), true);
      assert.equal(isSupportedImgStudioResolution(grokId, "2K"), false);
      assert.equal(isSupportedImgStudioResolution(grokId, "4K"), false);

      // Qwen (2K max)
      assert.equal(isSupportedImgStudioResolution(qwenId, "1K"), true);
      assert.equal(isSupportedImgStudioResolution(qwenId, "2K"), true);
      assert.equal(isSupportedImgStudioResolution(qwenId, "2k"), true);
      assert.equal(isSupportedImgStudioResolution(qwenId, "4K"), false);

      // Unknown or invalid models/resolutions
      assert.equal(isSupportedImgStudioResolution("unknown-id", "1K"), false);
      assert.equal(isSupportedImgStudioResolution(qwenId, "8K"), false);
      assert.equal(isSupportedImgStudioResolution(qwenId, "invalid"), false);
    });
  });

  describe("Schema Validation", () => {
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

    it("ImageFallbackConfigSchema validates defaults", () => {
      const parsed = ImageFallbackConfigSchema.parse({});
      assert.equal(parsed.enabled, true);
      assert.equal(parsed.provider, "imgstudio");
      assert.equal(parsed.base_url, "https://imgstudio.site");
      assert.equal(parsed.api_key, "");
      assert.equal(parsed.model, "2d059365-a09a-4fd5-aa9e-b5335d09bbe9");
      assert.equal(parsed.resolution, "2K");
      assert.equal(parsed.quality, "standard");
    });

    it("ImageFallbackConfigSchema accepts valid custom inputs", () => {
      const customInput = {
        enabled: false,
        provider: "imgstudio" as const,
        base_url: "https://custom.imgstudio.internal",
        api_key: "secret-key-xyz",
        has_api_key: true,
        model: "686ef278-e903-49a0-9e3c-2401fd396d22",
        resolution: "1K" as const,
        quality: "high" as const,
      };

      const parsed: ImageFallbackConfig = ImageFallbackConfigSchema.parse(customInput);
      assert.deepEqual(parsed, customInput);
    });

    it("ImageFallbackConfigSchema rejects invalid provider or resolution", () => {
      // Invalid provider
      assert.throws(() => {
        ImageFallbackConfigSchema.parse({ provider: "dall-e" });
      });

      // Invalid resolution
      assert.throws(() => {
        ImageFallbackConfigSchema.parse({ resolution: "8K" });
      });

      // Invalid quality
      assert.throws(() => {
        ImageFallbackConfigSchema.parse({ quality: "ultra" });
      });
    });

    it("AppConfigSchema includes image_fallback with expected defaults", () => {
      const parsed = AppConfigSchema.parse(createBaseConfig());
      assert.ok(parsed.image_fallback, "image_fallback property must exist on parsed AppConfig");
      assert.equal(parsed.image_fallback.enabled, true);
      assert.equal(parsed.image_fallback.provider, "imgstudio");
      assert.equal(parsed.image_fallback.base_url, "https://imgstudio.site");
      assert.equal(parsed.image_fallback.model, "2d059365-a09a-4fd5-aa9e-b5335d09bbe9");
      assert.equal(parsed.image_fallback.resolution, "2K");
      assert.equal(parsed.image_fallback.quality, "standard");
    });

    it("AppConfigSchema preserves customized image_fallback configuration", () => {
      const parsed = AppConfigSchema.parse({
        ...createBaseConfig(),
        image_fallback: {
          enabled: false,
          api_key: "my-imgstudio-token",
          model: "flow-nano-banana-pro",
          resolution: "4K",
          quality: "high",
        },
      });

      assert.equal(parsed.image_fallback.enabled, false);
      assert.equal(parsed.image_fallback.provider, "imgstudio");
      assert.equal(parsed.image_fallback.base_url, "https://imgstudio.site");
      assert.equal(parsed.image_fallback.api_key, "my-imgstudio-token");
      assert.equal(parsed.image_fallback.model, "flow-nano-banana-pro");
      assert.equal(parsed.image_fallback.resolution, "4K");
      assert.equal(parsed.image_fallback.quality, "high");
    });

    it("AppConfigSchema defaults fast_render_mode to false when omitted", () => {
      const base = createBaseConfig();
      const { fast_render_mode: _omitted, ...videoGenWithoutFastRender } = base.video_generation;
      const parsed = AppConfigSchema.parse({
        ...base,
        video_generation: videoGenWithoutFastRender,
      });
      assert.equal(parsed.video_generation.fast_render_mode, false);
    });

    it("AppConfigSchema preserves explicit fast_render_mode setting", () => {
      const base = createBaseConfig();
      const parsed = AppConfigSchema.parse({
        ...base,
        video_generation: {
          ...base.video_generation,
          fast_render_mode: true,
        },
      });
      assert.equal(parsed.video_generation.fast_render_mode, true);
    });
  });
});
