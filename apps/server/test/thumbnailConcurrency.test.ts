import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageProvider } from "../src/providers/index.js";
import { packageEpisodeExport, refreshEpisodeExport } from "../src/tasks/export/episodeExportPackager.js";
import { getEpisodeThumbnailManifest } from "../src/quiz/thumbnail/thumbnailManifestStore.js";
import { waitFor } from "./tasksTestUtils.js";
import { deferred, thumbnailConcurrencyFixture } from "./fixtures/thumbnailConcurrencyFixture.js";

const provider = vi.hoisted(() => ({ generateReference: vi.fn<ImageProvider["generateReference"]>() }));
vi.mock("../src/quiz/thumbnail/ensureEpisodeThumbnail.js", async (original) => {
  const actual = await original<typeof import("../src/quiz/thumbnail/ensureEpisodeThumbnail.js")>();
  return {
    ensureEpisodeThumbnail: (
      repository: Parameters<typeof actual.ensureEpisodeThumbnail>[0],
      options: Parameters<typeof actual.ensureEpisodeThumbnail>[1],
    ) => actual.ensureEpisodeThumbnail(repository, { ...options, imageProvider: provider }),
  };
});
// Keep production coordination, queue, thumbnail service, persistence and exports real.
vi.mock("../src/tasks/pipeline/quizV2PipelineRunner.js", () => ({ runQuizV2Pipeline: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
beforeEach(() => provider.generateReference.mockReset());

async function fixture() {
  const state = await thumbnailConcurrencyFixture();
  const { manager, repository, channel, episode, exportOptions } = state;
  vi.spyOn(manager, "runVideoTask").mockImplementation(async (task) => {
    await manager.update(task.task_id, { status: "RUNNING" });
    const videoPath = await repository.writeVideoArtifact(channel.channel_id, episode.episode_id, Buffer.from("video-fixture"));
    await repository.saveVideoMetadata(channel.channel_id, episode.episode_id, videoPath, 5, "manifest.json");
    await packageEpisodeExport(exportOptions);
    await manager.finish(task.task_id, "COMPLETED", null, [videoPath]);
  });
  return state;
}

describe("independent thumbnail production", () => {
  it("completes video while thumbnail is pending, deduplicates requests, then refreshes export without recopying video", async () => {
    const state = await fixture();
    const gate = deferred();
    provider.generateReference.mockImplementation(async () => {
      await gate.promise;
      return { asset_path: state.imagePath };
    });
    const { manager, repository, channel, episode, exportOptions } = state;
    const pipeline = manager.submit("GENERATE_PIPELINE", channel.channel_id, episode.episode_id);
    try {
      await waitFor(() => manager.get(pipeline.task_id).status === "COMPLETED");
      const thumbnail = manager.list().find((task) => task.task_type === "GENERATE_THUMBNAIL")!;
      expect(thumbnail.status).toBe("RUNNING");
      expect(manager.submit("GENERATE_THUMBNAIL", channel.channel_id, episode.episode_id).task_id).toBe(thumbnail.task_id);
      const current = await repository.getEpisode(channel.channel_id, episode.episode_id);
      expect(current.video_asset_path).toBeTruthy();
      expect(current.thumbnail_asset_path_16_9).toBeNull();
      const exportDir = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "export");
      const videoBefore = await stat(path.join(exportDir, "quiz-video.mp4"));
      gate.release();
      await waitFor(() => manager.get(thumbnail.task_id).status === "COMPLETED");
      const latest = await repository.getEpisode(channel.channel_id, episode.episode_id);
      expect(latest.video_asset_path).toBe(current.video_asset_path);
      expect(latest.thumbnail_asset_path_16_9).toBeTruthy();
      const metadata = JSON.parse(await readFile(path.join(exportDir, "metadata.json"), "utf8"));
      expect(metadata.primary_thumbnail).toBe("thumbnails/thumbnail_default.jpg");
      expect((await stat(path.join(exportDir, "quiz-video.mp4"))).mtimeMs).toBe(videoBefore.mtimeMs);
      const timings = await repository.readQuizStageTimings(channel.channel_id, episode.episode_id);
      expect(timings?.stages?.render?.completed_at).toBeTruthy();
      expect(timings?.stages?.thumbnail?.completed_at).toBeTruthy();
      expect(provider.generateReference).toHaveBeenCalledTimes(1);
      await refreshEpisodeExport(exportOptions);
    } finally {
      gate.release();
      await waitFor(() => !manager.hasActiveWork());
    }
  });

  it("isolates provider failure and retries only thumbnail work", async () => {
    const { manager, channel, episode, imagePath } = await fixture();
    provider.generateReference.mockRejectedValue(new Error("Provider unavailable"));
    const pipeline = manager.submit("GENERATE_PIPELINE", channel.channel_id, episode.episode_id);
    await waitFor(() => !manager.hasActiveWork());
    expect(manager.get(pipeline.task_id).status).toBe("COMPLETED");
    expect(manager.list().find((task) => task.task_type === "GENERATE_THUMBNAIL")?.status).toBe("FAILED");
    provider.generateReference.mockResolvedValue({ asset_path: imagePath });
    const retry = manager.submit("GENERATE_THUMBNAIL", channel.channel_id, episode.episode_id);
    await waitFor(() => !manager.hasActiveWork());
    expect(manager.get(retry.task_id).status).toBe("COMPLETED");
    expect(manager.runVideoTask).toHaveBeenCalledTimes(1);
  });

  it("cancels pending generation without activating its late result", async () => {
    const { manager, repository, channel, episode, imagePath } = await fixture();
    const gate = deferred();
    provider.generateReference.mockImplementation(async () => {
      await gate.promise;
      return { asset_path: imagePath };
    });
    const task = manager.submit("GENERATE_THUMBNAIL", channel.channel_id, episode.episode_id);
    await waitFor(() => provider.generateReference.mock.calls.length > 0);
    await manager.cancel(task.task_id);
    gate.release();
    await waitFor(() => !manager.hasActiveWork());
    expect(manager.get(task.task_id).status).toBe("CANCELLED");
    expect(await getEpisodeThumbnailManifest(repository, channel.channel_id, episode.episode_id)).toBeNull();
  });

  it("rejects a stale thumbnail when settings change during generation", async () => {
    const { manager, repository, channel, episode, imagePath } = await fixture();
    const gate = deferred();
    provider.generateReference.mockImplementation(async () => {
      await gate.promise;
      return { asset_path: imagePath };
    });
    const task = manager.submit("GENERATE_THUMBNAIL", channel.channel_id, episode.episode_id);
    await waitFor(() => provider.generateReference.mock.calls.length > 0);
    const current = await repository.getEpisode(channel.channel_id, episode.episode_id);
    await repository.writeJsonAtomic(repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), {
      ...current,
      quiz_config: { ...current.quiz_config, thumbnail_aspect_ratio: "9:16" },
    });
    gate.release();
    await waitFor(() => !manager.hasActiveWork());
    expect(manager.get(task.task_id).status).toBe("FAILED");
    expect(manager.get(task.task_id).error).toContain("inputs changed");
    expect(await getEpisodeThumbnailManifest(repository, channel.channel_id, episode.episode_id)).toBeNull();
  });
});
