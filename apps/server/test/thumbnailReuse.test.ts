import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThumbnailManifest } from "@studio/shared";
import type { RepositoryService } from "../src/repository.js";
import type { GenerateEpisodeThumbnailOptions } from "../src/quiz/thumbnail/thumbnailVariantGenerator.js";

const mocks = vi.hoisted(() => ({
  generate: vi.fn<(repository: RepositoryService, options: GenerateEpisodeThumbnailOptions) => Promise<ThumbnailManifest>>(),
  readManifest: vi.fn<() => Promise<ThumbnailManifest | null>>(),
}));
vi.mock("../src/quiz/thumbnail/thumbnailService.js", () => ({
  generateEpisodeThumbnail: mocks.generate,
  resolveTargetThumbnailRatio: (episode: { quiz_config: { thumbnail_aspect_ratio: string } }, ratio?: string) =>
    ratio ?? episode.quiz_config.thumbnail_aspect_ratio,
}));
vi.mock("../src/quiz/thumbnail/thumbnailManifestStore.js", () => ({ getEpisodeThumbnailManifest: mocks.readManifest }));
import { ensureEpisodeThumbnail } from "../src/quiz/thumbnail/ensureEpisodeThumbnail.js";

const roots: string[] = [];
afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture(ratio: "16:9" | "both" = "16:9") {
  const root = await mkdtemp(path.join(os.tmpdir(), "thumbnail-reuse-"));
  roots.push(root);
  const episode = {
    topic: { title: "Animals" },
    slug: "episode",
    thumbnail_asset_path_16_9: null,
    thumbnail_asset_path_9_16: null,
    quiz_config: { thumbnail_aspect_ratio: ratio, visual_style: "cute_illustration" },
  };
  let manifest = { asset_path_16_9: null, asset_path_9_16: null } as ThumbnailManifest;
  mocks.readManifest.mockImplementation(() => Promise.resolve(manifest));
  mocks.generate.mockImplementation(async (_repository, options) => {
    const landscape = options.aspectRatio === "16:9";
    const filename = landscape ? "landscape.jpg" : "portrait.jpg";
    await sharp({ create: { width: landscape ? 640 : 360, height: landscape ? 360 : 640, channels: 3, background: "red" } })
      .jpeg()
      .toFile(path.join(root, filename));
    manifest = { ...manifest, [landscape ? "asset_path_16_9" : "asset_path_9_16"]: filename };
    return manifest;
  });
  const repository = {
    rootDirectory: root,
    storageRoot: root,
    getEpisode: () => Promise.resolve(episode),
    getChannel: () => Promise.resolve({ slug: "channel", language: "English", mascot_id: null }),
    readQuiz: () => Promise.resolve(null),
    resolvePath: (...parts: string[]) => path.join(root, ...parts),
    resolveContextPath: (file: string) => path.join(root, file),
  } as unknown as RepositoryService;
  return { root, episode, repository, options: { channelId: "channel", episodeId: "episode" } };
}

describe("automatic thumbnail reuse", () => {
  it("only calls the provider once across repeated pipeline requests", async () => {
    const { repository, options } = await fixture();
    await ensureEpisodeThumbnail(repository, options);
    await ensureEpisodeThumbnail(repository, options);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("serializes concurrent automatic requests and reuses the first result", async () => {
    const { repository, options } = await fixture();
    await Promise.all([ensureEpisodeThumbnail(repository, options), ensureEpisodeThumbnail(repository, options)]);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("regenerates corrupt image bytes instead of accepting a placeholder", async () => {
    const { repository, options, root } = await fixture();
    await ensureEpisodeThumbnail(repository, options);
    await writeFile(path.join(root, "landscape.jpg"), "PLACEHOLDER");
    await ensureEpisodeThumbnail(repository, options);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });
  it("reuses a healthy provider-native 3:2 thumbnail without paying for a replacement", async () => {
    const { repository, options, root } = await fixture();
    await ensureEpisodeThumbnail(repository, options);
    await sharp({ create: { width: 720, height: 480, channels: 3, background: "blue" } })
      .jpeg()
      .toFile(path.join(root, "landscape.jpg"));
    await ensureEpisodeThumbnail(repository, options);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("invalidates thumbnails when their content inputs change", async () => {
    const { repository, options, episode } = await fixture();
    await ensureEpisodeThumbnail(repository, options);
    episode.topic.title = "Oceans";
    await ensureEpisodeThumbnail(repository, options);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });
  it("retains the first aspect ratio after the second one fails", async () => {
    const { repository, options } = await fixture("both");
    const generate = mocks.generate.getMockImplementation()!;
    mocks.generate.mockImplementation((repo, opts) => {
      if (opts.aspectRatio === "9:16") return Promise.reject(new Error("Provider unavailable"));
      return generate(repo, opts);
    });
    await expect(ensureEpisodeThumbnail(repository, options)).rejects.toThrow("Provider unavailable");
    mocks.generate.mockImplementation(generate);
    mocks.generate.mockClear();
    await ensureEpisodeThumbnail(repository, options);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate.mock.calls[0][1].aspectRatio).toBe("9:16");
  });
});
