import { afterEach, describe, expect, it, vi } from "vitest";
import { IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID, IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID } from "@studio/shared";
import type { StudioLogger } from "../src/logger.js";
import type { RepositoryService } from "../src/repository.js";
import { ImgStudioImageProvider } from "../src/providers/imgstudio/provider.js";
import { generateContinuityImgStudioFallback } from "../src/tasks/imageFallback/continuityImgStudioFallback.js";

function readProviderModel(provider: ImgStudioImageProvider): string {
  const options: unknown = Reflect.get(provider, "options");
  if (!options || typeof options !== "object" || !("model" in options) || typeof options.model !== "string") {
    throw new Error("ImgStudio provider model was not configured");
  }
  return options.model;
}

describe("continuity ImgStudio fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tries Gemini Level 1 before configured Qwen Level 2", async () => {
    const attemptedModels: string[] = [];
    const generateSpy = vi.spyOn(ImgStudioImageProvider.prototype, "generateReference").mockImplementation(async function (
      this: ImgStudioImageProvider,
    ) {
      const model = readProviderModel(this);
      attemptedModels.push(model);
      if (model === IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID) {
        throw new Error("Level 1 unavailable");
      }
      return { asset_path: "channels/test/episodes/test/bundle.png" };
    });
    const logger = { warn: vi.fn(), error: vi.fn() } as unknown as StudioLogger;

    const result = await generateContinuityImgStudioFallback(
      {
        repository: {} as RepositoryService,
        logger,
        config: {
          enabled: true,
          provider: "imgstudio",
          base_url: "https://imgstudio.site",
          api_key: "test-key",
          model: IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
          resolution: "2K",
          quality: "standard",
        },
        target: { channelId: "channel", episodeId: "episode", bundleNumber: 1, variant: 0, taskId: "task-1" },
        prompt: "A bright educational scene",
        isCancelled: () => false,
      },
      new Error("Primary unavailable"),
    );

    expect(result?.image.asset_path).toContain("bundle.png");
    expect(attemptedModels).toEqual([IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID, IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID]);
    expect(generateSpy).toHaveBeenCalledTimes(2);
  });

  it("surfaces the final Level 2 error", async () => {
    vi.spyOn(ImgStudioImageProvider.prototype, "generateReference")
      .mockRejectedValueOnce(new Error("Level 1 unavailable"))
      .mockRejectedValueOnce(new Error("Level 2 unavailable"));

    await expect(
      generateContinuityImgStudioFallback(
        {
          repository: {} as RepositoryService,
          logger: { warn: vi.fn(), error: vi.fn() } as unknown as StudioLogger,
          config: {
            enabled: true,
            provider: "imgstudio",
            base_url: "https://imgstudio.site",
            api_key: "test-key",
            model: IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
            resolution: "2K",
            quality: "standard",
          },
          target: { channelId: "channel", episodeId: "episode", bundleNumber: 1, variant: 0, taskId: "task-2" },
          prompt: "A bright educational scene",
          isCancelled: () => false,
        },
        new Error("Primary unavailable"),
      ),
    ).rejects.toThrow("Level 2 unavailable");
  });
});
