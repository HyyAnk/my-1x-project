import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { ANIMATION_STATES, SLOTS_PER_STATE, type MascotProfile, type MascotVideoProcessingJob } from "@studio/shared";
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
  MascotMattingError,
  VideoStylePublishGateError,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

describe("Stage 17 — All-Style Rollout & Concurrency Limits", () => {
  const testRoots: string[] = [];

  afterEach(async () => {
    while (testRoots.length > 0) {
      const dir = testRoots.pop();
      if (dir) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // Cleanup best-effort
        }
      }
    }
  });

  async function createTestRoot(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "all-styles-rollout-test-"));
    testRoots.push(dir);
    return dir;
  }

  function createTestMattedPng(): Buffer {
    const width = 1280;
    const height = 720;
    const data = new Uint8Array(width * height * 4);

    for (let y = 144; y < 576; y++) {
      for (let x = 384; x < 896; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 79;
        data[idx + 1] = 70;
        data[idx + 2] = 229;
        data[idx + 3] = 255;
      }
    }

    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  function setupRolloutContext(
    root: string,
    options: {
      maxConcurrentJobs?: number;
      failingSlots?: Set<string>; // Set of "styleId:state:slotIndex"
    } = {},
  ) {
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

    const currentFailingSlots = new Set(options.failingSlots ?? []);

    const mattingAdapter = createMascotMattingAdapter({
      fixtureHandler: async (_input) => {
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
    const baseMattingService = createFrameMattingService(storageAdapter, mattingAdapter);

    // Dynamic failing wrapper to simulate defect on specific style slots
    const mattingService = {
      matteAttemptFrames: async (params: Parameters<typeof baseMattingService.matteAttemptFrames>[0]) => {
        const slotKey = `${params.styleId}:${params.state}:${params.slotIndex}`;
        if (currentFailingSlots.has(slotKey)) {
          throw new MascotMattingError(`Simulated matting defect on ${slotKey}`);
        }
        return baseMattingService.matteAttemptFrames(params);
      },
    };

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
      maxConcurrentJobs: options.maxConcurrentJobs ?? 4,
    });

    const rolloutService = createVideoRolloutService({
      videoProcessingRepository: repository,
      storageAdapter,
      packagingService,
    });

    return {
      storageAdapter,
      repository,
      uploadService,
      orchestrator,
      rolloutService,
      clearFailingSlot: (slotKey: string) => currentFailingSlots.delete(slotKey),
      setFailingSlot: (slotKey: string) => currentFailingSlots.add(slotKey),
    };
  }

  const dummyVideoBuffer = Buffer.alloc(2048, "mock-mp4-video-1280x720");

  it("processes multi-style rollout with 20 slots per style, bounded concurrency, publish gate rejection, and failed-slot recovery", async () => {
    const root = await createTestRoot();
    const failingSlots = new Set(["athletic:celebrate:7"]);

    const { uploadService, orchestrator, repository, rolloutService, clearFailingSlot } = setupRolloutContext(root, {
      maxConcurrentJobs: 4,
      failingSlots,
    });

    const mascotId = "owl-multi-style";
    const styles = ["academic", "athletic"];

    const multiStyleMascot: MascotProfile = {
      id: mascotId,
      name: "Professor Bubo",
      description: "Two styles: academic and athletic with 20 slots each",
      visual_style: "pixar_3d",
      master_prompt: "Scholarly owl in library with spectacles",
      master_image_url: "/mascot/bubo/master.png",
      color_theme: "#4f46e5",
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      actions: {},
      styles: [
        {
          id: "academic",
          name: "Academic Core",
          keyword: "scholarly",
          anchor_image_url: "/mascot/bubo/academic.png",
          is_default: true,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
          states: { thinking: [], celebrate: [] },
        },
        {
          id: "athletic",
          name: "Athletic Edition",
          keyword: "sporty",
          anchor_image_url: "/mascot/bubo/athletic.png",
          is_default: false,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
          states: { thinking: [], celebrate: [] },
        },
      ],
    };

    // 1. Stage and schedule all 40 slots across both styles (20 slots each)
    const scheduledJobs: MascotVideoProcessingJob[] = [];

    for (const styleId of styles) {
      for (const state of ANIMATION_STATES) {
        for (let slot = 1; slot <= SLOTS_PER_STATE; slot++) {
          const upload = await uploadService.validateAndStageSourceVideo({
            mascotId,
            styleId,
            state,
            slotIndex: slot,
            attemptId: 1,
            filename: `${styleId}_${state}_${slot}.mp4`,
            buffer: dummyVideoBuffer,
            mimeType: "video/mp4",
          });

          const now = new Date().toISOString();
          const job: MascotVideoProcessingJob = {
            id: `job_${mascotId}_${styleId}_${state}_${slot}_att1`,
            mascot_id: mascotId,
            style_id: styleId,
            state,
            slot_index: slot,
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
          scheduledJobs.push(job);
        }
      }
    }

    expect(scheduledJobs.length).toBe(40);

    // 2. Process all jobs with bounded concurrency in chunks of 8
    const chunkSize = 8;
    for (let i = 0; i < scheduledJobs.length; i += chunkSize) {
      const chunk = scheduledJobs.slice(i, i + chunkSize);
      await Promise.all(chunk.map((job) => orchestrator.runJobSync(job.id)));
    }

    // 3. Inspect Style 1 (academic): All 20 slots must be ready
    const academicReadiness = await rolloutService.getStyleReadiness(mascotId, "academic");
    expect(academicReadiness.eligible).toBe(true);
    expect(academicReadiness.readyCount).toBe(20);
    expect(academicReadiness.totalRequired).toBe(20);
    expect(academicReadiness.failedCount).toBe(0);
    expect(academicReadiness.missingSlots.length).toBe(0);

    // Publish Style 1 -> must succeed with 20 published state variants
    const academicPublishResult = await rolloutService.publishStyleVideoAnimations(multiStyleMascot, "academic");
    expect(academicPublishResult.publishedCount).toBe(20);
    expect(academicPublishResult.updatedStyle.states?.thinking.length).toBe(10);
    expect(academicPublishResult.updatedStyle.states?.celebrate.length).toBe(10);

    // 4. Inspect Style 2 (athletic): 19 slots ready, 1 slot (celebrate:7) failed
    const athleticReadiness = await rolloutService.getStyleReadiness(mascotId, "athletic");
    expect(athleticReadiness.eligible).toBe(false);
    expect(athleticReadiness.readyCount).toBe(19);
    expect(athleticReadiness.totalRequired).toBe(20);
    expect(athleticReadiness.failedCount).toBe(1);
    expect(athleticReadiness.missingSlots).toEqual([
      expect.objectContaining({
        state: "celebrate",
        slotIndex: 7,
        status: "qa_failed",
      }),
    ]);

    // Attempting to publish Style 2 must be strictly rejected with VideoStylePublishGateError
    await expect(rolloutService.publishStyleVideoAnimations(multiStyleMascot, "athletic")).rejects.toThrow(VideoStylePublishGateError);

    // 5. Failed-Slot Recovery: Clear defect on celebrate:7 and retry
    clearFailingSlot("athletic:celebrate:7");

    const retryJob = await orchestrator.retrySlot(mascotId, "athletic", "celebrate", 7);
    expect(retryJob.attempt).toBe(2);
    expect(retryJob.status).toBe("queued");

    // Run the retry job
    const finalRetryJob = await orchestrator.runJobSync(retryJob.id);
    expect(finalRetryJob.status).toBe("ready");

    // Verify athletic readiness after recovery
    const athleticRecoveredReadiness = await rolloutService.getStyleReadiness(mascotId, "athletic");
    expect(athleticRecoveredReadiness.eligible).toBe(true);
    expect(athleticRecoveredReadiness.readyCount).toBe(20);
    expect(athleticRecoveredReadiness.failedCount).toBe(0);
    expect(athleticRecoveredReadiness.missingSlots.length).toBe(0);

    // Publish Style 2 -> now strictly succeeds
    const athleticPublishResult = await rolloutService.publishStyleVideoAnimations(multiStyleMascot, "athletic");
    expect(athleticPublishResult.publishedCount).toBe(20);
    expect(athleticPublishResult.updatedStyle.states?.thinking.length).toBe(10);
    expect(athleticPublishResult.updatedStyle.states?.celebrate.length).toBe(10);

    // 6. Readiness Report & No Silent Skips Audit
    const overallReport = await rolloutService.getAllStylesRolloutReport(multiStyleMascot);
    expect(overallReport.totalStyles).toBe(2);
    expect(overallReport.completedStyles).toBe(2);
    expect(overallReport.allEligible).toBe(true);

    // Both styles have 20/20 slots ready with zero missing
    expect(overallReport.styleReports["academic"].readySlots).toBe(20);
    expect(overallReport.styleReports["academic"].failedSlots).toBe(0);
    expect(overallReport.styleReports["athletic"].readySlots).toBe(20);
    expect(overallReport.styleReports["athletic"].failedSlots).toBe(0);

    // Verify all 40 slot projections exist on disk
    const academicProjections = await repository.listSlotProjections(mascotId, "academic");
    const athleticProjections = await repository.listSlotProjections(mascotId, "athletic");
    expect(academicProjections.length).toBe(20);
    expect(athleticProjections.length).toBe(20);
    expect(academicProjections.every((p) => p.status === "ready")).toBe(true);
    expect(athleticProjections.every((p) => p.status === "ready")).toBe(true);
  }, 120_000);
});
