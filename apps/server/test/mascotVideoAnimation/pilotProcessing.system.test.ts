import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import {
  MascotAnimationRevisionSchema,
  MascotAnimationManifestSchema,
  resolveAnimationFrameAtTime,
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
  createVideoUploadService,
  MascotMattingError,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";
import { renderProductionMascotAtTime } from "../../src/quiz/render/productionMascotRenderer.js";

describe("Stage 16 — Pilot Processing (2 Thinking + 2 Celebrate Uploads)", { timeout: 60_000 }, () => {
  const testRoots: string[] = [];

  afterEach(async () => {
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  async function createTestRoot(): Promise<string> {
    const root = path.join(os.tmpdir(), `stage16-pilot-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    await fs.mkdir(root, { recursive: true });
    testRoots.push(root);
    return root;
  }

  function createTestMattedPng(width = 1280, height = 720, boxOffset = 0): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    // Draw character subject in the center
    const minX = Math.floor(width * 0.3) + boxOffset;
    const maxX = Math.floor(width * 0.7) + boxOffset;
    const minY = Math.floor(height * 0.2);
    const maxY = Math.floor(height * 0.8);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 48;
        data[idx + 1] = 164;
        data[idx + 2] = 232;
        data[idx + 3] = 255;
      }
    }
    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  function setupPilotContext(root: string, options: { failFrameIndex?: number } = {}) {
    const storageAdapter = createAnimationStorageAdapter(root);
    const repository = createVideoProcessingRepository(storageAdapter);
    const mattedPngBytes = createTestMattedPng();

    const ffmpegAdapter = createFfmpegAdapter({
      fixtureMetadata: {
        width: 1280,
        height: 720,
        durationMs: 1500,
        fps: 8,
        codec: "h264",
        format: "mp4",
        fileSizeBytes: 20480,
      },
      fixtureExtractHandler: async (opts) => {
        await fs.mkdir(opts.outputDir, { recursive: true });
        const frames = [];
        for (let i = 1; i <= 12; i++) {
          const fileName = `frame_${String(i).padStart(3, "0")}.png`;
          const filePath = path.join(opts.outputDir, fileName);
          await fs.writeFile(filePath, mattedPngBytes);
          frames.push({
            frameIndex: i,
            fileName,
            filePath,
            timestampMs: (i - 1) * 125,
          });
        }
        return {
          frames,
          frameCount: 12,
          fps: 8,
          durationMs: 1500,
          outputDir: opts.outputDir,
        };
      },
    });

    const mattingAdapter = createMascotMattingAdapter({
      fixtureHandler: async (input) => {
        if (options.failFrameIndex && input.frameIndex === options.failFrameIndex) {
          throw new MascotMattingError(`Matting segmentation failed on frame ${input.frameIndex}`);
        }
        return {
          imageBytes: new Uint8Array(mattedPngBytes),
          width: 1280,
          height: 720,
          diagnostics: {
            hiddenRgbDetected: false,
            hiddenRgbPixelsZeroed: 0,
            residualBackgroundRatio: 0,
            holesDetected: false,
            edgeClippingDetected: false,
            transparentPixels: 500000,
            opaquePixels: 421600,
            translucentPixels: 0,
            contentBounds: {
              x: 384,
              y: 144,
              minX: 384,
              minY: 144,
              maxX: 896,
              maxY: 576,
              width: 513,
              height: 433,
            },
            alphaMean: 0.35,
          },
        };
      },
    });

    const uploadService = createVideoUploadService(storageAdapter, ffmpegAdapter);
    const extractionService = createFrameExtractionService(storageAdapter, ffmpegAdapter);
    const mattingService = createFrameMattingService(storageAdapter, mattingAdapter);
    const registrationService = createFrameRegistrationService(storageAdapter);
    const packagingService = createAnimationPackagingService(storageAdapter);

    const orchestrator = createVideoProcessingOrchestrator({
      storageAdapter,
      repository,
      uploadService,
      extractionService,
      mattingService,
      registrationService,
      packagingService,
      maxConcurrentJobs: 5,
    });

    return {
      storageAdapter,
      repository,
      uploadService,
      orchestrator,
      packagingService,
    };
  }

  const dummyVideoBuffer = Buffer.alloc(2048, "mock-mp4-video-content-1280x720");

  it("processes pilot style with exactly 2 Thinking and 2 Celebrate uploads through all 5 quality gates", async () => {
    const root = await createTestRoot();
    const { uploadService, orchestrator, repository, storageAdapter, packagingService } = setupPilotContext(root);

    const mascotId = "owl-pilot-mascot";
    const styleId = "pilot-core-style";

    const pilotSlots: Array<{ state: AnimationState; slotIndex: number }> = [
      { state: "thinking", slotIndex: 1 },
      { state: "thinking", slotIndex: 2 },
      { state: "celebrate", slotIndex: 1 },
      { state: "celebrate", slotIndex: 2 },
    ];

    const completedRevisions: Record<string, ReturnType<typeof MascotAnimationRevisionSchema.parse>> = {};

    // Execute pilot uploads
    for (const slot of pilotSlots) {
      const upload = await uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state: slot.state,
        slotIndex: slot.slotIndex,
        attemptId: 1,
        filename: `${slot.state}_slot_${slot.slotIndex}.mp4`,
        buffer: dummyVideoBuffer,
        mimeType: "video/mp4",
      });

      const now = new Date().toISOString();
      const job: MascotVideoProcessingJob = {
        id: `job_${mascotId}_${styleId}_${slot.state}_${slot.slotIndex}_att1`,
        mascot_id: mascotId,
        style_id: styleId,
        state: slot.state,
        slot_index: slot.slotIndex,
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
      const finalJob = await orchestrator.runJobSync(job.id);

      expect(finalJob.status).toBe("ready");
      expect(finalJob.progress).toBe(100);

      // Verify active revision projection
      const revision = await repository.getActiveRevision(mascotId, styleId, slot.state, slot.slotIndex);
      expect(revision).not.toBeNull();
      expect(revision!.attempt).toBe(1);
      expect(revision!.version).toBe(1);
      expect(revision!.status).toBe("ready");
      expect(revision!.frame_count).toBe(12);

      completedRevisions[`${slot.state}_${slot.slotIndex}`] = revision!;
    }

    // --- GATE 1: SOURCE INSPECTION ---
    for (const slot of pilotSlots) {
      const meta = await repository.getAttemptMetadata(mascotId, styleId, slot.state, slot.slotIndex, 1);
      expect(meta).not.toBeNull();
      expect(meta!.source_video_url).toBeDefined();
      expect(meta!.source_video_fingerprint).toBeDefined();

      const rev = completedRevisions[`${slot.state}_${slot.slotIndex}`];
      expect(rev.canvas.width).toBe(1280);
      expect(rev.canvas.height).toBe(720);
      expect(rev.playback_fps).toBe(8);
      expect(rev.duration_ms).toBe(1500);
      expect(rev.frame_count).toBe(12);
    }

    // --- GATE 2: ALPHA INSPECTION ---
    for (const slot of pilotSlots) {
      const rev = completedRevisions[`${slot.state}_${slot.slotIndex}`];
      expect(rev.status).toBe("ready");
      expect(rev.processing_fingerprint).toBeDefined();
      expect(rev.frame_urls.length).toBe(12);

      // Verify all 12 matted frames are created on disk and non-empty
      const mattedDir = storageAdapter.getAttemptFramesDir(mascotId, styleId, slot.state, slot.slotIndex, 1, "matted");
      for (let i = 1; i <= 12; i++) {
        const framePath = path.join(mattedDir, `frame_${String(i).padStart(3, "0")}.png`);
        const stat = await fs.stat(framePath);
        expect(stat.size).toBeGreaterThan(0);
      }
    }

    // --- GATE 3: COMMON REGISTRATION INSPECTION ---
    const loadedManifests: Record<string, ReturnType<typeof MascotAnimationManifestSchema.parse>> = {};
    for (const slot of pilotSlots) {
      const rev = completedRevisions[`${slot.state}_${slot.slotIndex}`];
      expect(rev.registration.source_width).toBe(1280);
      expect(rev.registration.source_height).toBe(720);
      expect(rev.registration.content_bounds.width).toBeGreaterThan(0);
      expect(rev.registration.content_bounds.height).toBeGreaterThan(0);
      expect(rev.registration.pivot.x).toBeGreaterThan(0);
      expect(rev.registration.pivot.y).toBeGreaterThan(0);

      const manifestPath = path.join(storageAdapter.getAttemptDir(mascotId, styleId, slot.state, slot.slotIndex, 1), "manifest.json");
      const manifest = await packagingService.loadAndValidateAttemptManifest(manifestPath);
      expect(manifest.frames.length).toBe(12);
      expect(manifest.registration.source_width).toBe(rev.registration.content_bounds.width);
      expect(manifest.registration.source_height).toBe(rev.registration.content_bounds.height);
      expect(manifest.atlas.width).toBeGreaterThan(0);
      expect(manifest.atlas.height).toBeGreaterThan(0);
      for (const frame of manifest.frames) {
        expect(frame.width).toBeGreaterThan(0);
        expect(frame.height).toBeGreaterThan(0);
      }
      loadedManifests[`${slot.state}_${slot.slotIndex}`] = manifest;
    }

    // --- GATE 4: PREVIEW PLAYBACK INSPECTION ---
    // Thinking Slot 1: loop policy === "loop"
    const thinkingManifest = loadedManifests["thinking_1"];
    const animThinking = {
      ...thinkingManifest,
      version: 1 as const,
      atlas_url: completedRevisions["thinking_1"].atlas_url,
      manifest_url: completedRevisions["thinking_1"].manifest_url,
      content_fingerprint: completedRevisions["thinking_1"].processing_fingerprint,
      source_fingerprint: completedRevisions["thinking_1"].source_fingerprint,
      slot_index: 1,
    };

    const at0s = resolveAnimationFrameAtTime(animThinking, 0.0);
    expect(at0s.frameIndex).toBe(0);
    const at125ms = resolveAnimationFrameAtTime(animThinking, 0.125);
    expect(at125ms.frameIndex).toBe(1);
    const atWrap = resolveAnimationFrameAtTime(animThinking, 1.5);
    expect(atWrap.frameIndex).toBe(0); // seamless loop wrap

    // Celebrate Slot 1: loop policy === "one_shot_rest"
    const celebrateManifest = loadedManifests["celebrate_1"];
    const animCelebrate = {
      ...celebrateManifest,
      version: 1 as const,
      atlas_url: completedRevisions["celebrate_1"].atlas_url,
      manifest_url: completedRevisions["celebrate_1"].manifest_url,
      content_fingerprint: completedRevisions["celebrate_1"].processing_fingerprint,
      source_fingerprint: completedRevisions["celebrate_1"].source_fingerprint,
      slot_index: 1,
    };

    const celebAt0s = resolveAnimationFrameAtTime(animCelebrate, 0.0);
    expect(celebAt0s.frameIndex).toBe(0);
    const celebAt11 = resolveAnimationFrameAtTime(animCelebrate, 1.375);
    expect(celebAt11.frameIndex).toBe(11);
    const celebClamped = resolveAnimationFrameAtTime(animCelebrate, 2.0);
    expect(celebClamped.frameIndex).toBe(11);
    expect(celebClamped.isClamped).toBe(true); // one-shot clamped

    // --- GATE 5: PRODUCTION RENDER & PLACEMENT INSPECTION ---
    const pilotMascot: MascotProfile = {
      id: mascotId,
      name: "Pilot Owl",
      description: "Pilot Mascot with 2 thinking + 2 celebrate slots",
      visual_style: "pixar_3d",
      master_prompt: "Scholarly pilot owl",
      master_image_url: "/mascot/pilot/master.png",
      color_theme: "#4f46e5",
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      actions: {},
      styles: [
        {
          id: styleId,
          name: "Pilot Style",
          keyword: "pilot",
          anchor_image_url: "/mascot/pilot/anchor.png",
          is_default: true,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
          states: {
            thinking: [
              {
                id: "pilot-think-1",
                slot_index: 1,
                image_url: "/mascot/pilot/think1.png",
                status: "ready",
                animation: animThinking,
              },
              {
                id: "pilot-think-2",
                slot_index: 2,
                image_url: "/mascot/pilot/think2.png",
                status: "ready",
                animation: {
                  ...loadedManifests["thinking_2"],
                  version: 1 as const,
                  atlas_url: completedRevisions["thinking_2"].atlas_url,
                  manifest_url: completedRevisions["thinking_2"].manifest_url,
                  content_fingerprint: completedRevisions["thinking_2"].processing_fingerprint,
                  source_fingerprint: completedRevisions["thinking_2"].source_fingerprint,
                  slot_index: 2,
                },
              },
            ],
            celebrate: [
              {
                id: "pilot-celeb-1",
                slot_index: 1,
                image_url: "/mascot/pilot/celeb1.png",
                status: "ready",
                animation: animCelebrate,
              },
              {
                id: "pilot-celeb-2",
                slot_index: 2,
                image_url: "/mascot/pilot/celeb2.png",
                status: "ready",
                animation: {
                  ...loadedManifests["celebrate_2"],
                  version: 1 as const,
                  atlas_url: completedRevisions["celebrate_2"].atlas_url,
                  manifest_url: completedRevisions["celebrate_2"].manifest_url,
                  content_fingerprint: completedRevisions["celebrate_2"].processing_fingerprint,
                  source_fingerprint: completedRevisions["celebrate_2"].source_fingerprint,
                  slot_index: 2,
                },
              },
            ],
          },
        },
      ],
    };

    const renderedHtml = renderProductionMascotAtTime(
      pilotMascot,
      {
        enabled: true,
        position: "bottom_left",
        scale: 1.4,
        offset_x: 25,
        offset_y: -10,
        flip_x: false,
        show_in_intro: true,
        show_in_outro: true,
        show_in_question: true,
      },
      {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        timelineEvents: [
          { type: "countdown.start", at_seconds: 2.0 },
          { type: "answer.reveal", at_seconds: 6.0 },
        ],
      },
      2.125, // 125ms into thinking -> frame 1
    );

    expect(renderedHtml).toContain("anchor-bottom_left");
    expect(renderedHtml).toContain("--mascot-placement-offset-x:25px");
    expect(renderedHtml).toContain("--mascot-placement-offset-y:-10px");
    expect(renderedHtml).toContain("--mascot-scale:1.4");
    expect(renderedHtml).toContain('data-mascot-animation-frame="1"');
  });

  it("strictly halts pipeline and fails attempt when matting quality defect is encountered", async () => {
    const root = await createTestRoot();
    // Simulate matting failure on frame 5
    const { uploadService, orchestrator, repository } = setupPilotContext(root, { failFrameIndex: 5 });

    const mascotId = "owl-failing-mascot";
    const styleId = "pilot-failing-style";

    const upload = await uploadService.validateAndStageSourceVideo({
      mascotId,
      styleId,
      state: "thinking",
      slotIndex: 1,
      attemptId: 1,
      filename: "defective_video.mp4",
      buffer: dummyVideoBuffer,
      mimeType: "video/mp4",
    });

    const now = new Date().toISOString();
    const job: MascotVideoProcessingJob = {
      id: `job_${mascotId}_${styleId}_thinking_1_att1`,
      mascot_id: mascotId,
      style_id: styleId,
      state: "thinking",
      slot_index: 1,
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

    // Orchestration catches pipeline errors, updates job status to qa_failed, and returns it
    const resultJob = await orchestrator.runJobSync(job.id);
    expect(resultJob.status).toBe("qa_failed");
    expect(resultJob.error_message).toContain("Matting segmentation failed on frame 5");

    const failedJob = await repository.getJob(job.id);
    expect(failedJob?.status).toBe("qa_failed");
    expect(failedJob?.error_message).toContain("Matting segmentation failed on frame 5");

    // No active revision can be published
    const activeRevision = await repository.getActiveRevision(mascotId, styleId, "thinking", 1);
    expect(activeRevision).toBeNull();
  });
});
