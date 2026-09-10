import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Channel, MascotProfile } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { getOrCreateTransparentMascotAsset, getTransparentMascotCachePaths } from "../src/quiz/mascotAssetCache.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import * as imageMatting from "../src/utils/imageMatting.js";

// Valid 1x1 PNG bytes
const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73,
  68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

describe("Mascot Matting Pre-Processing & Transparent Sprite Caching", () => {
  let tempDir: string;
  let repository: RepositoryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "mascot-cache-test-"));
    repository = new RepositoryService(tempDir);
    await repository.ensureBootstrap();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it("computes and caches transparent sprite on first call, hits cache on second call", async () => {
    const mascot = await repository.saveMascot({ name: "Buddy" });
    await repository.saveMascotAsset(mascot.id, "idle.png", TINY_PNG);

    const mattingSpy = vi.spyOn(imageMatting, "removeImageBackground");

    // First call: Cache MISS, computes transparent asset
    const firstResult = await getOrCreateTransparentMascotAsset(repository, mascot.id, "idle.png");
    expect(firstResult.cached).toBe(false);
    expect(mattingSpy).toHaveBeenCalledTimes(1);

    const fileStat = await stat(firstResult.absolutePath);
    expect(fileStat.isFile()).toBe(true);
    expect(fileStat.size).toBeGreaterThan(0);
    expect(firstResult.meta.source_filename).toBe("idle.png");
    expect(firstResult.meta.source_size).toBe(TINY_PNG.length);

    // Verify RepositoryService binding works
    const boundLookup = await repository.getTransparentMascotAssetFile(mascot.id, "idle.png");
    expect(boundLookup.absolutePath).toBe(firstResult.absolutePath);

    // Second call: Cache HIT, skips removeImageBackground
    mattingSpy.mockClear();
    const secondResult = await getOrCreateTransparentMascotAsset(repository, mascot.id, "idle.png");
    expect(secondResult.cached).toBe(true);
    expect(secondResult.absolutePath).toBe(firstResult.absolutePath);
    expect(mattingSpy).not.toHaveBeenCalled();
  });

  it("invalidates transparent cache when source asset is updated via saveMascotAsset", async () => {
    const mascot = await repository.saveMascot({ name: "Buddy" });
    await repository.saveMascotAsset(mascot.id, "wave.png", TINY_PNG);

    const first = await getOrCreateTransparentMascotAsset(repository, mascot.id, "wave.png");
    expect(first.cached).toBe(false);

    // Update asset with modified content
    const updatedContent = new Uint8Array([...TINY_PNG, 42]);
    await repository.saveMascotAsset(mascot.id, "wave.png", updatedContent);

    const mattingSpy = vi.spyOn(imageMatting, "removeImageBackground");
    const second = await getOrCreateTransparentMascotAsset(repository, mascot.id, "wave.png");
    expect(second.cached).toBe(false);
    expect(second.meta.source_size).toBe(updatedContent.length);
    expect(mattingSpy).toHaveBeenCalledTimes(1);
  });

  it("detects source asset file modification and recomputes transparent sprite", async () => {
    const mascot = await repository.saveMascot({ name: "Buddy" });
    await repository.saveMascotAsset(mascot.id, "jump.png", TINY_PNG);

    const initial = await getOrCreateTransparentMascotAsset(repository, mascot.id, "jump.png");
    expect(initial.cached).toBe(false);

    // Modify the source file directly on disk
    const sourceAsset = await repository.getMascotAssetFile(mascot.id, "jump.png");
    const mutatedBytes = new Uint8Array([...TINY_PNG, 1, 2, 3]);
    await writeFile(sourceAsset.absolutePath, mutatedBytes);

    const mattingSpy = vi.spyOn(imageMatting, "removeImageBackground");
    const recomputed = await getOrCreateTransparentMascotAsset(repository, mascot.id, "jump.png");
    expect(recomputed.cached).toBe(false);
    expect(recomputed.meta.source_size).toBe(mutatedBytes.length);
    expect(mattingSpy).toHaveBeenCalledTimes(1);
  });

  it("cleans up cached transparent assets when mascot asset is deleted", async () => {
    const mascot = await repository.saveMascot({ name: "Buddy" });
    await repository.saveMascotAsset(mascot.id, "dance.png", TINY_PNG);

    const result = await getOrCreateTransparentMascotAsset(repository, mascot.id, "dance.png");
    expect(await stat(result.absolutePath)).toBeDefined();

    await repository.deleteMascotAssetFile(mascot.id, "dance.png");

    await expect(repository.getTransparentMascotAssetFile(mascot.id, "dance.png")).rejects.toThrow();
    await expect(getOrCreateTransparentMascotAsset(repository, mascot.id, "dance.png")).rejects.toThrow();
  });

  it("cleans up transparent directory when mascot is deleted", async () => {
    const mascot = await repository.saveMascot({ name: "Buddy" });
    await repository.saveMascotAsset(mascot.id, "pose.png", TINY_PNG);

    await getOrCreateTransparentMascotAsset(repository, mascot.id, "pose.png");
    const { transparentDir } = getTransparentMascotCachePaths(repository.roots.mascots, mascot.id, "pose.png");

    expect((await stat(transparentDir)).isDirectory()).toBe(true);

    await repository.deleteMascot(mascot.id);

    await expect(stat(transparentDir)).rejects.toThrow();
  });

  it("deduplicates concurrent in-flight matting requests for the same sprite", async () => {
    const mascot = await repository.saveMascot({ name: "Buddy" });
    await repository.saveMascotAsset(mascot.id, "spin.png", TINY_PNG);

    const mattingSpy = vi.spyOn(imageMatting, "removeImageBackground");

    const [res1, res2, res3] = await Promise.all([
      getOrCreateTransparentMascotAsset(repository, mascot.id, "spin.png"),
      getOrCreateTransparentMascotAsset(repository, mascot.id, "spin.png"),
      getOrCreateTransparentMascotAsset(repository, mascot.id, "spin.png"),
    ]);

    expect(mattingSpy).toHaveBeenCalledTimes(1);
    expect(res1.absolutePath).toBe(res2.absolutePath);
    expect(res2.absolutePath).toBe(res3.absolutePath);
  });

  it("prepareLocalizedMascot utilizes transparent cache and copies files seamlessly", async () => {
    const mascot = await repository.saveMascot({ name: "Local Mascot" });
    await repository.saveMascotAsset(mascot.id, "master.png", TINY_PNG);
    await repository.saveMascotAsset(mascot.id, "action_idle.png", TINY_PNG);

    const updatedMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      master_image_url: `/api/mascots/${mascot.id}/assets/master.png`,
      actions: {
        ...mascot.actions,
        idle: {
          action: "idle",
          sprite_url: `/api/mascots/${mascot.id}/assets/action_idle.png`,
          preview_url: `/api/mascots/${mascot.id}/assets/action_idle.png`,
        },
      },
    };
    await repository.saveMascot(updatedMascot);

    const channel: Channel = {
      channel_id: "ch_test",
      channel_name: "Test Channel",
      slug: "test-channel",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot1 = path.join(tempDir, "render_1");
    const mattingSpy = vi.spyOn(imageMatting, "removeImageBackground");

    // First render pass: populates cache
    const prepared1 = await prepareLocalizedMascot(channel, repository, renderRoot1);
    expect(prepared1).not.toBeNull();
    expect(prepared1?.master_image_url).toBe("./mascot-assets/master.png");
    expect(prepared1?.actions.idle?.sprite_url).toBe("./mascot-assets/action_idle.png");

    const masterStat1 = await stat(path.join(renderRoot1, "mascot-assets", "master.png"));
    expect(masterStat1.isFile()).toBe(true);
    expect(mattingSpy).toHaveBeenCalledTimes(2);

    // Second render pass: cache HIT, 0 matting calls, fast copyFile!
    mattingSpy.mockClear();
    const renderRoot2 = path.join(tempDir, "render_2");
    const prepared2 = await prepareLocalizedMascot(channel, repository, renderRoot2);

    expect(prepared2).not.toBeNull();
    expect(mattingSpy).not.toHaveBeenCalled();

    const masterStat2 = await stat(path.join(renderRoot2, "mascot-assets", "master.png"));
    expect(masterStat2.isFile()).toBe(true);
  });
});
