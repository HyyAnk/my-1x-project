import { mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retentionFixture } from "./storageRetention.fixture.js";
import { planAttemptRetention } from "../../src/quiz/mascot/videoAnimation/storage/attemptRetentionPlan.js";
import { createCompletedAttemptCleanup } from "../../src/quiz/mascot/videoAnimation/storage/completedAttemptCleanup.js";
import { auditMascotStorage } from "../../src/quiz/mascot/videoAnimation/storage/storageAudit.js";
import { inventoryFrames, removeInventoriedFrames } from "../../src/quiz/mascot/videoAnimation/storage/safeFrameFiles.js";

describe("Mascot storage retention", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "mascot-retention-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const probe = {
    probeVideoMetadata: vi.fn(async () => ({
      width: 8,
      height: 8,
      durationMs: 125,
      fps: 8,
      codec: "vp9",
      format: "webm",
      fileSizeBytes: 5,
    })),
  };
  const logger = () => ({ ok: vi.fn(), warn: vi.fn() });
  const verify = async () => {};

  it("stores only one canonical upload with unchanged bytes", async () => {
    const { storage, directory } = await retentionFixture(root);
    const stored = await storage.saveAttemptSourceVideo("owl", "classic", "thinking", 1, 1, "01.mp4", Buffer.from("new source"));
    expect(stored.filePath).toBe(path.join(directory, "source.mp4"));
    expect(await readFile(stored.filePath, "utf8")).toBe("new source");
    expect(await readdir(directory)).not.toContain("01.mp4");
  });

  it("audits legacy frames without changing files", async () => {
    const { directory } = await retentionFixture(root, true);
    const report = await auditMascotStorage(root);
    expect(report.skipped).toEqual([]);
    expect(report.attempts).toHaveLength(1);
    expect(report.potentialSourceBytes).toBe(5);
    expect(report.protectedMattedBytes).toBe(5);
    expect(await readFile(path.join(directory, "frames/matted/frame_001.png"), "utf8")).toBe("frame");
  });

  it("cleans compact frames, preserves all durable artifacts and is idempotent", async () => {
    const fixture = await retentionFixture(root);
    const log = logger();
    const cleanup = createCompletedAttemptCleanup(fixture.storage, probe, log, verify);
    await cleanup(fixture.job);
    await cleanup(fixture.job);
    expect(log.warn).not.toHaveBeenCalled();
    expect(await readdir(path.join(fixture.directory, "frames/source"))).toEqual([]);
    expect(await readdir(path.join(fixture.directory, "frames/matted"))).toEqual([]);
    expect(await readdir(fixture.directory)).toEqual(
      expect.arrayContaining(["source.mp4", "atlas.png", "preview.webp", "manifest.json", "attempt.json", "video_transparent.webm"]),
    );
  });

  it("never removes legacy matted frames", async () => {
    const f = await retentionFixture(root, true);
    await createCompletedAttemptCleanup(f.storage, probe, logger(), verify)(f.job);
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual([]);
    expect(await readdir(path.join(f.directory, "frames/matted"))).toEqual(["frame_001.png"]);
  });

  it.each(["cancelled", "qa_failed", "processing"] as const)("preserves %s attempts", async (status) => {
    const f = await retentionFixture(root);
    await createCompletedAttemptCleanup(f.storage, probe, logger(), verify)({ ...f.job, status });
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual(["frame_001.png"]);
  });

  it("preserves frames when image verification fails and reports a warning", async () => {
    const f = await retentionFixture(root);
    const log = logger();
    await writeFile(path.join(f.directory, "atlas.png"), "corrupt");
    await createCompletedAttemptCleanup(f.storage, probe, log, verify)(f.job);
    expect(log.warn).toHaveBeenCalledOnce();
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual(["frame_001.png"]);
  });

  it("fails closed on missing sources and unexpected frame files", async () => {
    const f = await retentionFixture(root);
    await writeFile(path.join(f.directory, "frames/source/notes.txt"), "keep");
    await expect(planAttemptRetention(root, f.directory)).rejects.toThrow("Unexpected frame entry");
    await unlink(path.join(f.directory, "source.mp4"));
    await expect(planAttemptRetention(root, f.directory)).rejects.toThrow();
  });

  it("refuses frames modified after inventory", async () => {
    const f = await retentionFixture(root);
    const inventory = await inventoryFrames(root, path.join(f.directory, "frames/source"));
    await writeFile(inventory.files[0].path, "changed frame");
    await expect(removeInventoriedFrames(root, inventory)).rejects.toThrow("changed");
  });

  it("protects frames when a video probe fails", async () => {
    const f = await retentionFixture(root);
    const log = logger();
    const unavailable = { probeVideoMetadata: vi.fn().mockRejectedValue(new Error("Video decoding unavailable")) };
    await createCompletedAttemptCleanup(f.storage, unavailable, log)(f.job);
    expect(log.warn).toHaveBeenCalledOnce();
    expect(await readdir(path.join(f.directory, "frames/matted"))).toEqual(["frame_001.png"]);
  });

  it("reports incomplete attempts without assuming their frames are disposable", async () => {
    const f = await retentionFixture(root);
    await writeFile(
      path.join(f.directory, "attempt.json"),
      JSON.stringify({ ...f.job, job_id: f.job.id, status: "processing", progress: 60 }),
    );
    const report = await auditMascotStorage(root);
    expect(report.attempts).toEqual([]);
    expect(report.skipped[0].reason).toBe("Attempt is not complete");
    expect(await readdir(path.join(f.directory, "frames/source"))).toEqual(["frame_001.png"]);
  });

  it("supports video-only output without requiring a nonexistent atlas", async () => {
    const f = await retentionFixture(root);
    const { atlas_url: _atlas, ...videoOnly } = f.revision;
    await writeFile(path.join(f.slot, "revisions/rev_1.json"), JSON.stringify(videoOnly));
    await unlink(path.join(f.directory, "atlas.png"));
    const log = logger();
    await createCompletedAttemptCleanup(f.storage, probe, log, verify)(f.job);
    expect(log.warn).not.toHaveBeenCalled();
    expect(await readdir(path.join(f.directory, "frames/matted"))).toEqual([]);
  });

  it("refuses junctions even when their destination remains inside the root", async () => {
    const f = await retentionFixture(root);
    const source = path.join(f.directory, "frames/source");
    await rm(source, { recursive: true });
    await symlink(path.join(f.directory, "frames/matted"), source, "junction");
    await expect(planAttemptRetention(root, f.directory)).rejects.toThrow("Linked retention path");
  });

  it("retains frames when full decoding fails despite valid probe metadata", async () => {
    const f = await retentionFixture(root);
    const log = logger();
    await createCompletedAttemptCleanup(f.storage, probe, log, async () => {
      throw new Error("Truncated video");
    })(f.job);
    expect(log.warn).toHaveBeenCalledOnce();
    expect(await readdir(path.join(f.directory, "frames/source"))).toHaveLength(1);
    expect(await readdir(path.join(f.directory, "frames/matted"))).toHaveLength(1);
  });
});
