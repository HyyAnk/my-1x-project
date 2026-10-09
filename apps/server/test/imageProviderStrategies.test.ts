import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "../src/repository.js";
import { generateGpti2Asset } from "../src/quiz/assets/resolvers/strategies/gpti2Strategy.js";
import { generateShopAiKeyAsset } from "../src/quiz/assets/resolvers/strategies/shopAiKeyStrategy.js";
import { generateAntigravityAsset } from "../src/quiz/assets/resolvers/strategies/antigravityStrategy.js";
import { Gpti2QuizImageProvider } from "../src/providers/gpti2Image.js";
import { ShopAiKeyQuizImageProvider } from "../src/providers/shopAiKeyImage.js";
import { AntigravityImageChainProvider } from "../src/providers/antigravityImageChain.js";
import * as pricingTracker from "../src/quiz/assets/resolvers/utils/assetPricingTracker.js";
import type { ProviderAssetInput } from "../src/quiz/assets/resolvers/types/providerAsset.types.js";

function createMockInput(overrides: Partial<ProviderAssetInput> = {}): ProviderAssetInput {
  return {
    repository: {
      rootDirectory: "d:/dummy",
      getEpisode: vi.fn().mockResolvedValue({
        quiz_config: { visual_theme: "3d_render" },
      }),
      recordImageUsage: vi.fn().mockResolvedValue(undefined),
    } as any,
    channelId: "channel-1",
    episodeId: "episode-1",
    request: {
      asset_id: "test-asset-1",
      question_id: "q-1",
      purpose: "hero_question_image",
      subject: "A cute golden puppy",
      style: "3D cartoon",
      aspect_ratio: "16:9",
      transparent_background: false,
      required: true,
      semantic_key: "puppy",
      consistency_group_id: null,
    },
    fingerprint: "abc123def456",
    compiledPrompt: "A cute golden puppy in high quality 3d",
    configuredProvider: "gpti2",
    activeEngine: "codex",
    logger: {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    } as any,
    ...overrides,
  };
}

describe("Single-Attempt Provider Strategies Modernization", () => {
  describe("generateGpti2Asset", () => {
    it("executes a single attempt and records usage on success", async () => {
      const generateSpy = vi
        .spyOn(Gpti2QuizImageProvider.prototype, "generateAsset")
        .mockResolvedValue({ path: "/assets/gpti2-puppy.png", price_vnd: 50, model: "gpt-image-2.5-flare" });
      const trackSpy = vi.spyOn(pricingTracker, "trackGpti2Usage").mockResolvedValue(undefined);

      const input = createMockInput();
      const result = await generateGpti2Asset(input);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(trackSpy).toHaveBeenCalledTimes(1);
      expect(result.entry.path).toBe("/assets/gpti2-puppy.png");
      expect(result.entry.source).toBe("provider");
      expect(result.tier3Fallback).toBe(false);

      generateSpy.mockRestore();
      trackSpy.mockRestore();
    });

    // GPT-I2 keeps one bounded transient retry (see authorizedContentProviderErrors "Case 3"),
    // unlike the single-attempt ShopAiKey and Antigravity strategies.
    it("retries a transient error exactly once before failing", async () => {
      vi.useFakeTimers();
      const generateSpy = vi
        .spyOn(Gpti2QuizImageProvider.prototype, "generateAsset")
        .mockRejectedValue(new Error("GPT-I2 upstream 503 timeout"));

      try {
        const input = createMockInput();
        const outcome = expect(generateGpti2Asset(input)).rejects.toThrow("GPT-I2 upstream 503 timeout");
        await vi.runAllTimersAsync();
        await outcome;

        expect(generateSpy).toHaveBeenCalledTimes(2);
        expect(input.logger.warn).toHaveBeenCalledTimes(1);
      } finally {
        generateSpy.mockRestore();
        vi.useRealTimers();
      }
    });

    it("immediately rethrows content filter and size conflict errors", async () => {
      const conflictError = new RepositoryError("Size conflict", "image_request_size_conflict");
      const generateSpy = vi
        .spyOn(Gpti2QuizImageProvider.prototype, "generateAsset")
        .mockRejectedValue(conflictError);

      const input = createMockInput();
      await expect(generateGpti2Asset(input)).rejects.toThrow(conflictError);
      expect(generateSpy).toHaveBeenCalledTimes(1);

      generateSpy.mockRestore();
    });
  });

  describe("generateShopAiKeyAsset", () => {
    it("executes a single attempt and records usage on success", async () => {
      const generateSpy = vi
        .spyOn(ShopAiKeyQuizImageProvider.prototype, "generateAsset")
        .mockResolvedValue({ path: "/assets/shopai-puppy.png" } as any);
      const trackSpy = vi.spyOn(pricingTracker, "trackShopAiKeyUsage").mockResolvedValue(undefined);

      const input = createMockInput({ configuredProvider: "shopaikey" });
      const result = await generateShopAiKeyAsset(input);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(trackSpy).toHaveBeenCalledTimes(1);
      expect(result.entry.path).toBe("/assets/shopai-puppy.png");
      expect(result.tier3Fallback).toBe(false);

      generateSpy.mockRestore();
      trackSpy.mockRestore();
    });

    it("fails immediately on error without inner retry loops", async () => {
      const generateSpy = vi
        .spyOn(ShopAiKeyQuizImageProvider.prototype, "generateAsset")
        .mockRejectedValue(new Error("ShopAiKey connection refused"));

      const input = createMockInput({ configuredProvider: "shopaikey" });
      await expect(generateShopAiKeyAsset(input)).rejects.toThrow("ShopAiKey connection refused");

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(input.logger.warn).not.toHaveBeenCalled();

      generateSpy.mockRestore();
    });
  });

  describe("generateAntigravityAsset", () => {
    it("executes a single attempt and records usage on success", async () => {
      const generateSpy = vi
        .spyOn(AntigravityImageChainProvider.prototype, "generateReference")
        .mockResolvedValue({ asset_path: "/assets/ag-puppy.png", fallback_tier: 1, degraded: false });
      const trackSpy = vi.spyOn(pricingTracker, "trackAntigravityUsage").mockResolvedValue(undefined);

      const input = createMockInput({ activeEngine: "antigravity" });
      const result = await generateAntigravityAsset(input);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(trackSpy).toHaveBeenCalledTimes(1);
      expect(result.entry.path).toBe("/assets/ag-puppy.png");
      expect(result.entry.source).toBe("provider");

      generateSpy.mockRestore();
      trackSpy.mockRestore();
    });

    it("propagates non-client-support errors immediately on a single attempt", async () => {
      const generateSpy = vi
        .spyOn(AntigravityImageChainProvider.prototype, "generateReference")
        .mockRejectedValue(new Error("Internal rendering failure"));

      const input = createMockInput({ activeEngine: "antigravity" });
      await expect(generateAntigravityAsset(input)).rejects.toThrow("Internal rendering failure");

      expect(generateSpy).toHaveBeenCalledTimes(1);

      generateSpy.mockRestore();
    });

    it("falls back immediately when Antigravity client is unsupported", async () => {
      const generateSpy = vi
        .spyOn(AntigravityImageChainProvider.prototype, "generateReference")
        .mockRejectedValue(new Error("ANTIGRAVITY_CLIENT_UNSUPPORTED: missing tool"));
      const shopAiSpy = vi
        .spyOn(ShopAiKeyQuizImageProvider.prototype, "generateAsset")
        .mockResolvedValue({ path: "/assets/fallback-puppy.png" } as any);

      const input = createMockInput({
        activeEngine: "antigravity",
        imageConfig: { api_key: "sk-shopai-test" },
      });
      const result = await generateAntigravityAsset(input);

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(result.entry.path).toBe("/assets/fallback-puppy.png");
      expect(input.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Antigravity client unsupported"),
        expect.any(Object),
      );

      generateSpy.mockRestore();
      shopAiSpy.mockRestore();
    });
  });
});
