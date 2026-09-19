import os from "node:os";
import { IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID, IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID, type QuizAssetPlan } from "@studio/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioLogger } from "../src/logger.js";
import type { RepositoryService } from "../src/repository.js";
import { ImgStudioApiError } from "../src/providers/imgstudio/errors.js";
import { generateImgStudioImageBytes } from "../src/providers/imgstudio/generator.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";
import { generateImgStudioAsset } from "../src/quiz/assets/resolvers/strategies/imgStudioStrategy.js";

vi.mock("../src/providers/imgstudio/generator.js", () => ({
  generateImgStudioImageBytes: vi.fn(),
}));

vi.mock("../src/quiz/assets/imageDimensionValidator.js", () => ({
  validateReturnedImageDimensions: vi.fn(),
}));

const plan: QuizAssetPlan = {
  schema_version: 2,
  episode_id: "episode-1",
  consistency_groups: [],
  assets: [
    {
      asset_id: "question-art-1",
      question_id: "question-1",
      purpose: "question_illustration",
      subject: "A friendly yellow creature",
      style: "cute_illustration",
      aspect_ratio: "4:3",
      transparent_background: false,
      required: true,
      semantic_key: "friendly-yellow-creature",
      consistency_group_id: null,
    },
  ],
};

function createRepositoryStub(): RepositoryService {
  return {
    rootDirectory: os.tmpdir(),
    readQuizAssetResolution: vi.fn().mockResolvedValue(null),
    writeQuizAssetResolution: vi.fn().mockResolvedValue(undefined),
    writeQuizImageAsset: vi.fn().mockResolvedValue("generated/question-art-1.png"),
    recordImageUsage: vi.fn().mockResolvedValue(undefined),
  } as unknown as RepositoryService;
}

function resolveWithFallback(repository: RepositoryService, maxRounds: number, cancellationSignal?: AbortSignal) {
  return resolveQuizAssets({
    repository,
    channelId: "channel-1",
    episodeId: "episode-1",
    plan,
    maxRounds,
    cancellationSignal,
    imageConfig: { provider: "custom" },
    imageFallbackConfig: {
      enabled: true,
      provider: "imgstudio",
      api_key: "fallback-key",
      model: IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
      resolution: "2K",
      quality: "standard",
    },
  });
}

function generatedCalls() {
  return vi.mocked(generateImgStudioImageBytes).mock.calls.map(([, options]) => ({
    key: options?.idempotencyKey,
    model: options?.model,
  }));
}

describe("quiz ImgStudio retry and cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses one run identity across automatic rounds and creates a fresh identity for a new invocation", async () => {
    vi.mocked(generateImgStudioImageBytes).mockRejectedValue(
      new ImgStudioApiError("Temporary ImgStudio failure", "IMAGE_PROVIDER_SERVER_ERROR", true, 500),
    );
    const repository = createRepositoryStub();

    await resolveWithFallback(repository, 2);
    const firstInvocation = generatedCalls();

    expect(firstInvocation.map(({ model }) => model)).toEqual([
      IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID,
    ]);
    expect(firstInvocation[0]?.key).toBe(firstInvocation[2]?.key);
    expect(firstInvocation[1]?.key).toBe(firstInvocation[3]?.key);

    await resolveWithFallback(repository, 1);
    const secondInvocation = generatedCalls().slice(4);

    expect(secondInvocation).toHaveLength(2);
    expect(secondInvocation[0]?.key).not.toBe(firstInvocation[0]?.key);
    expect(secondInvocation[1]?.key).not.toBe(firstInvocation[1]?.key);
  });

  it("stops automatic rounds after a non-retryable provider failure", async () => {
    vi.mocked(generateImgStudioImageBytes).mockRejectedValue(
      new ImgStudioApiError("Existing idempotent task failed", "IMAGE_PROVIDER_IDEMPOTENCY_FAILED", false, 409),
    );

    const result = await resolveWithFallback(createRepositoryStub(), 3);

    expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(2);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "asset_generation_failed",
        severity: "blocker",
        message: expect.stringContaining("IMAGE_PROVIDER_IDEMPOTENCY_FAILED"),
      }),
    ]);
  });

  it("propagates cancellation instead of converting it into a quiz issue or trying Level 2", async () => {
    const controller = new AbortController();
    vi.mocked(generateImgStudioImageBytes).mockImplementation((_prompt, options) => {
      return new Promise((_resolve, reject) => {
        const signal = options.cancellationSignal;
        const rejectCancellation = () =>
          reject(signal?.reason instanceof Error ? signal.reason : new Error("Quiz image generation cancelled"));
        if (signal?.aborted) {
          rejectCancellation();
          return;
        }
        signal?.addEventListener("abort", rejectCancellation, { once: true });
      });
    });

    const repository = createRepositoryStub();
    const resolutionPromise = resolveWithFallback(repository, 3, controller.signal);
    await vi.waitFor(() => expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1));
    controller.abort(new Error("Cancelled by test"));

    await expect(resolutionPromise).rejects.toThrow("Cancelled by test");
    expect(generateImgStudioImageBytes).toHaveBeenCalledTimes(1);
    expect(repository.writeQuizAssetResolution).not.toHaveBeenCalled();
  });

  it("keeps primary ImgStudio settings ahead of fallback settings", async () => {
    vi.mocked(generateImgStudioImageBytes).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      model: "primary-model",
      aspect_ratio: "4:3",
      resolution: "2K",
      price_vnd: 100,
    });
    const repository = createRepositoryStub();
    const input = {
      repository,
      channelId: "channel-1",
      episodeId: "episode-1",
      request: plan.assets[0],
      fingerprint: "a".repeat(64),
      compiledPrompt: "A friendly yellow creature",
      configuredProvider: "imgstudio",
      activeEngine: "codex" as const,
      imageConfig: {
        provider: "imgstudio" as const,
        api_key: "primary-key",
        base_url: "https://primary.example",
        model: "primary-model",
        quality: "high",
      },
      imageFallbackConfig: {
        enabled: true,
        provider: "imgstudio" as const,
        api_key: "fallback-key",
        base_url: "https://fallback.example",
        model: "fallback-model",
        resolution: "1K" as const,
        quality: "standard" as const,
      },
      imgStudioRunId: "run-1",
      logger: {} as StudioLogger,
    };

    await generateImgStudioAsset(input);
    await generateImgStudioAsset(input, {
      fallbackTier: 1,
      modelOverride: IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
    });

    const primaryOptions = vi.mocked(generateImgStudioImageBytes).mock.calls[0]?.[1];
    const fallbackOptions = vi.mocked(generateImgStudioImageBytes).mock.calls[1]?.[1];
    expect(primaryOptions).toMatchObject({
      apiKey: "primary-key",
      baseUrl: "https://primary.example",
      model: "primary-model",
      quality: "high",
      resolution: "2K",
    });
    expect(fallbackOptions).toMatchObject({
      apiKey: "fallback-key",
      baseUrl: "https://fallback.example",
      model: IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID,
      quality: "standard",
      resolution: "1K",
    });
  });
});
