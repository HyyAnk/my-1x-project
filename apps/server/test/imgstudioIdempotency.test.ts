import { IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID } from "@studio/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RepositoryService } from "../src/repository.js";
import { generateImgStudioImageBytes } from "../src/providers/imgstudio/generator.js";
import { createImgStudioIdempotencyKey, createImgStudioRunId } from "../src/providers/imgstudio/idempotency.js";
import { ImgStudioImageProvider, ImgStudioQuizImageProvider } from "../src/providers/imgstudio/provider.js";

vi.mock("../src/providers/imgstudio/generator.js", () => ({
  generateImgStudioImageBytes: vi.fn(),
}));

vi.mock("../src/quiz/assets/imageDimensionValidator.js", () => ({
  validateReturnedImageDimensions: vi.fn(),
}));

const MODEL_A = "model-a";
const MODEL_B = "model-b";

function createRepositoryStub(): RepositoryService {
  return {
    writeQuizImageAsset: vi.fn().mockResolvedValue("quiz-image.png"),
    writeBundleImage: vi.fn().mockResolvedValue("bundle-image.png"),
    recordImageUsage: vi.fn().mockResolvedValue(undefined),
  } as unknown as RepositoryService;
}

function getGeneratedKey(callIndex: number): string {
  const options = vi.mocked(generateImgStudioImageBytes).mock.calls[callIndex]?.[1];
  return options?.idempotencyKey || "";
}

describe("ImgStudio idempotency identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateImgStudioImageBytes).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      model: MODEL_A,
      aspect_ratio: "1:1",
      resolution: "1K",
      price_vnd: 100,
    });
  });

  it("creates stable bounded keys and separates run, tier, and model identities", () => {
    const identity = {
      workflow: "quiz-image",
      runId: "run-1",
      resource: "asset-1",
      tier: "fallback-level-1",
      model: MODEL_A,
    };

    const key = createImgStudioIdempotencyKey(identity);

    expect(createImgStudioIdempotencyKey(identity)).toBe(key);
    expect(createImgStudioIdempotencyKey({ ...identity, runId: "run-2" })).not.toBe(key);
    expect(createImgStudioIdempotencyKey({ ...identity, tier: "fallback-level-2" })).not.toBe(key);
    expect(createImgStudioIdempotencyKey({ ...identity, model: MODEL_B })).not.toBe(key);
    expect(key.length).toBeLessThanOrEqual(120);
  });

  it("creates a fresh run identifier for each logical invocation", () => {
    expect(createImgStudioRunId()).not.toBe(createImgStudioRunId());
  });

  it("keeps bundle retries stable while separating run, tier, and model scopes", async () => {
    const repository = createRepositoryStub();
    const target = {
      channelId: "channel-1",
      episodeId: "episode-1",
      bundleNumber: 1,
      variant: 0,
      taskId: "run-1",
    };
    const level1 = new ImgStudioImageProvider(repository, target, {
      apiKey: "test-key",
      model: MODEL_A,
      idempotencyScope: "fallback-level-1",
    });

    await level1.generateReference("A stable prompt");
    await level1.generateReference("A stable prompt");
    await new ImgStudioImageProvider(repository, target, {
      apiKey: "test-key",
      model: MODEL_A,
      idempotencyScope: "fallback-level-2",
    }).generateReference("A stable prompt");
    await new ImgStudioImageProvider(repository, target, {
      apiKey: "test-key",
      model: MODEL_B,
      idempotencyScope: "fallback-level-1",
    }).generateReference("A stable prompt");
    await new ImgStudioImageProvider(
      repository,
      { ...target, taskId: "run-2" },
      {
        apiKey: "test-key",
        model: MODEL_A,
        idempotencyScope: "fallback-level-1",
      },
    ).generateReference("A stable prompt");

    expect(getGeneratedKey(0)).toBe(getGeneratedKey(1));
    expect(getGeneratedKey(2)).not.toBe(getGeneratedKey(0));
    expect(getGeneratedKey(3)).not.toBe(getGeneratedKey(0));
    expect(getGeneratedKey(4)).not.toBe(getGeneratedKey(0));
  });

  it("separates bundle keys when effective resolution or quality changes", async () => {
    const repository = createRepositoryStub();
    const target = {
      channelId: "channel-1",
      episodeId: "episode-1",
      bundleNumber: 1,
      variant: 0,
      taskId: "run-1",
    };
    const baseOptions = {
      apiKey: "test-key",
      model: IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
      runId: "run-1",
      idempotencyScope: "fallback-level-1",
    };

    await new ImgStudioImageProvider(repository, target, {
      ...baseOptions,
      resolution: "2K",
      quality: "standard",
    }).generateReference("A stable prompt");
    await new ImgStudioImageProvider(repository, target, {
      ...baseOptions,
      resolution: "1K",
      quality: "standard",
    }).generateReference("A stable prompt");
    await new ImgStudioImageProvider(repository, target, {
      ...baseOptions,
      resolution: "2K",
      quality: "high",
    }).generateReference("A stable prompt");

    expect(getGeneratedKey(1)).not.toBe(getGeneratedKey(0));
    expect(getGeneratedKey(2)).not.toBe(getGeneratedKey(0));
    expect(vi.mocked(generateImgStudioImageBytes).mock.calls[0]?.[1]).toMatchObject({
      resolution: "2K",
      quality: "standard",
    });
    expect(vi.mocked(generateImgStudioImageBytes).mock.calls[1]?.[1]).toMatchObject({ resolution: "1K" });
    expect(vi.mocked(generateImgStudioImageBytes).mock.calls[2]?.[1]).toMatchObject({ quality: "high" });
  });

  it("keeps quiz retries stable but gives a manual rerun a fresh key", async () => {
    const repository = createRepositoryStub();
    const target = { channelId: "channel-1", episodeId: "episode-1" };
    const input = {
      assetId: "question-1",
      fingerprint: "fingerprint-1",
      prompt: "A stable quiz prompt",
      aspect_ratio: "1:1",
    };
    const firstRun = new ImgStudioQuizImageProvider(repository, target, {
      apiKey: "test-key",
      model: MODEL_A,
      idempotencyScope: "fallback-level-1",
    });

    await firstRun.generateAsset(input);
    await firstRun.generateAsset(input);
    await new ImgStudioQuizImageProvider(repository, target, {
      apiKey: "test-key",
      model: MODEL_A,
      idempotencyScope: "fallback-level-1",
    }).generateAsset(input);

    expect(getGeneratedKey(0)).toBe(getGeneratedKey(1));
    expect(getGeneratedKey(2)).not.toBe(getGeneratedKey(0));
  });

  it("separates quiz keys when effective resolution or quality changes", async () => {
    const repository = createRepositoryStub();
    const target = { channelId: "channel-1", episodeId: "episode-1" };
    const input = {
      assetId: "question-1",
      fingerprint: "fingerprint-1",
      prompt: "A stable quiz prompt",
      aspect_ratio: "1:1",
    };
    const baseOptions = {
      apiKey: "test-key",
      model: IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
      runId: "run-1",
      idempotencyScope: "fallback-level-1",
    };

    await new ImgStudioQuizImageProvider(repository, target, {
      ...baseOptions,
      resolution: "2K",
      quality: "standard",
    }).generateAsset(input);
    await new ImgStudioQuizImageProvider(repository, target, {
      ...baseOptions,
      resolution: "1K",
      quality: "standard",
    }).generateAsset(input);
    await new ImgStudioQuizImageProvider(repository, target, {
      ...baseOptions,
      resolution: "2K",
      quality: "high",
    }).generateAsset(input);

    expect(getGeneratedKey(1)).not.toBe(getGeneratedKey(0));
    expect(getGeneratedKey(2)).not.toBe(getGeneratedKey(0));
    expect(vi.mocked(generateImgStudioImageBytes).mock.calls[0]?.[1]).toMatchObject({
      resolution: "2K",
      quality: "standard",
    });
    expect(vi.mocked(generateImgStudioImageBytes).mock.calls[1]?.[1]).toMatchObject({ resolution: "1K" });
    expect(vi.mocked(generateImgStudioImageBytes).mock.calls[2]?.[1]).toMatchObject({ quality: "high" });
  });

  it("does not record quiz usage when cancellation arrives during asset persistence", async () => {
    const controller = new AbortController();
    const repository = createRepositoryStub();
    vi.mocked(repository.writeQuizImageAsset).mockImplementation(async () => {
      controller.abort(new Error("Cancelled after quiz asset write"));
      return "quiz-image.png";
    });

    const provider = new ImgStudioQuizImageProvider(
      repository,
      { channelId: "channel-1", episodeId: "episode-1" },
      {
        apiKey: "test-key",
        model: MODEL_A,
      },
    );

    await expect(
      provider.generateAsset(
        {
          assetId: "question-1",
          fingerprint: "fingerprint-1",
          prompt: "A quiz image",
          aspect_ratio: "1:1",
        },
        controller.signal,
      ),
    ).rejects.toThrow("Cancelled after quiz asset write");
    expect(repository.writeQuizImageAsset).toHaveBeenCalledTimes(1);
    expect(repository.recordImageUsage).not.toHaveBeenCalled();
  });

  it("does not record bundle usage when cancellation arrives during asset persistence", async () => {
    const controller = new AbortController();
    const repository = createRepositoryStub();
    vi.mocked(repository.writeBundleImage).mockImplementation(async () => {
      controller.abort(new Error("Cancelled after bundle asset write"));
      return "bundle-image.png";
    });

    const provider = new ImgStudioImageProvider(
      repository,
      {
        channelId: "channel-1",
        episodeId: "episode-1",
        bundleNumber: 1,
        variant: 0,
        taskId: "run-1",
      },
      { apiKey: "test-key", model: MODEL_A },
    );

    await expect(provider.generateReference("A bundle image", controller.signal)).rejects.toThrow("Cancelled after bundle asset write");
    expect(repository.writeBundleImage).toHaveBeenCalledTimes(1);
    expect(repository.recordImageUsage).not.toHaveBeenCalled();
  });
});
