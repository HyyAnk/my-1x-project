import { afterEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { parseZipArchive } from "../src/quiz/zipHelper.js";
import { BankQuestionSchema, createSourceSnapshot } from "@studio/shared";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { repairFixture, repairScript } from "./helpers/shortReelRepairFixture.js";
import { resolveReelReferences, ReferenceError, validateImageBuffer } from "../src/shortReel/referenceResolver.js";
import { generateReelCoverImage, CoverGenerationError } from "../src/shortReel/thumbnailAdapter.js";
import { generateReelPublishing, parsePublishingJson } from "../src/shortReel/publishingService.js";
import { exportShortReelPackage, ExportError, assertSafeArchiveEntryName } from "../src/shortReel/exportService.js";
import {
  generateFullReelPackage,
  generateReelCover,
  generateReelScriptUnit,
  generateReelSegmentUnit,
  PackageServiceError,
} from "../src/shortReel/packageService.js";
import { acceptReelUnitResult, beginReelUnitAttempt } from "../src/shortReel/revisionPolicy.js";
import { mutateShortReelRecord } from "../src/repository/shortReelTransaction.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) {
    await cleanup();
  }
});

async function createTestImageBuffer(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
  format: "png" | "jpeg" | "webp" = "png",
): Promise<Buffer> {
  const instance = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  });
  if (format === "jpeg") return instance.jpeg().toBuffer();
  if (format === "webp") return instance.webp().toBuffer();
  return instance.png().toBuffer();
}

async function testCoverOptions(fix: Awaited<ReturnType<typeof repairFixture>>) {
  const file = path.join(fix.root, "provider-cover.png");
  await writeFile(file, await packageImage());
  return { imageProvider: { generateReference: () => Promise.resolve({ asset_path: file }) } };
}

describe("Phase 05: References, Cover And Export (PK-01 - PK-06)", () => {
  describe("PK-01: Reference image resolution and validation", () => {
    it("rejects missing mascot/style with explicit error and does not substitute unrelated image", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Channel has no mascot assigned
      await expect(resolveReelReferences(fix.repo, fix.key)).rejects.toThrow(ReferenceError);

      await expect(resolveReelReferences(fix.repo, fix.key)).rejects.toMatchObject({
        code: "MISSING_REFERENCE",
      });
    });

    it("rejects corrupt image files with invalid signature or decoding error", async () => {
      const corruptBuffer = Buffer.from("NOT_AN_IMAGE_FILE_DATA_CORRUPT_HEADER");
      await expect(validateImageBuffer(corruptBuffer, "mascot")).rejects.toThrow(ReferenceError);

      await expect(validateImageBuffer(corruptBuffer, "mascot")).rejects.toMatchObject({
        code: "CORRUPT_IMAGE",
      });
    });

    it("rejects animation atlas instead of single-frame reference", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Create a mascot with multi-frame sprite action (frames_count > 1) and no master image
      const mascot = await fix.repo.saveMascot({
        name: "Atlas Mascot",
        visual_style: "pixar_3d",
      });
      await fix.repo.updateChannel(fix.channel.channel_id, {
        mascot_id: mascot.id,
      });

      // Update mascot action to have frames_count: 8 (an animation atlas)
      const atlasBuffer = await createTestImageBuffer(2048, 256, { r: 100, g: 150, b: 200 });
      const assetUrl = await fix.repo.saveMascotAsset(mascot.id, "run_atlas.png", atlasBuffer);
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: null,
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: assetUrl,
            frames_count: 8,
            frame_width: 256,
            frame_height: 256,
            fps: 8,
            loop: true,
            offset_x: 0,
            offset_y: 0,
          },
        },
      });

      await expect(resolveReelReferences(fix.repo, fix.key)).rejects.toMatchObject({
        code: "ANIMATION_ATLAS_REJECTED",
      });
    });

    it("resolves valid single-frame mascot and style reference images and saves immutable copies", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const mascot = await fix.repo.saveMascot({
        name: "Hero Mascot",
        visual_style: "pixar_3d",
      });
      await fix.repo.updateChannel(fix.channel.channel_id, {
        mascot_id: mascot.id,
      });

      const mascotBytes = await createTestImageBuffer(512, 512, { r: 30, g: 144, b: 255 });
      const styleBytes = await createTestImageBuffer(600, 600, { r: 255, g: 99, b: 71 });

      const mascotAssetUrl = await fix.repo.saveMascotAsset(mascot.id, "hero_master.png", mascotBytes);
      const styleAssetUrl = await fix.repo.saveMascotAsset(mascot.id, "style_anchor.png", styleBytes);

      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mascotAssetUrl,
        styles: [
          {
            id: "style_core",
            name: "Core 3D Style",
            keyword: "3d",
            anchor_image_url: styleAssetUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "style_core",
      });

      const payload = await resolveReelReferences(fix.repo, fix.key);
      expect(payload.references).toHaveLength(2);

      const mascotRef = payload.references.find((r) => r.role === "mascot");
      const styleRef = payload.references.find((r) => r.role === "style");

      expect(mascotRef).toBeDefined();
      expect(mascotRef?.width).toBe(512);
      expect(mascotRef?.height).toBe(512);
      expect(mascotRef?.mime_type).toBe("image/png");
      expect(mascotRef?.checksum).toBeDefined();

      expect(styleRef).toBeDefined();
      expect(styleRef?.width).toBe(600);
      expect(styleRef?.height).toBe(600);
      expect(styleRef?.mime_type).toBe("image/png");
      expect(styleRef?.checksum).toBeDefined();
    });

    it("rejects client-supplied remote URLs and path traversal sequences", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      await expect(
        resolveReelReferences(fix.repo, fix.key, {
          mascotAssetPath: "https://evil.com/remote.png",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_REFERENCE_PATH",
      });

      await expect(
        resolveReelReferences(fix.repo, fix.key, {
          mascotAssetPath: "../../../etc/passwd",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_REFERENCE_PATH",
      });

      await expect(
        resolveReelReferences(fix.repo, fix.key, {
          mascotAssetPath: "file:///etc/shadow",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_REFERENCE_PATH",
      });

      await expect(
        resolveReelReferences(fix.repo, fix.key, {
          mascotAssetPath: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_REFERENCE_PATH",
      });
    });

    it("validates and accepts WebP reference images correctly", async () => {
      const webpBuffer = await createTestImageBuffer(400, 400, { r: 120, g: 130, b: 140 }, "webp");
      const info = await validateImageBuffer(webpBuffer, "mascot");
      expect(info.format).toBe("webp");
      expect(info.mimeType).toBe("image/webp");
      expect(info.width).toBe(400);
      expect(info.height).toBe(400);
    });

    it("rejects images with dimensions out of allowed bounds (<64px)", async () => {
      const tinyBuffer = await createTestImageBuffer(32, 32, { r: 10, g: 20, b: 30 });
      await expect(validateImageBuffer(tinyBuffer, "mascot")).rejects.toMatchObject({
        code: "DIMENSIONS_OUT_OF_BOUNDS",
      });
    });
  });

  describe("PK-02: True 1080x1920 Cover generation via thumbnail adapter", () => {
    it("produces true 1080x1920 cover with correct MIME and leaves references unchanged", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Setup valid mascot and style references first
      const mascot = await fix.repo.saveMascot({ name: "Cover Mascot" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });

      const mascotBytes = await createTestImageBuffer(512, 512, { r: 10, g: 20, b: 30 });
      const styleBytes = await createTestImageBuffer(512, 512, { r: 40, g: 50, b: 60 });
      const mUrl = await fix.repo.saveMascotAsset(mascot.id, "m.png", mascotBytes);
      const sUrl = await fix.repo.saveMascotAsset(mascot.id, "s.png", styleBytes);
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style 1",
            keyword: "style",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      const refsPayload = await resolveReelReferences(fix.repo, fix.key);
      await fix.repo.updateShortReel(
        fix.key,
        { expected_revision: 1, request_id: "req_ref" },
        {
          kind: "update_references",
          references: refsPayload,
        },
      );

      const coverPayload = await generateReelCoverImage(fix.repo, fix.key, await testCoverOptions(fix));
      expect(coverPayload.width).toBe(1080);
      expect(coverPayload.height).toBe(1920);
      expect(coverPayload.mime_type).toMatch(/^image\/(png|jpeg)$/);
      expect(coverPayload.checksum).toBeDefined();

      // Verify the generated cover file on disk actually decodes to 1080x1920
      const fullCoverPath = path.resolve(fix.repo.storageRoot, coverPayload.path);
      const meta = await sharp(fullCoverPath).metadata();
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(1920);

      // Verify original reference files were NOT mutated
      const recheckedRefs = await resolveReelReferences(fix.repo, fix.key);
      expect(recheckedRefs.references[0].checksum).toBe(refsPayload.references[0].checksum);
      expect(recheckedRefs.references[1].checksum).toBe(refsPayload.references[1].checksum);
    });

    it("handles landscape provider output by cropping to 1080x1920 without distortion", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const landscapeBuffer = await createTestImageBuffer(1920, 1080, { r: 70, g: 80, b: 90 });
      const tempPath = path.join(fix.root, "landscape_source.png");
      await writeFile(tempPath, landscapeBuffer);

      const mockProvider = {
        generateReference: () => Promise.resolve({ asset_path: tempPath }),
      };

      const cover = await generateReelCoverImage(fix.repo, fix.key, {
        imageProvider: mockProvider,
      });

      expect(cover.width).toBe(1080);
      expect(cover.height).toBe(1920);

      const fullCoverPath = path.resolve(fix.repo.storageRoot, cover.path);
      const meta = await sharp(fullCoverPath).metadata();
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(1920);
    });

    it("accepts decoded provider cover for long-title input without claiming typography fidelity", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Mutate reel with very long title, hook, and question
      const longTitle = "The Extraordinary Biology of Super-Organisms in the Deep Mariana Abyss";
      const longHook = "What happens when atmospheric pressure exceeds one thousand times that of sea level?";
      const longQuestion =
        "Which specialized deep-sea creature possesses extraordinary cellular adaptations that allow it to survive beyond eight thousand meters depth?";

      const longBankQ = BankQuestionSchema.parse({
        id: "bank-q-long-001",
        archetype_id: "deep_trivia",
        domain_id: "science",
        subtopic_id: "oceanography",
        language: "English",
        question: longQuestion,
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Mariana Snailfish", is_correct: true },
          { id: "B", text: "Anglerfish", is_correct: false },
          { id: "C", text: "Viperfish", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "The Mariana snailfish is the deepest-living fish discovered.",
      });
      const longSource = createSourceSnapshot(longBankQ);
      const current = await fix.repo.getShortReel(fix.key);
      await fix.repo.updateShortReel(
        fix.key,
        { expected_revision: current.revision, request_id: "req_replace_long" },
        {
          kind: "replace_source_question",
          source: longSource,
        },
      );

      await mutateShortReelRecord(fix.repo, fix.key, (record) => {
        record.topic.title = longTitle;
        record.topic.hook = longHook;
        return record;
      });

      const cover = await generateReelCoverImage(fix.repo, fix.key, await testCoverOptions(fix));
      expect(cover.width).toBe(1080);
      expect(cover.height).toBe(1920);

      const coverDiskPath = path.resolve(fix.repo.storageRoot, cover.path);
      const meta = await sharp(coverDiskPath).metadata();
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(1920);
    });

    it("rejects imageProvider returning unsafe path outside storage root", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const mockProvider = {
        generateReference: () => Promise.resolve({ asset_path: "../../outside_root_secret.png" }),
      };

      await expect(generateReelCoverImage(fix.repo, fix.key, { imageProvider: mockProvider })).rejects.toThrow(CoverGenerationError);
    });
  });

  describe("PK-03: Per-unit retry and failure isolation", () => {
    it("retains valid script/publishing when cover fails, and cover retry affects only cover", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Accept script unit
      const script = repairScript();
      await beginReelUnitAttempt(fix.repo, fix.key, "script", "op_script_1");
      const current1 = await fix.repo.getShortReel(fix.key);
      const scriptAttempt = current1.units.script.current_attempt!;
      const scriptRes = await acceptReelUnitResult(
        fix.repo,
        fix.key,
        "script",
        { operationId: "op_script_1", dependencyFingerprint: scriptAttempt.dependency_fingerprint },
        { script, compiled_prompts: null },
      );
      expect(scriptRes.accepted).toBe(true);

      // Accept publishing unit
      await beginReelUnitAttempt(fix.repo, fix.key, "publishing", "op_pub_1");
      const current2 = await fix.repo.getShortReel(fix.key);
      const pubAttempt = current2.units.publishing.current_attempt!;
      const pubPayload = await generateReelPublishing(current2, { allowBaselineFallback: true });
      const pubRes = await acceptReelUnitResult(
        fix.repo,
        fix.key,
        "publishing",
        { operationId: "op_pub_1", dependencyFingerprint: pubAttempt.dependency_fingerprint },
        pubPayload,
      );
      expect(pubRes.accepted).toBe(true);

      const savedScriptPayload = (await fix.repo.getShortReel(fix.key)).units.script.last_accepted_payload;
      const savedPubPayload = (await fix.repo.getShortReel(fix.key)).units.publishing.last_accepted_payload;

      // Fail cover attempt via package service
      await generateReelCover(fix.repo, fix.key, "op_cover_fail", {
        imageProvider: {
          generateReference: () => Promise.reject(new Error("Provider simulated failure")),
        },
      }).catch(() => {});

      const reelAfterFail = await fix.repo.getShortReel(fix.key);
      expect(reelAfterFail.units.cover.state).toBe("failed");
      // Script and publishing payloads remain byte-identical
      expect(reelAfterFail.units.script.last_accepted_payload).toEqual(savedScriptPayload);
      expect(reelAfterFail.units.publishing.last_accepted_payload).toEqual(savedPubPayload);
      expect(reelAfterFail.units.script.state).toBe("ready");
      expect(reelAfterFail.units.publishing.state).toBe("ready");

      // Now retry cover with success
      await generateReelCover(fix.repo, fix.key, "op_cover_retry", await testCoverOptions(fix));
      const reelAfterRetry = await fix.repo.getShortReel(fix.key);
      expect(reelAfterRetry.units.cover.state).toBe("ready");
      expect(reelAfterRetry.units.cover.last_accepted_payload).not.toBeNull();
      // Other payloads still preserved
      expect(reelAfterRetry.units.script.last_accepted_payload).toEqual(savedScriptPayload);
      expect(reelAfterRetry.units.publishing.last_accepted_payload).toEqual(savedPubPayload);
    });

    it("throws PackageServiceError when generateFullReelPackage is called with an invalid script", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Setup references
      const mascot = await fix.repo.saveMascot({ name: "Mascot" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });
      const mUrl = await fix.repo.saveMascotAsset(mascot.id, "m.png", await createTestImageBuffer(200, 200, { r: 1, g: 2, b: 3 }));
      const sUrl = await fix.repo.saveMascotAsset(mascot.id, "s.png", await createTestImageBuffer(200, 200, { r: 4, g: 5, b: 6 }));
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style",
            keyword: "kw",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      // Script with mismatched answer text
      const invalidScript = repairScript();
      invalidScript.segments[2].text_cues[0].text = "Wrong mismatched answer";

      await expect(generateFullReelPackage(fix.repo, fix.key, { script: invalidScript })).rejects.toThrow(PackageServiceError);
    });
  });

  describe("PK-04: ZIP export of consistent package snapshot", () => {
    it("builds ZIP from validated record with all 10 entries and manifest metadata", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Setup complete package
      const mascot = await fix.repo.saveMascot({ name: "Export Mascot" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });
      const mascotBytes = await createTestImageBuffer(512, 512, { r: 50, g: 60, b: 70 });
      const styleBytes = await createTestImageBuffer(512, 512, { r: 80, g: 90, b: 100 });
      const mUrl = await fix.repo.saveMascotAsset(mascot.id, "m.png", mascotBytes);
      const sUrl = await fix.repo.saveMascotAsset(mascot.id, "s.png", styleBytes);
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style",
            keyword: "kw",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      // Generate all units via package service
      await generateFullReelPackage(fix.repo, fix.key, {
        coverOptions: await testCoverOptions(fix),
        script: repairScript(),
      });

      const recordBeforeExport = await fix.repo.getShortReel(fix.key);
      expect(recordBeforeExport.units.references.state).toBe("ready");
      expect(recordBeforeExport.units.script.state).toBe("ready");
      expect(recordBeforeExport.units.cover.state).toBe("ready");
      expect(recordBeforeExport.units.publishing.state).toBe("ready");

      const zipBuffer = await exportShortReelPackage(fix.repo, fix.key, recordBeforeExport.revision);
      expect(zipBuffer).toBeInstanceOf(Buffer);

      const entries = parseZipArchive(zipBuffer);
      const filenames = entries.map((e) => e.filename);

      expect(filenames).toContain("manifest.json");
      expect(filenames).toContain("script.json");
      expect(filenames).toContain("script.md");
      expect(filenames).toContain("prompts/01-generate.txt");
      expect(filenames).toContain("prompts/02-extend.txt");
      expect(filenames).toContain("prompts/03-extend.txt");
      expect(filenames.some((f) => f.startsWith("references/mascot"))).toBe(true);
      expect(filenames.some((f) => f.startsWith("references/style"))).toBe(true);
      expect(filenames.some((f) => f.startsWith("cover"))).toBe(true);
      expect(filenames).toContain("publishing.txt");

      // Verify manifest contents
      const manifestEntry = entries.find((e) => e.filename === "manifest.json");
      expect(manifestEntry).toBeDefined();
      const manifest: unknown = JSON.parse(Buffer.from(manifestEntry!.data).toString("utf8"));
      expect(manifest).toMatchObject({
        schema_version: 1,
        reel_id: fix.reel.reel_id,
        channel_id: fix.channel.channel_id,
        dimensions: { width: 1080, height: 1920 },
        requested_durations: [8, 8, 8],
        total_duration: 24,
      });
      expect(manifest).toHaveProperty(["content_hashes", "script.json"]);
      expect(manifest).toHaveProperty(["content_hashes", "prompts/01-generate.txt"]);
    });

    it("rejects export when record has stale segments or incomplete units", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Incomplete package (nothing generated yet)
      await expect(exportShortReelPackage(fix.repo, fix.key, (await fix.repo.getShortReel(fix.key)).revision)).rejects.toThrow(ExportError);

      await expect(exportShortReelPackage(fix.repo, fix.key, (await fix.repo.getShortReel(fix.key)).revision)).rejects.toMatchObject({
        code: "INCOMPLETE_PACKAGE",
      });
    });

    it("rejects export when downstream segments are stale after segment 1 edit", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const mascot = await fix.repo.saveMascot({ name: "Export Mascot 2" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });
      const mUrl = await fix.repo.saveMascotAsset(mascot.id, "m.png", await createTestImageBuffer(512, 512, { r: 1, g: 2, b: 3 }));
      const sUrl = await fix.repo.saveMascotAsset(mascot.id, "s.png", await createTestImageBuffer(512, 512, { r: 4, g: 5, b: 6 }));
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style",
            keyword: "kw",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      const script = repairScript();
      await generateFullReelPackage(fix.repo, fix.key, { script, coverOptions: await testCoverOptions(fix) });

      // Invalidate segments 2 and 3 by updating segment 1
      const current = await fix.repo.getShortReel(fix.key);
      const modifiedSeg1 = { ...script.segments[0], narrative: "Updated premise narrative" };
      await fix.repo.updateShortReel(
        fix.key,
        { expected_revision: current.revision, request_id: "edit_seg_1" },
        {
          kind: "update_segment",
          segment_index: 1,
          segment: modifiedSeg1,
        },
      );

      const afterEdit = await fix.repo.getShortReel(fix.key);
      expect(afterEdit.stale_segments).toEqual([2, 3]);

      await expect(exportShortReelPackage(fix.repo, fix.key, (await fix.repo.getShortReel(fix.key)).revision)).rejects.toMatchObject({
        code: "STALE_EXPORT",
      });
    });

    it("exports WebP references with canonical .webp extensions in ZIP archive", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const mascot = await fix.repo.saveMascot({ name: "WebP Mascot" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });
      const mUrl = await fix.repo.saveMascotAsset(
        mascot.id,
        "m.webp",
        await createTestImageBuffer(400, 400, { r: 10, g: 20, b: 30 }, "webp"),
      );
      const sUrl = await fix.repo.saveMascotAsset(
        mascot.id,
        "s.webp",
        await createTestImageBuffer(400, 400, { r: 40, g: 50, b: 60 }, "webp"),
      );
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style",
            keyword: "kw",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      await generateFullReelPackage(fix.repo, fix.key, { script: repairScript(), coverOptions: await testCoverOptions(fix) });
      const zipBuffer = await exportShortReelPackage(fix.repo, fix.key, (await fix.repo.getShortReel(fix.key)).revision);
      const entries = parseZipArchive(zipBuffer);
      const filenames = entries.map((e) => e.filename);

      expect(filenames).toContain("references/mascot.webp");
      expect(filenames).toContain("references/style.webp");

      // Verify publishing.txt contains Title and Description
      const pubEntry = entries.find((e) => e.filename === "publishing.txt");
      expect(pubEntry).toBeDefined();
      const pubText = Buffer.from(pubEntry!.data).toString("utf8");
      expect(pubText).toContain("TITLE:");
      expect(pubText).toContain("DESCRIPTION:");
    });

    it("rejects export with STALE_EXPORT when a deliverable unit is marked stale", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const mascot = await fix.repo.saveMascot({ name: "Mascot" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });
      const mUrl = await fix.repo.saveMascotAsset(mascot.id, "m.png", await createTestImageBuffer(200, 200, { r: 1, g: 2, b: 3 }));
      const sUrl = await fix.repo.saveMascotAsset(mascot.id, "s.png", await createTestImageBuffer(200, 200, { r: 4, g: 5, b: 6 }));
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style",
            keyword: "kw",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      await generateFullReelPackage(fix.repo, fix.key, { script: repairScript(), coverOptions: await testCoverOptions(fix) });

      // Mark cover unit as stale
      await mutateShortReelRecord(fix.repo, fix.key, (record) => {
        record.units.cover.state = "stale";
        return record;
      });

      await expect(exportShortReelPackage(fix.repo, fix.key, (await fix.repo.getShortReel(fix.key)).revision)).rejects.toMatchObject({
        code: "STALE_EXPORT",
      });
    });
  });

  describe("PK-05: Archive security and path traversal protection", () => {
    it("rejects unsafe entry names, absolute paths, and duplicates", () => {
      expect(() => assertSafeArchiveEntryName("../secret.txt")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("/etc/passwd")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("C:\\Windows\\System32")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("..\\config.json")).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("")).toThrow(ExportError);

      // Safe names succeed
      expect(() => assertSafeArchiveEntryName("manifest.json")).not.toThrow();
      expect(() => assertSafeArchiveEntryName("prompts/01-generate.txt")).not.toThrow();
      expect(() => assertSafeArchiveEntryName("references/mascot.png")).not.toThrow();

      // Duplicate names rejected
      const seen = new Set<string>();
      assertSafeArchiveEntryName("manifest.json", seen);
      expect(() => assertSafeArchiveEntryName("manifest.json", seen)).toThrow(ExportError);
      expect(() => assertSafeArchiveEntryName("manifest.json", seen)).toThrow(/Duplicate archive entry name/);
    });
  });

  describe("Publishing Parser Robustness", () => {
    it("parses LLM output with title and description within bounds successfully", () => {
      const rawLlmResponse = `
\`\`\`json
{
  "title": "Why do deep sea creatures survive extreme ocean pressures?",
  "description": "A fascinating exploration into cellular adaptations at 8000m depths. #ocean #deepsea"
}
\`\`\`
      `;

      const parsed = parsePublishingJson(rawLlmResponse);
      expect(parsed).not.toBeNull();
      expect(parsed?.title).toContain("Why do deep sea creatures");
      expect(parsed?.description).toContain("A fascinating exploration");
    });
  });

  describe("PK-06: Export racing with record edits", () => {
    it("rejects export with REVISION_CONFLICT when expected revision does not match current revision", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      // Stale revision passed
      await expect(exportShortReelPackage(fix.repo, fix.key, 999)).rejects.toMatchObject({
        code: "REVISION_CONFLICT",
      });
    });
  });

  describe("Script Auto-Generation & Initial Draft Deadlock Resolution", () => {
    it("generates full package on record with missing script without throwing VALIDATION_FAILED", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const mascot = await fix.repo.saveMascot({ name: "Mascot" });
      await fix.repo.updateChannel(fix.channel.channel_id, { mascot_id: mascot.id });
      const mUrl = await fix.repo.saveMascotAsset(mascot.id, "m.png", await createTestImageBuffer(200, 200, { r: 1, g: 2, b: 3 }));
      const sUrl = await fix.repo.saveMascotAsset(mascot.id, "s.png", await createTestImageBuffer(200, 200, { r: 4, g: 5, b: 6 }));
      await fix.repo.saveMascot({
        ...mascot,
        master_image_url: mUrl,
        styles: [
          {
            id: "s1",
            name: "Style",
            keyword: "kw",
            anchor_image_url: sUrl,
            is_default: true,
            states: { thinking: [], celebrate: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        active_style_id: "s1",
      });

      // Verify that initial state has units.script.state === "missing" and script === null
      const initial = await fix.repo.getShortReel(fix.key);
      expect(initial.units.script.state).toBe("missing");
      expect(initial.script).toBeNull();

      // Calling generateFullReelPackage without pre-existing script must auto-generate it
      const result = await generateFullReelPackage(fix.repo, fix.key, {
        coverOptions: await testCoverOptions(fix),
      });

      expect(result.units.script.state).toBe("ready");
      expect(result.script).not.toBeNull();
      expect(result.script?.segments).toHaveLength(3);
      expect(result.script?.segments[0].index).toBe(1);
      expect(result.script?.segments[0].mode).toBe("generate");
      expect(result.script?.segments[1].index).toBe(2);
      expect(result.script?.segments[1].mode).toBe("extend");
      expect(result.script?.segments[2].index).toBe(3);
      expect(result.script?.segments[2].mode).toBe("extend");

      // Verify cues
      const questionCue = result.script?.segments[0].text_cues.find((c) => c.role === "question");
      expect(questionCue).toBeDefined();
      expect(questionCue?.text).toBe(initial.source.question_text);

      const supportingCue = result.script?.segments[1].text_cues.find((c) => c.role === "supporting");
      expect(supportingCue).toBeDefined();

      const answerCue = result.script?.segments[2].text_cues.find((c) => c.role === "answer");
      expect(answerCue).toBeDefined();
      expect(answerCue?.text).toBe(initial.source.selected_answer_text);

      // Verify all package units are ready
      expect(result.units.references.state).toBe("ready");
      expect(result.units.cover.state).toBe("ready");
      expect(result.units.publishing.state).toBe("ready");
    });

    it("generateReelScriptUnit generates valid baseline script when llmClient is not provided", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);

      const updated = await generateReelScriptUnit(fix.repo, fix.key, "script-test-op", undefined, { allowBaselineFallback: true });
      expect(updated.units.script.state).toBe("ready");
      expect(updated.script).not.toBeNull();
      expect(updated.script?.segments).toHaveLength(3);
      const totalDuration = updated.script!.segments.reduce((acc, s) => acc + s.duration_seconds, 0);
      expect(totalDuration).toBe(26);
    });

    it("regenerates only the requested segment and preserves its siblings", async () => {
      const fix = await repairFixture();
      cleanups.push(fix.cleanup);
      const initial = await generateReelScriptUnit(fix.repo, fix.key, "script-initial", undefined, { allowBaselineFallback: true });
      const segmentOne = { ...initial.script!.segments[0], narrative: "Preserve segment one" };
      const withFirstEdit = await fix.repo.updateShortReel(
        fix.key,
        { expected_revision: initial.revision, request_id: "edit-first" },
        { kind: "update_segment", segment_index: 1, segment: segmentOne },
      );
      const segmentThree = { ...withFirstEdit.script!.segments[2], narrative: "Preserve segment three" };
      await fix.repo.updateShortReel(
        fix.key,
        { expected_revision: withFirstEdit.revision, request_id: "edit-third" },
        { kind: "update_segment", segment_index: 3, segment: segmentThree },
      );

      const regenerated = await generateReelSegmentUnit(fix.repo, fix.key, 2, "segment-two-regeneration", undefined, {
        allowBaselineFallback: true,
      });
      expect(regenerated.script?.segments[0].narrative).toBe("Preserve segment one");
      expect(regenerated.script?.segments[2].narrative).toBe("Preserve segment three");
    });
  });
});
