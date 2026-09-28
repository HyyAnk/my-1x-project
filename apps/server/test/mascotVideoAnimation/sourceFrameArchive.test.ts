import { mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retentionFixture } from "./storageRetention.fixture.js";
import { archiveSourceFrames } from "../../src/quiz/mascot/videoAnimation/storage/sourceFrameArchive.js";
import { restoreSourceFrames } from "../../src/quiz/mascot/videoAnimation/storage/restoreSourceFrames.js";
import { acquireStorageMaintenanceLease } from "../../src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";

describe("Recoverable source frame archive", () => {
  let temp: string;
  let root: string;
  let archiveRoot: string;
  beforeEach(async () => {
    temp = await mkdtemp(path.join(os.tmpdir(), "source-archive-"));
    root = path.join(temp, "library");
    archiveRoot = path.join(root, "maintenance", "archive");
    await mkdir(root);
    await mkdir(archiveRoot, { recursive: true });
  });
  afterEach(async () => {
    await rm(temp, { recursive: true, force: true, maxRetries: 5 });
  });

  it("archives only source frames and restores without removing backup", async () => {
    const f = await retentionFixture(root, true);
    const verifyArtifacts = vi.fn(async () => {});
    const result = await archiveSourceFrames({ root, attempt: f.directory, archiveRoot, verifyArtifacts });
    expect(verifyArtifacts).toHaveBeenCalledOnce();
    expect(result.bytes).toBe(5);
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual([]);
    expect(await readdir(path.join(f.directory, "frames/matted"))).toEqual(["frame_001.png"]);
    expect(await readFile(path.join(result.archive, "originals/source.mp4"), "utf8")).toBe("source");
    expect(await restoreSourceFrames(root, result.archive)).toEqual({ restored: 1, skipped: 0 });
    expect(await restoreSourceFrames(root, result.archive)).toEqual({ restored: 0, skipped: 1 });
    expect(await readFile(path.join(result.archive, "frames/frame_001.png"), "utf8")).toBe("frame");
  });

  it("does not change files if media verification fails", async () => {
    const f = await retentionFixture(root);
    await expect(
      archiveSourceFrames({
        root,
        attempt: f.directory,
        archiveRoot,
        verifyArtifacts: async () => {
          throw new Error("corrupt video");
        },
      }),
    ).rejects.toThrow("corrupt");
    expect(await readdir(archiveRoot)).toEqual([]);
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual(["frame_001.png"]);
  });

  it("retains originals and usable backup if interrupted after copying", async () => {
    const f = await retentionFixture(root);
    await expect(
      archiveSourceFrames({
        root,
        attempt: f.directory,
        archiveRoot,
        verifyArtifacts: async () => {},
        progress: () => {
          throw new Error("interrupted");
        },
      }),
    ).rejects.toThrow("interrupted");
    const archive = path.join(archiveRoot, (await readdir(archiveRoot))[0]);
    expect(await restoreSourceFrames(root, archive)).toEqual({ restored: 0, skipped: 1 });
    await unlink(path.join(f.directory, "frames/source/frame_001.png"));
    expect(await restoreSourceFrames(root, archive)).toEqual({ restored: 1, skipped: 0 });
  });

  it("never overwrites a changed source during restore", async () => {
    const f = await retentionFixture(root);
    const { archive } = await archiveSourceFrames({ root, attempt: f.directory, archiveRoot, verifyArtifacts: async () => {} });
    await writeFile(path.join(f.directory, "frames/source/frame_001.png"), "new user file");
    await expect(restoreSourceFrames(root, archive)).rejects.toThrow("Restore conflict");
    expect(await readFile(path.join(f.directory, "frames/source/frame_001.png"), "utf8")).toBe("new user file");
  });

  it("rejects corrupt archive files before restoring", async () => {
    const f = await retentionFixture(root);
    const { archive } = await archiveSourceFrames({ root, attempt: f.directory, archiveRoot, verifyArtifacts: async () => {} });
    await writeFile(path.join(archive, "frames/frame_001.png"), "corrupt");
    await expect(restoreSourceFrames(root, archive)).rejects.toThrow("checksum");
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual([]);
  });

  it("rejects a linked archive destination", async () => {
    const f = await retentionFixture(root);
    const link = path.join(temp, "linked");
    await symlink(archiveRoot, link, "junction");
    await expect(archiveSourceFrames({ root, attempt: f.directory, archiveRoot: link, verifyArtifacts: async () => {} })).rejects.toThrow(
      "Linked",
    );
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual(["frame_001.png"]);
  });

  it("prevents a second maintenance or production lease", () => {
    const release = acquireStorageMaintenanceLease(root);
    try {
      expect(() => acquireStorageMaintenanceLease(root)).toThrow("busy");
    } finally {
      release();
    }
    acquireStorageMaintenanceLease(root)();
  });

  it("refuses archives outside centralized maintenance storage", async () => {
    const f = await retentionFixture(root);
    const external = path.join(temp, "external");
    await mkdir(external);
    await expect(
      archiveSourceFrames({ root, attempt: f.directory, archiveRoot: external, verifyArtifacts: async () => {} }),
    ).rejects.toThrow("off-volume archives are disabled");
    expect(await readdir(path.join(f.directory, "frames/source"))).toHaveLength(1);
  });
});
