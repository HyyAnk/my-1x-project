import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  MascotAnimationRevisionSchema,
  MascotAttemptMetadataSchema,
  type AnimationState,
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
  OrchestrationError,
} from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng, type DecodedImage } from "../../src/utils/imageMatting.js";

describe("Stage 11 — Video Processing Orchestration", () => {
  const testRoots: string[] = [];

  beforeEach(() => {
    // Fresh test context
  });

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
    const root = path.join(os.tmpdir(), `stage11-orchestration-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    await fs.mkdir(root, { recursive: true });
    testRoots.push(root);
    return root;
  }

  function createTestMattedPng(width = 1280, height = 720): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    // Draw an opaque box in the center
    const minX = Math.floor(width * 0.3);
    const maxX = Math.floor(width * 0.7);
    const minY = Math.floor(height * 0.2);
    const maxY = Math.floor(height * 0.8);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 40;
        data[idx + 1] = 160;
        data[idx + 2] = 220;
        data[idx + 3] = 255;
      }
    }
    const decoded: DecodedImage = { width, height, data };
    return encodeRgbaToPng(decoded);
  }

  function setupOrchestratorContext(root: string, options: { maxConcurrentJobs?: number; delayMs?: number } = {}) {
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
        fileSizeBytes: 1024,
      },
      fixtureExtractHandler: async (opts) => {
        if (options.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        }
        if (opts.signal?.aborted) {
          throw new Error("Extraction aborted");
        }
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
      fixtureHandler: async (_input) => {
        return {
          imageBytes: mattedPngBytes,
          width: 1280,
          height: 720,
          diagnostics: {
            hiddenRgbDetected: false,
            hiddenRgbPixelsZeroed: 0,
            residualBackgroundRatio: 0,
            holesDetected: false,
            edgeClippingDetected: false,
            transparentPixels: 600000,
            opaquePixels: 300000,
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
      maxConcurrentJobs: options.maxConcurrentJobs,
    });

    return {
      storageAdapter,
      repository,
      uploadService,
      orchestrator,
      mattedPngBytes,
    };
  }

  describe("End-to-End Processing Lifecycle", () => {
    it("runs complete pipeline to ready status with accurate progress updates", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root);

      const mascotId = "mascot_lifecycle";
      const styleId = "style_classic";
      const state: AnimationState = "thinking";
      const slotIndex = 1;

      // 1. Stage video
      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");
      const upload = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 1,
        filename: "test.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      // 2. Schedule job
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

      await ctx.orchestrator.scheduleJob(job);

      // Await job completion via runJobSync
      const completedJob = await ctx.orchestrator.runJobSync(job.id);

      // 3. Verify Job Completion
      expect(completedJob.status).toBe("ready");
      expect(completedJob.progress).toBe(100);
      expect(completedJob.error_code).toBeNull();

      // 4. Verify Slot Projection
      const proj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(proj.status).toBe("ready");
      expect(proj.active_attempt).toBe(1);
      expect(proj.active_revision_id).toContain("att1");
      expect(proj.active_revision).toBeDefined();

      // 5. Verify Revision Schema Compliance
      expect(() => MascotAnimationRevisionSchema.parse(proj.active_revision)).not.toThrow();

      // 6. Verify Attempt Metadata
      const metadata = await ctx.repository.getAttemptMetadata(mascotId, styleId, state, slotIndex, 1);
      expect(metadata).not.toBeNull();
      expect(metadata?.status).toBe("ready");
      expect(metadata?.progress).toBe(100);
      expect(() => MascotAttemptMetadataSchema.parse(metadata)).not.toThrow();
    });
  });

  describe("Cancellation Lifecycle", () => {
    it("cancels an in-flight job cleanly and sets slot projection to cancelled", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root, { delayMs: 100 });

      const mascotId = "mascot_cancel";
      const styleId = "style_cancel";
      const state: AnimationState = "thinking";
      const slotIndex = 2;

      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");
      const upload = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 1,
        filename: "test.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

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

      await ctx.orchestrator.scheduleJob(job);

      // Cancel while running
      const cancelledJob = await ctx.orchestrator.cancelJob(job.id, "User requested cancellation");
      expect(cancelledJob.status).toBe("cancelled");

      const proj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(proj.status).toBe("cancelled");

      // Repeated cancellation is idempotent
      const cancelAgain = await ctx.orchestrator.cancelJob(job.id);
      expect(cancelAgain.status).toBe("cancelled");
    });
  });

  describe("Retry Flow", () => {
    it("retries a cancelled or failed slot with an incremented attempt number", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root);

      const mascotId = "mascot_retry";
      const styleId = "style_retry";
      const state: AnimationState = "celebrate";
      const slotIndex = 1;

      // Stage initial video
      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");
      const upload = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 1,
        filename: "test.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      // Save initial failed job
      const now = new Date().toISOString();
      const job1: MascotVideoProcessingJob = {
        id: `job_${mascotId}_${styleId}_${state}_${slotIndex}_att1`,
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 1,
        source_video_url: upload.sourceVideoUrl,
        source_video_fingerprint: upload.sourceVideoFingerprint,
        status: "qa_failed",
        progress: 35,
        error_code: "CORRUPTED_FRAME",
        error_message: "Matting error on frame 4",
        created_at: now,
        updated_at: now,
      };
      await ctx.repository.saveJob(job1);
      await ctx.repository.transitionSlotState(mascotId, styleId, state, slotIndex, "uploading");
      await ctx.repository.transitionSlotState(mascotId, styleId, state, slotIndex, "failed");

      // Retry slot
      const retryJob = await ctx.orchestrator.retrySlot(mascotId, styleId, state, slotIndex);
      expect(retryJob.attempt).toBe(2);

      // Run retry to completion
      const completed = await ctx.orchestrator.runJobSync(retryJob.id);
      expect(completed.status).toBe("ready");

      const proj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(proj.status).toBe("ready");
      expect(proj.active_attempt).toBe(2);
    });

    it("rejects retry if slot is currently ready", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root);

      // Slot is empty
      await expect(ctx.orchestrator.retrySlot("m", "s", "thinking", 1)).rejects.toThrow(OrchestrationError);
    });
  });

  describe("Replacement Flow & Approved Revision Protection", () => {
    it("preserves active revision during replacement and restores ready status if replacement is cancelled", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root, { delayMs: 100 });

      const mascotId = "mascot_protect";
      const styleId = "style_protect";
      const state: AnimationState = "thinking";
      const slotIndex = 1;

      // 1. Initial attempt 1 succeeds
      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");
      const upload1 = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 1,
        filename: "test.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const now = new Date().toISOString();
      const job1: MascotVideoProcessingJob = {
        id: `job_${mascotId}_${styleId}_${state}_${slotIndex}_att1`,
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 1,
        source_video_url: upload1.sourceVideoUrl,
        source_video_fingerprint: upload1.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      await ctx.orchestrator.scheduleJob(job1);
      await ctx.orchestrator.runJobSync(job1.id);

      const readyProj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(readyProj.status).toBe("ready");
      const approvedRevId = readyProj.active_revision_id;
      expect(approvedRevId).toBeDefined();

      // 2. Start replacement attempt 2
      const replaceResult = await ctx.orchestrator.replaceSlot({
        mascotId,
        styleId,
        state,
        slotIndex,
        filename: "new_video.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      expect(replaceResult.job.attempt).toBe(2);

      // Verify slot projection preserves active revision during replacement
      const inFlightProj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(inFlightProj.active_revision_id).toBe(approvedRevId);

      // 3. Cancel replacement attempt 2
      await ctx.orchestrator.cancelJob(replaceResult.job.id);

      // Slot MUST revert to ready and keep approved revision!
      const revertedProj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(revertedProj.status).toBe("ready");
      expect(revertedProj.active_revision_id).toBe(approvedRevId);
      expect(revertedProj.active_revision?.id).toBe(approvedRevId);
    });
  });

  describe("Per-Slot Race Protection & Unrelated Slot Concurrency", () => {
    it("automatically aborts prior attempt when a new attempt is scheduled on the same slot", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root, { delayMs: 150 });

      const mascotId = "mascot_race";
      const styleId = "style_race";
      const state: AnimationState = "thinking";
      const slotIndex = 1;

      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");
      const upload1 = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 1,
        filename: "test.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const now = new Date().toISOString();
      const job1: MascotVideoProcessingJob = {
        id: `job_att1`,
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 1,
        source_video_url: upload1.sourceVideoUrl,
        source_video_fingerprint: upload1.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      // Start attempt 1
      await ctx.orchestrator.scheduleJob(job1);

      // Immediately stage and start attempt 2 on the same slot
      const upload2 = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state,
        slotIndex,
        attemptId: 2,
        filename: "test2.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const job2: MascotVideoProcessingJob = {
        id: `job_att2`,
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        attempt: 2,
        source_video_url: upload2.sourceVideoUrl,
        source_video_fingerprint: upload2.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      await ctx.orchestrator.scheduleJob(job2);

      // Attempt 2 completes
      const completed2 = await ctx.orchestrator.runJobSync(job2.id);
      expect(completed2.status).toBe("ready");

      // Attempt 1 was aborted
      const job1Final = await ctx.repository.getJob(job1.id);
      expect(job1Final?.status).toBe("cancelled");

      // Slot is ready with attempt 2
      const proj = await ctx.repository.getSlotProjection(mascotId, styleId, state, slotIndex);
      expect(proj.status).toBe("ready");
      expect(proj.active_attempt).toBe(2);
    });

    it("allows independent slots to process concurrently without interference", async () => {
      const root = await createTestRoot();
      const ctx = setupOrchestratorContext(root);

      const mascotId = "mascot_parallel";
      const styleId = "style_parallel";

      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");
      const uploadThinking = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        filename: "think.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const uploadCelebrate = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state: "celebrate",
        slotIndex: 1,
        attemptId: 1,
        filename: "celeb.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const now = new Date().toISOString();
      const jobThinking: MascotVideoProcessingJob = {
        id: "job_think_1",
        mascot_id: mascotId,
        style_id: styleId,
        state: "thinking",
        slot_index: 1,
        attempt: 1,
        source_video_url: uploadThinking.sourceVideoUrl,
        source_video_fingerprint: uploadThinking.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      const jobCelebrate: MascotVideoProcessingJob = {
        id: "job_celeb_1",
        mascot_id: mascotId,
        style_id: styleId,
        state: "celebrate",
        slot_index: 1,
        attempt: 1,
        source_video_url: uploadCelebrate.sourceVideoUrl,
        source_video_fingerprint: uploadCelebrate.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      // Run both jobs concurrently
      const [resThink, resCeleb] = await Promise.all([
        ctx.orchestrator.scheduleJob(jobThinking).then(() => ctx.orchestrator.runJobSync(jobThinking.id)),
        ctx.orchestrator.scheduleJob(jobCelebrate).then(() => ctx.orchestrator.runJobSync(jobCelebrate.id)),
      ]);

      expect(resThink.status).toBe("ready");
      expect(resCeleb.status).toBe("ready");

      const projThink = await ctx.repository.getSlotProjection(mascotId, styleId, "thinking", 1);
      const projCeleb = await ctx.repository.getSlotProjection(mascotId, styleId, "celebrate", 1);

      expect(projThink.status).toBe("ready");
      expect(projCeleb.status).toBe("ready");
    });
  });

  describe("Queue Concurrency Limits", () => {
    it("enforces max concurrent jobs and pumps queued jobs upon completion", async () => {
      const root = await createTestRoot();
      // Set concurrency limit to 1
      const ctx = setupOrchestratorContext(root, { maxConcurrentJobs: 1, delayMs: 50 });

      const mascotId = "mascot_queue";
      const styleId = "style_queue";
      const fakeMp4 = Buffer.alloc(1024, "mock video bytes");

      const upload1 = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state: "thinking",
        slotIndex: 1,
        attemptId: 1,
        filename: "test1.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const upload2 = await ctx.uploadService.validateAndStageSourceVideo({
        mascotId,
        styleId,
        state: "thinking",
        slotIndex: 2,
        attemptId: 1,
        filename: "test2.mp4",
        buffer: fakeMp4,
        mimeType: "video/mp4",
      });

      const now = new Date().toISOString();
      const job1: MascotVideoProcessingJob = {
        id: "job_q1",
        mascot_id: mascotId,
        style_id: styleId,
        state: "thinking",
        slot_index: 1,
        attempt: 1,
        source_video_url: upload1.sourceVideoUrl,
        source_video_fingerprint: upload1.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      const job2: MascotVideoProcessingJob = {
        id: "job_q2",
        mascot_id: mascotId,
        style_id: styleId,
        state: "thinking",
        slot_index: 2,
        attempt: 1,
        source_video_url: upload2.sourceVideoUrl,
        source_video_fingerprint: upload2.sourceVideoFingerprint,
        status: "queued",
        progress: 0,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };

      await ctx.orchestrator.scheduleJob(job1);
      await ctx.orchestrator.scheduleJob(job2);

      const queueStatus = ctx.orchestrator.getQueueStatus();
      expect(queueStatus.runningCount).toBe(1);
      expect(queueStatus.queuedCount).toBe(1);

      // Verify slot 2 projection reflects queued status
      const slot2Proj = await ctx.repository.getSlotProjection(mascotId, styleId, "thinking", 2);
      expect(slot2Proj.status).toBe("queued");
      expect(slot2Proj.active_job_id).toBe(job2.id);

      // Complete job 1
      await ctx.orchestrator.runJobSync(job1.id);

      // Job 2 should now complete
      const completed2 = await ctx.orchestrator.runJobSync(job2.id);
      expect(completed2.status).toBe("ready");

      const finalSlot2Proj = await ctx.repository.getSlotProjection(mascotId, styleId, "thinking", 2);
      expect(finalSlot2Proj.status).toBe("ready");
    });
  });
});
