import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EpisodeSchema } from "@studio/shared";
import { prepareVideoComposition } from "../src/tasks/video/videoCompositionPreparer.js";
import { styleBoundaryChannel, styleBoundaryEpisode } from "./quizStyleBoundaryFixtures.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";
import type { RepositoryService } from "../src/repository.js";

describe("quizV2OnlyCompositionPreparation", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
  });

  async function createTestRoot(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "v2-only-prep-"));
    roots.push(root);
    return root;
  }

  it("fails with QUIZ_V2_REQUIRED when episode has an existing video but missing V2 artifacts, without side effects", async () => {
    const root = await createTestRoot();
    const channel = styleBoundaryChannel();
    const episodeId = "existing-video-missing-v2";

    const episode = EpisodeSchema.parse({
      episode_id: episodeId,
      channel_id: channel.channel_id,
      slug: episodeId,
      topic: { title: "Test", premise: "Test premise", hook: "Test hook" },
      stage: "VIDEO_READY",
      script_path: "script.md",
      scene_plan_path: "scenes.json",
      dialogue_script_path: "dialogue.md",
      video_prompts_path: "prompts.md",
      narration_asset_path: "narration.wav",
      narration_generated_at: "2026-08-31T00:00:00.000Z",
      narration_duration_seconds: 30,
      narration_segment_count: 1,
      measured_narration_words_per_second: 20,
      quiz_config: styleBoundaryEpisode(),
      video_asset_path: "channels/channel/episodes/episode/assets/quiz-video.mp4",
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });

    const writeSpy = vi.fn();
    const renderRoot = path.join(root, "runtime", "hyperframes", episodeId);

    const repository = {
      rootDirectory: root,
      resolvePath: (...segments: string[]) => path.join(root, ...segments),
      getEpisode: () => Promise.resolve(episode),
      getChannel: () => Promise.resolve(channel),
      readScenes: () => Promise.resolve([]),
      getEpisodeAudioFile: () =>
        Promise.resolve({
          absolutePath: path.join(root, "fake-narration.wav"),
          path: "narration.wav",
          size: 44,
          modified_at: "2026-08-31T00:00:00.000Z",
        }),
      // Missing quiz-v2.json
      readQuiz: vi.fn().mockResolvedValue(null),
      readDirectorPlan: vi.fn().mockResolvedValue({ scenes: [] }),
      readAssetPlan: vi.fn().mockResolvedValue({ assets: [] }),
      readVoicePlan: vi.fn().mockResolvedValue({ segments: [] }),
      readQuizTimeline: vi.fn().mockResolvedValue({ total_duration_seconds: 30 }),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      readBgmHistory: vi.fn().mockResolvedValue([]),
      writeJsonAtomic: writeSpy,
    } as unknown as RepositoryService;

    const runtime = {
      videoConfig: { fps: 30 },
      logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as TaskManagerRuntime;

    const onProgress = vi.fn().mockResolvedValue(undefined);

    await expect(
      prepareVideoComposition({
        runtime,
        repository,
        taskId: "task-test",
        channel,
        episode,
        scenes: [],
        renderAspectRatio: "16:9",
        onProgress,
      }),
    ).rejects.toThrowError(/quiz-v2\.json/);

    // Verify no side effects occurred:
    // 1. Render root directory was NOT created
    expect(existsSync(renderRoot)).toBe(false);
    // 2. Audio was not copied
    expect(existsSync(path.join(renderRoot, "narration.wav"))).toBe(false);
    // 3. No progress messages emitted
    expect(onProgress).not.toHaveBeenCalled();
    // 4. writeJsonAtomic (e.g. style pinning) was not called
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
