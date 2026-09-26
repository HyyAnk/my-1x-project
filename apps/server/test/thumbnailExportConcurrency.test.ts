import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThumbnailManifestSchema } from "@studio/shared";
import { packageEpisodeExport, refreshEpisodeExport } from "../src/tasks/export/episodeExportPackager.js";
import { syncLegacyEpisodeThumbnailPaths } from "../src/quiz/thumbnail/thumbnailLegacyMigrator.js";
import { thumbnailConcurrencyFixture, deferred } from "./fixtures/thumbnailConcurrencyFixture.js";

afterEach(() => vi.restoreAllMocks());

describe("thumbnail and video persistence", () => {
  it("merges thumbnail and video metadata when their writes overlap", async () => {
    const { repository, channel, episode } = await thumbnailConcurrencyFixture();
    const writing = deferred();
    const release = deferred();
    const original = repository.writeJsonAtomic.bind(repository);
    let first = true;
    vi.spyOn(repository, "writeJsonAtomic").mockImplementation(async (target, value) => {
      if (target.endsWith("episode.json") && first) {
        first = false;
        writing.release();
        await release.promise;
      }
      return original(target, value);
    });
    const video = repository.saveVideoMetadata(channel.channel_id, episode.episode_id, "video.mp4", 42, "render.json");
    await writing.promise;
    const manifest = ThumbnailManifestSchema.parse({
      episode_id: episode.episode_id,
      channel_id: channel.channel_id,
      layout: "mega_grid",
      hook_text: "Animal quiz",
      mascot_persona: "Animal",
      asset_path_16_9: "thumbnail.jpg",
      asset_path_9_16: null,
      prompt_16_9: null,
      prompt_9_16: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const thumbnail = syncLegacyEpisodeThumbnailPaths({ repository, channel, episode, manifest });
    release.release();
    await Promise.all([video, thumbnail]);
    expect(await repository.getEpisode(channel.channel_id, episode.episode_id)).toMatchObject({
      stage: "VIDEO_READY",
      video_asset_path: "video.mp4",
      video_duration_seconds: 42,
      thumbnail_asset_path_16_9: "thumbnail.jpg",
    });
  });

  it("does not create an export before video exists and includes an already completed thumbnail", async () => {
    const { repository, channel, episode, imagePath, exportOptions } = await thumbnailConcurrencyFixture();
    expect(await refreshEpisodeExport(exportOptions)).toBeNull();
    const assets = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
    await repository.writeVideoArtifact(channel.channel_id, episode.episode_id, Buffer.from("video"));
    await writeFile(path.join(assets, "thumbnail_16_9.jpg"), await readFile(imagePath));
    const result = await packageEpisodeExport(exportOptions);
    expect(result.metadata.primary_thumbnail).toBe("thumbnails/thumbnail_default.jpg");
  });

  it("refreshes a late thumbnail even when video packaging is still writing metadata", async () => {
    const { repository, channel, episode, imagePath, exportOptions } = await thumbnailConcurrencyFixture();
    await repository.writeVideoArtifact(channel.channel_id, episode.episode_id, Buffer.from("video"));
    const writing = deferred();
    const release = deferred();
    const original = repository.writeJsonAtomic.bind(repository);
    let first = true;
    vi.spyOn(repository, "writeJsonAtomic").mockImplementation(async (target, value) => {
      if (target.endsWith("metadata.json") && first) {
        first = false;
        writing.release();
        await release.promise;
      }
      return original(target, value);
    });
    const packaging = packageEpisodeExport(exportOptions);
    await writing.promise;
    const assets = repository.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
    await writeFile(path.join(assets, "thumbnail_16_9.jpg"), await readFile(imagePath));
    const refresh = refreshEpisodeExport(exportOptions);
    release.release();
    await packaging;
    expect((await refresh)?.metadata.primary_thumbnail).toBe("thumbnails/thumbnail_default.jpg");
  });
});
