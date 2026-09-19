import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MascotAnimationRevisionSchema,
  MascotAttemptMetadataSchema,
  MascotPublishedAnimationAssetSchema,
  type AnimationState,
  type MascotProfile,
  type MascotVideoProcessingJob,
} from "@studio/shared";
import {
  createAnimationPackagingService,
  createAnimationStorageAdapter,
  createFfmpegAdapter,
  createFrameExtractionService,
  createFrameMattingService,
  createFrameRegistrationService,
  createMascotMattingAdapter,
  createVideoProcessingOrchestrator,
  createVideoProcessingRepository,
  createVideoRolloutService,
  createVideoUploadService,
  type AnimationStorageAdapter,
  type VideoProcessingRepository,
  type VideoProcessingOrchestrator,
  type VideoRolloutService,
  type VideoUploadService,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { createAnimationRepository } from "../../src/quiz/mascot/animation/animationRepository.js";
import { buildApp, type StudioApp } from "../../src/app.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

const testRoots: string[] = [];

describe("Stage B4 — Orchestration, Repository, Artifact Delivery Routes & Rollout Service", () => {
  let app: StudioApp;
  let storageRoot: string;
  let storageAdapter: AnimationStorageAdapter;
  let repository: VideoProcessingRepository;
  let orchestrator: VideoProcessingOrchestrator;
  let rolloutService: VideoRolloutService;
  let videoUploadService: VideoUploadService;
  let mascotId: string;
  const styleId = "core";
  const state: AnimationState = "thinking";
  const slotIndex = 1;

  function createTestMattedPng(width = 640, height = 360): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    const minX = Math.floor(width * 0.3);
    const maxX = Math.floor(width * 0.7);
    const minY = Math.floor(height * 0.2);
    const maxY = Math.floor(height * 0.8);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 30;
        data[idx + 1] = 140;
        data[idx + 2] = 210;
        data[idx + 3] = 255;
      }
    }
    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(os.tmpdir(), "stage-b4-test-"));
    testRoots.push(storageRoot);

    await Promise.all([
      mkdir(path.join(storageRoot, "templates"), { recursive: true }),
      mkdir(path.join(storageRoot, "channels"), { recursive: true }),
      mkdir(path.join(storageRoot, "mascots"), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(path.join(storageRoot, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(storageRoot, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);

    const mattedPngBytes = createTestMattedPng();

    // Mock FFmpeg supporting dynamic 4s, 24 FPS (96 frames)
    const mockFfmpeg = createFfmpegAdapter({
      fixtureMetadata: {
        width: 640,
        height: 360,
        durationMs: 4000,
        fps: 24,
        codec: "h264",
        format: "mp4",
        fileSizeBytes: 2048,
      },
      fixtureExtractHandler: async (opts) => {
        await mkdir(opts.outputDir, { recursive: true });
        const frames = [];
        const frameCount = 96;
        for (let i = 1; i <= frameCount; i++) {
          const fileName = `frame_${String(i).padStart(3, "0")}.png`;
          const filePath = path.join(opts.outputDir, fileName);
          await writeFile(filePath, mattedPngBytes);
          frames.push({
            frameIndex: i,
            fileName,
            filePath,
            timestampMs: Math.round((i - 1) * (1000 / 24)),
          });
        }
        return {
          frames,
          frameCount,
          fps: 24,
          durationMs: 4000,
          outputDir: opts.outputDir,
        };
      },
    });

    const mockMatting = createMascotMattingAdapter({
      fixtureHandler: async () => ({
        imageBytes: mattedPngBytes,
        width: 640,
        height: 360,
        diagnostics: {
          hiddenRgbDetected: false,
          hiddenRgbPixelsZeroed: 0,
          residualBackgroundRatio: 0,
          holesDetected: false,
          edgeClippingDetected: false,
          transparentPixels: 150000,
          opaquePixels: 80400,
          translucentPixels: 0,
          contentBounds: { x: 192, y: 72, minX: 192, minY: 72, maxX: 448, maxY: 288, width: 257, height: 217 },
          alphaMean: 0.35,
        },
      }),
    });

    storageAdapter = createAnimationStorageAdapter(storageRoot);
    repository = createVideoProcessingRepository(storageAdapter);
    videoUploadService = createVideoUploadService(storageAdapter, mockFfmpeg);
    const frameExtractionService = createFrameExtractionService(storageAdapter, mockFfmpeg);
    const frameMattingService = createFrameMattingService(storageAdapter, mockMatting);
    const frameRegistrationService = createFrameRegistrationService(storageAdapter);
    const packagingService = createAnimationPackagingService(storageAdapter);

    orchestrator = createVideoProcessingOrchestrator({
      storageAdapter,
      repository,
      uploadService: videoUploadService,
      extractionService: frameExtractionService,
      mattingService: frameMattingService,
      registrationService: frameRegistrationService,
      packagingService,
    });

    rolloutService = createVideoRolloutService({
      storageAdapter,
      videoProcessingRepository: repository,
      packagingService,
    });

    app = await buildApp(storageRoot, {
      ffmpegAdapter: mockFfmpeg,
      animationStorageAdapter: storageAdapter,
      videoUploadService,
      videoProcessingRepository: repository,
      videoProcessingOrchestrator: orchestrator,
      videoRolloutService: rolloutService,
    });

    // Seed test mascot
    await app.repository.saveMascot({
      id: "owl-b4-test",
      name: "B4 Owl",
      description: "A test owl for Stage B4",
      color_theme: "#06b6d4",
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "clean vector",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          states: {
            thinking: Array.from({ length: 10 }, (_, i) => ({
              id: `slot_${i + 1}`,
              slot_index: i + 1,
              image_url: `https://example.com/mascot/thinking_${i + 1}.png`,
            })),
            celebrate: Array.from({ length: 10 }, (_, i) => ({
              id: `slot_${i + 1}`,
              slot_index: i + 1,
              image_url: `https://example.com/mascot/celebrate_${i + 1}.png`,
            })),
          },
        },
      ],
    });

    const mascots = await app.repository.listMascots();
    mascotId = mascots[0].id;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch {
          // Ignore cleanup errors on Windows
        }
      }
    }
  });

  describe("1. Dynamic Video Pipeline Orchestration & Persistence", () => {
    it("executes dynamic 4s 24 FPS pipeline and records transparent WebM metadata", async () => {
      // 1. Upload video
      const fakeVideo = Buffer.from("stage4-sample-mp4-bytes-content");
      const upload = await videoUploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 1,
        buffer: fakeVideo,
        filename: "test_dynamic.mp4",
      });

      // 2. Schedule and run job
      const now = new Date().toISOString();
      const job: MascotVideoProcessingJob = {
        id: `job_${mascotId}_${styleId}_${state}_${slotIndex}_att1`,
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 1,
        source_video_url: upload.sourceVideoUrl,
        source_video_fingerprint: upload.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      await orchestrator.scheduleJob(job);
      const completedJob = await orchestrator.runJobSync(job.id);

      if (completedJob.status !== "ready") {
        console.error("Job failed with error:", completedJob.error_code, completedJob.error_message);
      }
      expect(completedJob.status).toBe("ready");
      expect(completedJob.progress).toBe(100);

      // 3. Verify Slot Projection & Revision
      const proj = await repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(proj.status).toBe("ready");
      expect(proj.active_revision).toBeDefined();
      expect(proj.active_revision?.frame_count).toBe(96);
      expect(proj.active_revision?.playback_fps).toBe(24);
      expect(proj.active_revision?.duration_ms).toBe(4000);
      expect(proj.active_revision?.transparent_video_url).toContain("video_transparent.webm");
      expect(proj.active_revision?.alpha_codec).toBe("vp9_alpha");

      // Revision schema validation
      const revisionValidated = MascotAnimationRevisionSchema.safeParse(proj.active_revision);
      expect(revisionValidated.success).toBe(true);

      // 4. Verify attempt metadata
      const attemptMeta = await repository.getAttemptMetadata(mascotId, styleId, state, slotIndex, 1);
      expect(attemptMeta).not.toBeNull();
      expect(attemptMeta?.frame_count).toBe(96);
      expect(attemptMeta?.fps).toBe(24);
      expect(attemptMeta?.duration_ms).toBe(4000);
      expect(attemptMeta?.transparent_video_url).toContain("video_transparent.webm");
      expect(attemptMeta?.alpha_codec).toBe("vp9_alpha");

      // Attempt metadata schema validation
      const attemptValidated = MascotAttemptMetadataSchema.safeParse(attemptMeta);
      expect(attemptValidated.success).toBe(true);

      // 5. Verify manifest file on disk
      const manifestPath = path.join(storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, 1), "manifest.json");
      const manifestRaw = JSON.parse(await readFile(manifestPath, "utf8"));
      expect(manifestRaw.frame_count).toBe(96);
      expect(manifestRaw.fps).toBe(24);
      expect(manifestRaw.duration_ms).toBe(4000);
      expect(manifestRaw.transparent_video_url).toContain("video_transparent.webm");
      expect(manifestRaw.alpha_codec).toBe("vp9_alpha");
    }, 60000);
  });

  describe("2. HTTP Video Streaming & Byte-Range Delivery Routes", () => {
    const sampleWebmBytes = Buffer.from("GIDX-VP9-TRANSPARENT-WEBM-STREAMING-TEST-PAYLOAD-BYTES-PADDING-TO-1024-".repeat(16));

    beforeEach(async () => {
      // Place video_transparent.webm in slot dir
      const slotDir = storageAdapter.getSlotDir(mascotId, styleId, state, slotIndex);
      await mkdir(slotDir, { recursive: true });
      await writeFile(path.join(slotDir, "video_transparent.webm"), sampleWebmBytes);
      await writeFile(path.join(slotDir, "preview.webp"), Buffer.from("fake-webp"));
    });

    it("serves video_transparent.webm with 200 OK and Accept-Ranges when no Range header is sent", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("video/webm");
      expect(response.headers["accept-ranges"]).toBe("bytes");
      expect(Number(response.headers["content-length"])).toBe(sampleWebmBytes.length);
      expect(response.rawPayload.equals(sampleWebmBytes)).toBe(true);
    });

    it("serves partial content with 206 and Content-Range for Range: bytes=0-499", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
        headers: {
          range: "bytes=0-499",
        },
      });

      expect(response.statusCode).toBe(206);
      expect(response.headers["content-type"]).toBe("video/webm");
      expect(response.headers["accept-ranges"]).toBe("bytes");
      expect(response.headers["content-range"]).toBe(`bytes 0-499/${sampleWebmBytes.length}`);
      expect(Number(response.headers["content-length"])).toBe(500);
      expect(response.rawPayload.equals(sampleWebmBytes.subarray(0, 500))).toBe(true);
    });

    it("serves middle byte range with 206 for Range: bytes=100-299", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
        headers: {
          range: "bytes=100-299",
        },
      });

      expect(response.statusCode).toBe(206);
      expect(response.headers["content-range"]).toBe(`bytes 100-299/${sampleWebmBytes.length}`);
      expect(Number(response.headers["content-length"])).toBe(200);
      expect(response.rawPayload.equals(sampleWebmBytes.subarray(100, 300))).toBe(true);
    });

    it("serves suffix byte range with 206 for Range: bytes=-150", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
        headers: {
          range: "bytes=-150",
        },
      });

      expect(response.statusCode).toBe(206);
      const start = sampleWebmBytes.length - 150;
      const end = sampleWebmBytes.length - 1;
      expect(response.headers["content-range"]).toBe(`bytes ${start}-${end}/${sampleWebmBytes.length}`);
      expect(Number(response.headers["content-length"])).toBe(150);
      expect(response.rawPayload.equals(sampleWebmBytes.subarray(start))).toBe(true);
    });

    it("returns 416 Range Not Satisfiable when range is beyond file size", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
        headers: {
          range: `bytes=${sampleWebmBytes.length + 500}-`,
        },
      });

      expect(response.statusCode).toBe(416);
      expect(response.headers["content-range"]).toBe(`bytes */${sampleWebmBytes.length}`);
    });

    it("serves preview.webp correctly", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/preview.webp`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("image/webp");
    });

    it("rejects path traversal attempts with 400 or 404", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/..%2F..%2Fpasswords.txt`,
      });

      expect([400, 404]).toContain(response.statusCode);
    });

    it("rejects unauthorized file extensions", async () => {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/script.sh`,
      });

      expect([400, 404]).toContain(response.statusCode);
    });

    it("resolves artifacts from attempt directory when not in slot root", async () => {
      // Put a revision attempt artifact in attempt_1 directory
      const attemptDir = storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, 1);
      await mkdir(attemptDir, { recursive: true });
      const attemptWebm = Buffer.from("attempt-1-transparent-webm-bytes");
      await writeFile(path.join(attemptDir, "video_transparent.webm"), attemptWebm);

      // Remove slot root webm to force attempt resolution
      await rm(path.join(storageAdapter.getSlotDir(mascotId, styleId, state, slotIndex), "video_transparent.webm"));

      const resolved = await repository.resolveArtifactPath(mascotId, styleId, state, slotIndex, "video_transparent.webm");
      expect(resolved).not.toBeNull();
      expect(resolved).toContain("att_1");

      const response = await app.server.inject({
        method: "GET",
        url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(attemptWebm)).toBe(true);
    });
  });

  describe("3. Rollout Publishing Service with Dynamic Video Metadata", () => {
    it("publishes style video animations carrying forward dynamic duration_ms, fps, and transparent_video_url", async () => {
      const transparentVideo = Buffer.from("rollout-transparent-webm-bytes");
      const manifest = {
        version: 1,
        recipe_id: "default-recipe",
        style_id: styleId,
        state,
        slot_index: slotIndex,
        frame_count: 96,
        fps: 24,
        duration_ms: 4000,
        loop: true,
        loop_policy: "loop" as const,
        registration: {
          canvas: { width: 640, height: 360 },
          content_bounds: { x: 192, y: 72, minX: 192, minY: 72, maxX: 448, maxY: 288, width: 257, height: 217 },
          pivot: { x: 320, y: 360 },
          scale: 1,
          source_width: 640,
          source_height: 360,
          offset_x: 0,
          offset_y: 0,
        },
        fingerprint: "test-manifest-fp",
        source_fingerprint: "test-src-fp",
        processing_fingerprint: "test-proc-fp",
        transparent_video_url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
        alpha_codec: "vp9_alpha" as const,
      };

      for (const st of ["thinking", "celebrate"] as const) {
        for (let slot = 1; slot <= 10; slot++) {
          const slotManifest = {
            ...manifest,
            state: st,
            slot_index: slot,
            loop: st === "thinking",
            loop_policy: st === "thinking" ? ("loop" as const) : ("one_shot_rest" as const),
            transparent_video_url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${st}/${slot}/artifacts/video_transparent.webm`,
          };
          const sDir = storageAdapter.getSlotDir(mascotId, styleId, st, slot);
          await mkdir(sDir, { recursive: true });
          await writeFile(path.join(sDir, "video_transparent.webm"), transparentVideo);
          await writeFile(path.join(sDir, "manifest.json"), JSON.stringify(slotManifest, null, 2));
          await writeFile(path.join(sDir, "preview.webp"), Buffer.from("fake-preview-webp"));
          await writeFile(path.join(sDir, "preview.png"), Buffer.from("fake-preview-png"));

          const attDir = storageAdapter.getAttemptDir(mascotId, styleId, st, slot, 1);
          await mkdir(attDir, { recursive: true });
          await writeFile(path.join(attDir, "video_transparent.webm"), transparentVideo);
          await writeFile(path.join(attDir, "manifest.json"), JSON.stringify(slotManifest, null, 2));
          await writeFile(path.join(attDir, "preview.webp"), Buffer.from("fake-preview-webp"));
          await writeFile(path.join(attDir, "preview.png"), Buffer.from("fake-preview-png"));

          await repository.saveActiveRevision(mascotId, styleId, st, slot, 1, {
            id: `rev_${mascotId}_${styleId}_${st}_${slot}_att1`,
            mascot_id: mascotId,
            style_id: styleId,
            state: st,
            slot_index: slot,
            attempt: 1,
            version: 1,
            status: "ready",
            atlas_url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${st}/${slot}/artifacts/atlas.png`,
            manifest_url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${st}/${slot}/artifacts/manifest.json`,
            frame_urls: Array.from(
              { length: 96 },
              (_, i) =>
                `/api/mascots/${mascotId}/styles/${styleId}/animations/${st}/${slot}/artifacts/frame_${String(i + 1).padStart(3, "0")}.png`,
            ),
            frame_count: 96,
            source_fps: 24,
            playback_fps: 24,
            fps: 24,
            duration_ms: 4000,
            loop_mode: st === "thinking" ? "loop" : "one_shot_rest",
            canvas: { width: 640, height: 360 },
            content_bounds: { x: 192, y: 72, minX: 192, minY: 72, maxX: 448, maxY: 288, width: 257, height: 217 },
            pivot: { x: 320, y: 360 },
            registration: {
              canvas: { width: 640, height: 360 },
              content_bounds: { x: 192, y: 72, minX: 192, minY: 72, maxX: 448, maxY: 288, width: 257, height: 217 },
              pivot: { x: 320, y: 360 },
              scale: 1,
              source_width: 640,
              source_height: 360,
              offset_x: 0,
              offset_y: 0,
            },
            source_video_url: "input.mp4",
            source_fingerprint: "test-src-fp",
            processing_fingerprint: "test-proc-fp",
            transparent_video_url: `/api/mascots/${mascotId}/styles/${styleId}/animations/${st}/${slot}/artifacts/video_transparent.webm`,
            alpha_codec: "vp9_alpha",
            created_at: new Date().toISOString(),
          });
        }
      }

      // Execute rollout publishing
      const currentMascot = await app.repository.getMascot(mascotId);
      const rolloutResult = await rolloutService.publishStyleVideoAnimations(currentMascot!, styleId);

      expect(rolloutResult.publishedCount).toBe(20);

      // Save updated style back to repository
      await app.repository.saveMascot({
        ...currentMascot!,
        styles: currentMascot!.styles?.map((s) => (s.id === styleId ? rolloutResult.updatedStyle : s)),
      });

      // Verify published artifacts directory has video_transparent.webm
      const publishedDir = storageAdapter.getPublishedArtifactsDir(mascotId, styleId, state, slotIndex);
      const publishedFiles = await readdir(publishedDir);
      expect(publishedFiles).toContain("video_transparent.webm");
      expect(publishedFiles).toContain("manifest.json");
      expect(publishedFiles).toContain("preview.webp");

      // Verify slot in profile was updated with MascotPublishedAnimationAsset
      const updatedProfile = await app.repository.getMascot(mascotId);
      const style = updatedProfile?.styles?.find((s) => s.id === styleId);
      const updatedSlot = style?.states?.[state]?.find((s) => s.slot_index === slotIndex);

      expect(updatedSlot).toBeDefined();
      expect(updatedSlot?.animation).toBeDefined();
      expect(updatedSlot?.animation?.frame_count).toBe(96);
      expect(updatedSlot?.animation?.fps).toBe(24);
      expect(updatedSlot?.animation?.duration_ms).toBe(4000);
      expect(updatedSlot?.animation?.transparent_video_url).toContain("video_transparent.webm");
      expect(updatedSlot?.animation?.alpha_codec).toBe("vp9_alpha");

      // Verify schema validation passes for the published animation asset
      const assetValidation = MascotPublishedAnimationAssetSchema.safeParse(updatedSlot?.animation);
      expect(assetValidation.success).toBe(true);
    }, 60000);
  });

  describe("4. Backwards Compatibility with Legacy Animations & Still Mascots", () => {
    it("preserves legacy 12-frame sprite atlas animation publishing and rendering", async () => {
      // Legacy 12-frame asset
      const legacyAsset = {
        version: 1 as const,
        state: "thinking" as const,
        atlas_url: "https://example.com/atlas.png",
        manifest_url: "https://example.com/manifest.json",
        frame_count: 12 as const,
        fps: 8 as const,
        loop: true,
        registration: {
          canvas: { width: 512, height: 512 },
          content_bounds: { x: 100, y: 100, minX: 100, minY: 100, maxX: 400, maxY: 400, width: 300, height: 300 },
          pivot: { x: 256, y: 512 },
          scale: 1,
          source_width: 512,
          source_height: 512,
          offset_x: 0,
          offset_y: 0,
        },
        frames: Array.from({ length: 12 }, (_, i) => ({
          index: i,
          x: (i % 4) * 128,
          y: Math.floor(i / 4) * 128,
          width: 128,
          height: 128,
          duration_ms: 125,
        })),
        content_fingerprint: "legacy-fingerprint-123",
        source_fingerprint: "legacy-source-123",
      };

      const animRepo = createAnimationRepository({
        storageRoot: path.dirname(app.repository.roots.mascots),
      });
      const publishResult = await animRepo.publishSlotAnimation(mascotId, styleId, "thinking", 2, legacyAsset);

      expect(publishResult.variant.animation?.frame_count).toBe(12);
      expect(publishResult.variant.animation?.fps).toBe(8);
      expect(publishResult.record.asset.frame_count).toBe(12);
    });

    it("supports Still mascots without animations cleanly", async () => {
      const stillMascot: MascotProfile = {
        id: "still-mascot-test",
        name: "Still Owl",
        description: "A still mascot without animations",
        color_theme: "#10b981",
        visual_style: "flat_vector",
        master_prompt: "a green owl",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        styles: [
          {
            id: "default",
            name: "Default",
            keyword: "clean",
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            states: {
              thinking: [
                {
                  id: "slot_1",
                  slot_index: 1,
                  image_url: "https://example.com/still.png",
                },
              ],
              celebrate: [],
            },
          },
        ],
      };

      await app.repository.saveMascot(stillMascot);
      const loaded = await app.repository.getMascot("still-mascot-test");
      expect(loaded?.id).toBe("still-mascot-test");
      expect(loaded?.styles?.[0].states?.thinking?.[0].animation).toBeUndefined();
    });
  });
});
