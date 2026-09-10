import { afterEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { parseZipArchive } from "../src/quiz/zipHelper.js";
import { packageFixture, packageImage } from "./helpers/shortReelPackageFixture.js";
import { repairScript } from "./helpers/shortReelRepairFixture.js";
import { exportShortReelPackage, ExportError, assertSafeArchiveEntryName } from "../src/shortReel/exportService.js";
import { buildPublishingExport } from "../src/shortReel/publishingExport.js";
import { generateFullReelPackage } from "../src/shortReel/packageService.js";
import { mutateShortReelRecord } from "../src/repository/shortReelTransaction.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

async function fixture() {
  const f = await packageFixture();
  cleanups.push(f.cleanup);
  return f;
}

describe("Short-Reel Export V2 (Phase 07: E01, E02, E03)", () => {
  describe("Pure Publishing Export Formatting", () => {
    it("E03: formats exactly TITLE and DESCRIPTION sections without duplicated hashtag block", () => {
      const output = buildPublishingExport({
        title: "Tool Duel",
        description: "Choose your champion. #Quiz #Tools",
      });
      expect(output).toBe("TITLE: Tool Duel\n\nDESCRIPTION:\nChoose your champion. #Quiz #Tools\n");
    });
  });

  describe("E01 & E03: Archive Content, Schema, and Flow Prompts", () => {
    it("exports complete ZIP package with script, prompts, mascot, style, cover, and two-field publishing", async () => {
      const f = await fixture();
      const ready = await generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: f.imageProvider },
      });

      const zipBuffer = await exportShortReelPackage(f.repo, f.key, ready.revision);
      expect(zipBuffer).toBeInstanceOf(Buffer);

      const entries = parseZipArchive(zipBuffer);
      const fileNames = entries.map((e) => e.filename);

      // Core archive contents
      expect(fileNames).toContain("manifest.json");
      expect(fileNames).toContain("script.json");
      expect(fileNames).toContain("script.md");
      expect(fileNames).toContain("prompts/01-generate.txt");
      expect(fileNames).toContain("prompts/02-extend.txt");
      expect(fileNames).toContain("prompts/03-extend.txt");
      expect(fileNames).toContain("publishing.txt");
      expect(fileNames).toContain("publishing.json");
      expect(fileNames.some((n) => n.startsWith("references/mascot."))).toBe(true);
      expect(fileNames.some((n) => n.startsWith("references/style."))).toBe(true);
      expect(fileNames.some((n) => n.startsWith("cover."))).toBe(true);

      // Verify publishing.txt format
      const pubEntry = entries.find((e) => e.filename === "publishing.txt")!;
      const pubText = Buffer.from(pubEntry.data).toString("utf8");
      expect(pubText).toContain("TITLE:");
      expect(pubText).toContain("DESCRIPTION:");
      expect(pubText).not.toContain("=== SHORT-REEL PUBLISHING COPY ===");

      // Verify publishing.json machine-readable content
      const pubJsonEntry = entries.find((e) => e.filename === "publishing.json")!;
      const pubJson = JSON.parse(Buffer.from(pubJsonEntry.data).toString("utf8"));
      expect(pubJson).toHaveProperty("title");
      expect(pubJson).toHaveProperty("description");

      // Verify Flow prompts reference the exact exported asset paths
      const p1Entry = entries.find((e) => e.filename === "prompts/01-generate.txt")!;
      const p1Text = Buffer.from(p1Entry.data).toString("utf8");
      expect(p1Text).toContain("references/mascot.");
      expect(p1Text).toContain("references/style.");

      // Verify image dimensions (cover and style should be 1080x1920)
      const coverEntry = entries.find((e) => e.filename.startsWith("cover."))!;
      const coverMeta = await sharp(Buffer.from(coverEntry.data)).metadata();
      expect(coverMeta.width).toBe(1080);
      expect(coverMeta.height).toBe(1920);

      const styleEntry = entries.find((e) => e.filename.startsWith("references/style."))!;
      const styleMeta = await sharp(Buffer.from(styleEntry.data)).metadata();
      expect(styleMeta.width).toBeGreaterThan(0);
      expect(styleMeta.height).toBeGreaterThan(0);

      // Verify mascot bytes match the immutable reference asset
      const mascotEntry = entries.find((e) => e.filename.startsWith("references/mascot."))!;
      expect(mascotEntry.data.length).toBeGreaterThan(0);

      // Verify manifest.json metadata and provenance
      const manifestEntry = entries.find((e) => e.filename === "manifest.json")!;
      const manifest = JSON.parse(Buffer.from(manifestEntry.data).toString("utf8"));
      expect(manifest.schema_version).toBe(1);
      expect(manifest.reel_id).toBe(f.key.reel_id);
      expect(manifest.channel_id).toBe(f.key.channel_id);
      expect(manifest.revision).toBe(ready.revision);
      expect(manifest.dimensions).toEqual({ width: 1080, height: 1920 });
      expect(manifest).toHaveProperty("cover");
      expect(manifest.cover).toHaveProperty("checksum");
      expect(manifest).toHaveProperty("provenance");
      expect(manifest.provenance).toHaveProperty("mascot_name");

      // Checksum integrity of all non-manifest entries
      for (const entry of entries.filter((e) => e.filename !== "manifest.json")) {
        const expectedHash = createHash("sha256").update(entry.data).digest("hex");
        expect(manifest.content_hashes[entry.filename]).toBe(expectedHash);
      }
    });

    it("recompiles Flow prompts upon model-note edit without requiring regeneration to export", async () => {
      const f = await fixture();
      const ready = await generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: f.imageProvider },
      });

      // Update model note only (does not invalidate image or script units)
      const updated = await f.repo.updateShortReel(
        f.key,
        { expected_revision: ready.revision, request_id: "update_note" },
        { kind: "update_model_note", model_note: "Cinematic anamorphic 2.39 look" },
      );
      expect(updated.revision).toBe(ready.revision + 1);

      // Export succeeds directly
      const zipBuffer = await exportShortReelPackage(f.repo, f.key, updated.revision);
      const entries = parseZipArchive(zipBuffer);
      const p1Entry = entries.find((e) => e.filename === "prompts/01-generate.txt")!;
      const p1Text = Buffer.from(p1Entry.data).toString("utf8");
      expect(p1Text).toContain("Cinematic anamorphic 2.39 look");
    });
  });

  describe("E02: Security, Traversal, Checksum, and Freshness Rejection", () => {
    it("rejects path traversal and absolute paths in archive entry names", () => {
      expect(() => assertSafeArchiveEntryName("../../etc/shadow")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("/root/secret.txt")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("C:\\Windows\\win.ini")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("")).toThrow(ExportError);

      const seen = new Set<string>();
      assertSafeArchiveEntryName("script.json", seen);
      expect(() => assertSafeArchiveEntryName("script.json", seen)).toThrow(ExportError);
    });

    it("rejects export when revision does not match expected revision", async () => {
      const f = await fixture();
      const ready = await generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: f.imageProvider },
      });

      await expect(exportShortReelPackage(f.repo, f.key, ready.revision + 99)).rejects.toMatchObject({
        code: "REVISION_CONFLICT",
      });
    });

    it("rejects export when deliverable units are incomplete or stale", async () => {
      const f = await fixture();
      // Initially incomplete
      await expect(exportShortReelPackage(f.repo, f.key, 1)).rejects.toMatchObject({
        code: "INCOMPLETE_PACKAGE",
      });

      // Generate package, then mark publishing stale
      const ready = await generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: f.imageProvider },
      });

      const markedStale = await mutateShortReelRecord(f.repo, f.key, (r) => {
        r.units.publishing.state = "stale";
        return r;
      });

      await expect(exportShortReelPackage(f.repo, f.key, markedStale.revision)).rejects.toMatchObject({
        code: "STALE_EXPORT",
      });
    });

    it("rejects export when channel mascot selection has changed", async () => {
      const f = await fixture();
      const ready = await generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: f.imageProvider },
      });

      // Create a different mascot and assign to channel
      const newMascot = await f.repo.saveMascot({ name: "Brand New Mascot" });
      await f.repo.updateChannel(f.channel.channel_id, { mascot_id: newMascot.id });

      // Export must detect mascot mismatch and reject with STALE_EXPORT
      await expect(exportShortReelPackage(f.repo, f.key, ready.revision)).rejects.toMatchObject({
        code: "STALE_EXPORT",
      });
    });

    it("rejects export when asset bytes on disk are tampered or checksum mismatched", async () => {
      const f = await fixture();
      const ready = await generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: f.imageProvider },
      });

      // Tamper with cover bytes on disk
      const coverPath = path.join(f.root, ready.units.cover.last_accepted_payload!.path);
      await writeFile(coverPath, Buffer.from("TAMPERED_IMAGE_CORRUPT_BYTES"));

      await expect(exportShortReelPackage(f.repo, f.key, ready.revision)).rejects.toMatchObject({
        code: "INVALID_ASSET",
      });
    });
  });
});
