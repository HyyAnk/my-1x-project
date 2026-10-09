import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import type { Channel, Episode } from "@studio/shared";
import { normalizeThumbnailImage, YOUTUBE_THUMBNAIL_MAX_BYTES } from "../src/quiz/thumbnail/thumbnailImageNormalizer.js";
import { generateThumbnailVariant } from "../src/quiz/thumbnail/thumbnailVariantGenerator.js";
import { resolveThumbnailLayout } from "../src/quiz/thumbnail/thumbnailLayoutResolver.js";
import type { RepositoryService } from "../src/repository.js";
import type { StudioLogger } from "../src/logger.js";

async function noisePng(width: number, height: number): Promise<Buffer> {
  return sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

describe("thumbnail image normalization", () => {
  it("turns an oversized 4K PNG into a 1280x720 JPEG within the YouTube 2 MB limit", async () => {
    const source = await noisePng(3840, 2160);
    expect(source.byteLength).toBeGreaterThan(YOUTUBE_THUMBNAIL_MAX_BYTES);
    const output = await normalizeThumbnailImage(source, "16:9");
    expect(output.byteLength).toBeLessThanOrEqual(YOUTUBE_THUMBNAIL_MAX_BYTES);
    expect(await sharp(output).metadata()).toMatchObject({ width: 1280, height: 720, format: "jpeg" });
  });

  it("produces the exact Shorts canvas for 9:16", async () => {
    const output = await normalizeThumbnailImage(await noisePng(600, 900), "9:16");
    expect(await sharp(output).metadata()).toMatchObject({ width: 1080, height: 1920, format: "jpeg" });
  });

  it("rejects corrupt and undersized sources", async () => {
    await expect(normalizeThumbnailImage(Buffer.from("AI_QUIZ_THUMBNAIL_16_9_PLACEHOLDER"), "16:9")).rejects.toThrow();
    await expect(normalizeThumbnailImage(await noisePng(100, 100), "16:9")).rejects.toThrow("undersized");
  });
});

describe("thumbnail variant generation", () => {
  let root = "";
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  function createFakeRepository(storageRoot: string): RepositoryService {
    return {
      storageRoot,
      rootDirectory: storageRoot,
      resolvePath: (...segments: string[]) => path.join(storageRoot, ...segments),
      writeBinaryAtomic: (target: string, data: Buffer) => writeFile(target, data),
      recordImageUsage: async () => undefined,
    } as unknown as RepositoryService;
  }

  async function runVariant(generateReference: () => Promise<{ asset_path: string }>) {
    root = await mkdtemp(path.join(os.tmpdir(), "thumb-variant-"));
    const params = {
      repository: createFakeRepository(root),
      channel: { channel_id: "ch", slug: "novy" } as Channel,
      episode: { episode_id: "ep", slug: "gizmos" } as Episode,
      ratio: "16:9" as const,
      prompt: "prompt",
      plan: resolveThumbnailLayout({ topicTitle: "House Gizmos", layoutOverride: "mega_grid" }),
      options: { channelId: "ch", episodeId: "ep", imageProvider: { generateReference } as never },
      logger: { warn: () => undefined } as unknown as StudioLogger,
      nowTimestamp: 1,
    };
    const activePath = path.join(root, "channels", "novy", "episodes", "gizmos", "assets", "thumbnail_16_9.jpg");
    return { params, activePath };
  }

  it("normalizes preset-layout (non-editorial) provider images before publishing", async () => {
    const providerFile = path.join(os.tmpdir(), `thumb-provider-${Date.now()}.png`);
    await writeFile(providerFile, await noisePng(2048, 1152));
    const { params, activePath } = await runVariant(async () => ({ asset_path: providerFile }));
    await generateThumbnailVariant(params);
    expect(await sharp(activePath).metadata()).toMatchObject({ width: 1280, height: 720, format: "jpeg" });
    await rm(providerFile, { force: true });
  });

  it("throws on provider failure without writing a placeholder file", async () => {
    const { params, activePath } = await runVariant(async () => {
      throw new Error("Provider unavailable");
    });
    await expect(generateThumbnailVariant(params)).rejects.toThrow("Failed to generate 16:9 thumbnail: Provider unavailable");
    await expect(stat(activePath)).rejects.toThrow();
  });
});
