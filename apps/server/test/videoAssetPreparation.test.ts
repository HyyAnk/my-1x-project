import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DirectorPlan, QuizAssetPlan, QuizV2 } from "@studio/shared";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

const resolveQuizAssetsMock = vi.hoisted(() => vi.fn());

vi.mock("../src/quiz/assets/resolveQuizAssets.js", () => ({
  resolveQuizAssets: resolveQuizAssetsMock,
}));

import { prepareVideoAssets } from "../src/tasks/video/videoAssetPreparation.js";

const assetPlan: QuizAssetPlan = {
  schema_version: 2,
  episode_id: "episode-1",
  assets: [],
  consistency_groups: [],
};

const runtime = {
  repository: {},
  activeEngine: "codex",
  imageConfig: { provider: "imgstudio", api_key: "test-key", base_url: "https://imgstudio.site" },
  imageFallbackConfig: { enabled: true, provider: "imgstudio" },
} as unknown as TaskManagerRuntime;

describe("prepareVideoAssets", () => {
  beforeEach(() => {
    resolveQuizAssetsMock.mockReset();
  });

  it("propagates the video abort signal and preserves the final asset failure detail", async () => {
    const controller = new AbortController();
    resolveQuizAssetsMock.mockResolvedValue({
      resolution: { schema_version: 2, episode_id: "episode-1", template_id: "candy_arcade", assets: [] },
      issues: [
        {
          code: "asset_generation_failed",
          severity: "blocker",
          message: "ImgStudio Level 2 failed with HTTP 409: idempotency conflict",
          next_action: "Retry generation.",
          question_ids: ["question-1"],
          stage: "assets",
        },
      ],
    });

    const result = prepareVideoAssets({
      runtime,
      channelId: "channel-1",
      episodeId: "episode-1",
      renderRoot: "unused-render-root",
      assetPlan,
      assetResolution: null,
      quiz: { questions: [] } as unknown as QuizV2,
      director: { beats: [] } as unknown as DirectorPlan,
      aspectRatio: "16:9",
      signal: controller.signal,
      onProgress: vi.fn(),
    });

    await expect(result).rejects.toMatchObject({
      code: "QUIZ_ASSET_GENERATION_FAILED",
      message: expect.stringContaining("ImgStudio Level 2 failed with HTTP 409: idempotency conflict"),
    });
    expect(resolveQuizAssetsMock).toHaveBeenCalledWith(expect.objectContaining({ cancellationSignal: controller.signal }));
  });
});
