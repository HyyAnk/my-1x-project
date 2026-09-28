import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { retentionFixture } from "./storageRetention.fixture.js";
import { archiveSourceFrames } from "../../src/quiz/mascot/videoAnimation/storage/sourceFrameArchive.js";
import { planRedundantArchive } from "../../src/quiz/mascot/videoAnimation/storage/redundantArchivePlan.js";
import { purgeRedundantArchive } from "../../src/quiz/mascot/videoAnimation/storage/purgeRedundantArchive.js";
import { pruneCompletedIntermediates } from "../../src/quiz/mascot/videoAnimation/storage/pruneCompletedIntermediates.js";

describe("Permanent intermediate retention", () => {
  let temp: string;
  let root: string;
  let archives: string;
  const verify = async () => {};
  beforeEach(async () => {
    temp = await mkdtemp(path.join(os.tmpdir(), "permanent-retention-"));
    root = path.join(temp, "library");
    archives = path.join(root, "maintenance", "archives");
    await mkdir(root);
    await mkdir(archives, { recursive: true });
  });
  afterEach(async () => {
    await rm(temp, { recursive: true, force: true, maxRetries: 5 });
  });

  async function archived() {
    const fixture = await retentionFixture(root, true);
    const result = await archiveSourceFrames({ root, attempt: fixture.directory, archiveRoot: archives, verifyArtifacts: verify });
    return { ...fixture, ...result };
  }

  it("reclaims actual archived bytes without moving or deleting central media", async () => {
    const f = await archived();
    expect((await planRedundantArchive(root, f.archive)).bytes).toBe(11);
    expect(await purgeRedundantArchive(root, f.archive, verify)).toEqual({ files: 2, bytes: 11 });
    expect(await readdir(path.join(f.archive, "frames"))).toEqual([]);
    expect(await readFile(path.join(f.directory, "source.mp4"), "utf8")).toBe("source");
    expect(await readFile(path.join(f.directory, "frames/matted/frame_001.png"), "utf8")).toBe("frame");
    expect(await purgeRedundantArchive(root, f.archive, verify)).toEqual({ files: 0, bytes: 0 });
  });

  it("preserves archive if central source changed", async () => {
    const f = await archived();
    await writeFile(path.join(f.directory, "source.mp4"), "changed");
    await expect(purgeRedundantArchive(root, f.archive, verify)).rejects.toThrow("differs");
    expect(await readdir(path.join(f.archive, "frames"))).toHaveLength(1);
  });

  it("preserves archive if packaged outputs fail verification", async () => {
    const f = await archived();
    await expect(
      purgeRedundantArchive(root, f.archive, async () => {
        throw new Error("corrupt output");
      }),
    ).rejects.toThrow("corrupt");
    expect(await readdir(path.join(f.archive, "frames"))).toHaveLength(1);
  });

  it("rejects unknown files and incomplete archives", async () => {
    const f = await archived();
    const unexpected = path.join(f.archive, "frames/keep.txt");
    await writeFile(unexpected, "keep");
    await expect(planRedundantArchive(root, f.archive)).rejects.toThrow("Unexpected");
    await unlink(unexpected);
    await unlink(path.join(f.archive, "completed.json"));
    await expect(planRedundantArchive(root, f.archive)).rejects.toThrow();
  });

  it("rejects incomplete frame sets without a purge journal", async () => {
    const f = await archived();
    await unlink(path.join(f.archive, "frames/frame_001.png"));
    await expect(planRedundantArchive(root, f.archive)).rejects.toThrow("without a purge journal");
  });

  it("directly removes compact intermediates without creating archives", async () => {
    const f = await retentionFixture(root);
    expect(await pruneCompletedIntermediates(root, f.directory, verify)).toEqual({ files: 2, bytes: 10 });
    expect(await readdir(archives)).toEqual([]);
    expect(await pruneCompletedIntermediates(root, f.directory, verify)).toEqual({ files: 0, bytes: 0 });
  });

  it("preserves legacy frame references and leaves data intact on verification failure", async () => {
    const f = await retentionFixture(root, true);
    await expect(
      pruneCompletedIntermediates(root, f.directory, async () => {
        throw new Error("decode failed");
      }),
    ).rejects.toThrow();
    expect(await readdir(path.join(f.directory, "frames/source"))).toHaveLength(1);
    expect(await pruneCompletedIntermediates(root, f.directory, verify)).toEqual({ files: 1, bytes: 5 });
    expect(await readdir(path.join(f.directory, "frames/matted"))).toHaveLength(1);
  });
});
