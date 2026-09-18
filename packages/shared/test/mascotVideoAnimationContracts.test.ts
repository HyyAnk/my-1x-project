import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  MascotSourceVariantSchema,
  MascotVideoProcessingJobSchema,
  MascotAnimationQaReportSchema,
  MascotProcessedAnimationSchema,
  MascotAnimationRevisionSchema,
  MascotVideoAnimationManifestSchema,
  isValidSlotStateTransition,
  computeVideoSourceFingerprint,
  computeVideoProcessingFingerprint,
  isProcessedAnimationPublishEligible,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  ANIMATION_DURATION_MS,
  type MascotSourceVariant,
  type MascotVideoProcessingJob,
  type MascotProcessedAnimation,
  type MascotAnimationRevision,
  type MascotVideoAnimationManifest,
  type MascotAnimationQaReport,
  type MascotFrameRect,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

function createValid12Frames(): MascotFrameRect[] {
  return Array.from({ length: 12 }, (_, index) => ({
    index,
    x: index * 128,
    y: 0,
    width: 128,
    height: 128,
    duration_ms: 125,
  }));
}

function createValidSourceVariant(overrides: Partial<MascotSourceVariant> = {}): MascotSourceVariant {
  return {
    style_id: "style_pixel",
    state: "thinking",
    slot_index: 1,
    image_url: "/assets/mascots/owl/source_01.png",
    raw_image_url: "/assets/mascots/owl/raw_01.png",
    transparent_image_url: "/assets/mascots/owl/transparent_01.png",
    canvas: { width: 1280, height: 720 },
    content_bounds: { x: 200, y: 100, width: 880, height: 620 },
    pivot: { x: 640, y: 720 },
    source_fingerprint: "src_fp_1234567890abcdef1234567890abcdef",
    status: "empty",
    ...overrides,
  };
}

function createValidProcessingJob(overrides: Partial<MascotVideoProcessingJob> = {}): MascotVideoProcessingJob {
  return {
    id: "job_video_001",
    mascot_id: "mascot_alpha",
    style_id: "style_pixel",
    state: "thinking",
    slot_index: 1,
    attempt: 1,
    source_video_url: "/uploads/mascot_source_01.mp4",
    source_video_fingerprint: "vid_fp_9876543210fedcba9876543210fedcba",
    status: "queued",
    progress: 0,
    error_code: null,
    error_message: null,
    created_at: "2026-09-13T10:00:00.000Z",
    updated_at: "2026-09-13T10:00:00.000Z",
    ...overrides,
  };
}

function createValidQaReport(): MascotAnimationQaReport {
  return {
    overall_pass: true,
    fingerprint: "qa_fp_0123456789abcdef",
    gates: {
      decode: { passed: true, name: "Frame Decode", details: "All 12 frames decoded" },
      matting: { passed: true, name: "Frame Matting", details: "100% alpha matting success" },
      cleanliness: { passed: true, name: "Alpha Cleanliness", details: "Zero hidden RGB" },
      stability: { passed: true, name: "Visual Stability", details: "Flicker score 0.02" },
      registration: { passed: true, name: "Registration", details: "Drift 0.5px within tolerance" },
      loop: { passed: true, name: "Loop Policy", details: "Seam verified" },
    },
    metrics: {
      frame_count: 12,
      expected_frames: 12,
      matted_frames: 12,
      matting_success_rate: 1.0,
      alpha_cleanliness: {
        hidden_rgb_detected: false,
        residual_background_ratio: 0.001,
      },
      visual_stability: {
        alpha_flicker_score: 0.02,
        holes_detected: false,
        edge_clipping_detected: false,
      },
      registration: {
        common_bounds: { x: 200, y: 100, width: 880, height: 620 },
        common_pivot: { x: 640, y: 720 },
        max_drift_px: 0.5,
      },
      loop_policy: {
        policy: "loop",
        passed: true,
        seam_difference: 0.015,
        rest_held: true,
      },
    },
    checked_at: "2026-09-13T10:01:00.000Z",
  };
}

function createValidProcessedAnimation(overrides: Partial<MascotProcessedAnimation> = {}): MascotProcessedAnimation {
  return {
    version: 1,
    style_id: "style_pixel",
    state: "thinking",
    slot_index: 1,
    source_video_url: "/uploads/mascot_source_01.mp4",
    atlas_url: "/assets/animations/atlas_01.png",
    manifest_url: "/assets/animations/manifest_01.json",
    frame_urls: Array.from({ length: 12 }, (_, i) => `/assets/animations/frame_${i + 1}.png`),
    frame_count: REQUIRED_FRAME_COUNT,
    source_fps: 24,
    playback_fps: REQUIRED_FPS,
    duration_ms: ANIMATION_DURATION_MS,
    loop_mode: "loop",
    canvas: { width: 1280, height: 720 },
    content_bounds: { x: 200, y: 100, width: 880, height: 620 },
    pivot: { x: 640, y: 720 },
    registration: {
      source_width: 1280,
      source_height: 720,
      content_bounds: { x: 200, y: 100, width: 880, height: 620 },
      pivot: { x: 640, y: 720 },
      offset_x: 0,
      offset_y: 0,
    },
    source_fingerprint: "src_fp_1234567890abcdef",
    processing_fingerprint: "proc_fp_1234567890abcdef",
    qa_report_url: "/assets/animations/qa_01.json",
    qa_report: createValidQaReport(),
    status: "ready",
    ...overrides,
  };
}

describe("Mascot Video Animation Contracts (Stage 04)", () => {
  describe("MascotSourceVariantSchema validation", () => {
    it("validates a compliant 16:9 source variant", () => {
      const variant = createValidSourceVariant();
      const parsed = MascotSourceVariantSchema.parse(variant);

      assert.equal(parsed.style_id, "style_pixel");
      assert.equal(parsed.state, "thinking");
      assert.equal(parsed.slot_index, 1);
      assert.equal(parsed.canvas.width, 1280);
      assert.equal(parsed.canvas.height, 720);
      assert.equal(parsed.status, "empty");
    });

    it("rejects invalid slot_index outside 1-10 range", () => {
      assert.throws(() => MascotSourceVariantSchema.parse(createValidSourceVariant({ slot_index: 0 })));
      assert.throws(() => MascotSourceVariantSchema.parse(createValidSourceVariant({ slot_index: 11 })));
    });

    it("rejects content bounds exceeding canvas boundaries", () => {
      assert.throws(
        () =>
          MascotSourceVariantSchema.parse(
            createValidSourceVariant({
              content_bounds: { x: 1200, y: 100, width: 200, height: 500 },
            }),
          ),
        /Content bounds exceed canvas width/,
      );
      assert.throws(
        () =>
          MascotSourceVariantSchema.parse(
            createValidSourceVariant({
              content_bounds: { x: 100, y: 600, width: 500, height: 200 },
            }),
          ),
        /Content bounds exceed canvas height/,
      );
    });

    it("rejects pivot exceeding canvas boundaries", () => {
      assert.throws(
        () =>
          MascotSourceVariantSchema.parse(
            createValidSourceVariant({
              pivot: { x: 1290, y: 700 },
            }),
          ),
        /Pivot exceeds canvas width/,
      );
      assert.throws(
        () =>
          MascotSourceVariantSchema.parse(
            createValidSourceVariant({
              pivot: { x: 600, y: 730 },
            }),
          ),
        /Pivot exceeds canvas height/,
      );
    });

    it("rejects empty style_id or empty source_fingerprint", () => {
      assert.throws(() => MascotSourceVariantSchema.parse(createValidSourceVariant({ style_id: "   " })), /Style ID cannot be empty/);
      assert.throws(
        () => MascotSourceVariantSchema.parse(createValidSourceVariant({ source_fingerprint: "" })),
        /Source fingerprint cannot be empty/,
      );
    });
  });

  describe("MascotVideoProcessingJobSchema validation", () => {
    it("validates a compliant processing job", () => {
      const job = createValidProcessingJob();
      const parsed = MascotVideoProcessingJobSchema.parse(job);

      assert.equal(parsed.id, "job_video_001");
      assert.equal(parsed.status, "queued");
      assert.equal(parsed.progress, 0);
      assert.equal(parsed.attempt, 1);
    });

    it("accepts all allowed job statuses", () => {
      const allowedStatuses = ["queued", "uploading", "processing", "qa_failed", "ready", "cancelled"] as const;
      for (const status of allowedStatuses) {
        const parsed = MascotVideoProcessingJobSchema.parse(createValidProcessingJob({ status }));
        assert.equal(parsed.status, status);
      }
    });

    it("rejects invalid status", () => {
      assert.throws(() =>
        MascotVideoProcessingJobSchema.parse(createValidProcessingJob({ status: "invalid_status" as unknown as "queued" })),
      );
    });

    it("rejects out-of-range progress or negative attempt", () => {
      assert.throws(() => MascotVideoProcessingJobSchema.parse(createValidProcessingJob({ progress: -1 })));
      assert.throws(() => MascotVideoProcessingJobSchema.parse(createValidProcessingJob({ progress: 101 })));
      assert.throws(() => MascotVideoProcessingJobSchema.parse(createValidProcessingJob({ attempt: 0 })));
    });
  });

  describe("Slot State Machine & Transition Rules", () => {
    it("validates allowed forward workflow transitions", () => {
      assert.equal(isValidSlotStateTransition("empty", "uploading"), true);
      assert.equal(isValidSlotStateTransition("uploading", "processing"), true);
      assert.equal(isValidSlotStateTransition("processing", "ready"), true);
    });

    it("validates retry transitions from failures", () => {
      assert.equal(isValidSlotStateTransition("processing", "failed"), true);
      assert.equal(isValidSlotStateTransition("processing", "qa_failed"), true);
      assert.equal(isValidSlotStateTransition("failed", "retrying"), true);
      assert.equal(isValidSlotStateTransition("qa_failed", "retrying"), true);
      assert.equal(isValidSlotStateTransition("retrying", "processing"), true);
    });

    it("validates replacement workflow on approved revisions", () => {
      assert.equal(isValidSlotStateTransition("ready", "replacing"), true);
      assert.equal(isValidSlotStateTransition("replacing", "processing"), true);
    });

    it("validates cancellation paths", () => {
      assert.equal(isValidSlotStateTransition("processing", "cancelled"), true);
      assert.equal(isValidSlotStateTransition("cancelled", "retrying"), true);
    });

    it("validates queued transitions under concurrency control", () => {
      assert.equal(isValidSlotStateTransition("uploading", "queued"), true);
      assert.equal(isValidSlotStateTransition("queued", "processing"), true);
      assert.equal(isValidSlotStateTransition("queued", "cancelled"), true);
      assert.equal(isValidSlotStateTransition("queued", "ready"), true);
      assert.equal(isValidSlotStateTransition("retrying", "queued"), true);
      assert.equal(isValidSlotStateTransition("replacing", "queued"), true);
    });

    it("rejects invalid state machine leaps", () => {
      assert.equal(isValidSlotStateTransition("empty", "ready"), false);
      assert.equal(isValidSlotStateTransition("empty", "processing"), false);
      assert.equal(isValidSlotStateTransition("ready", "failed"), false);
      assert.equal(isValidSlotStateTransition("ready", "empty"), false);
      assert.equal(isValidSlotStateTransition("processing", "empty"), false);
    });
  });

  describe("MascotAnimationQaReportSchema validation", () => {
    it("validates a compliant QA report", () => {
      const report = createValidQaReport();
      const parsed = MascotAnimationQaReportSchema.parse(report);

      assert.equal(parsed.overall_pass, true);
      assert.equal(parsed.metrics.frame_count, 12);
      assert.equal(parsed.metrics.matting_success_rate, 1.0);
      assert.equal(parsed.metrics.alpha_cleanliness.hidden_rgb_detected, false);
      assert.equal(parsed.metrics.visual_stability.holes_detected, false);
      assert.equal(parsed.metrics.registration.max_drift_px, 0.5);
    });

    it("rejects negative metric numbers or rates over 1", () => {
      const invalidReport = createValidQaReport();
      invalidReport.metrics.matting_success_rate = 1.2;
      assert.throws(() => MascotAnimationQaReportSchema.parse(invalidReport));

      const negativeDriftReport = createValidQaReport();
      negativeDriftReport.metrics.registration.max_drift_px = -1;
      assert.throws(() => MascotAnimationQaReportSchema.parse(negativeDriftReport));
    });
  });

  describe("MascotProcessedAnimationSchema and MascotAnimationRevisionSchema", () => {
    it("validates a fully compliant processed animation", () => {
      const anim = createValidProcessedAnimation();
      const parsed = MascotProcessedAnimationSchema.parse(anim);

      assert.equal(parsed.version, 1);
      assert.equal(parsed.frame_count, 12);
      assert.equal(parsed.playback_fps, 8);
      assert.equal(parsed.duration_ms, 1500);
      assert.equal(parsed.frame_urls.length, 12);
      assert.equal(parsed.status, "ready");
      assert.equal(isProcessedAnimationPublishEligible(parsed), true);
    });

    it("validates an immutable animation revision", () => {
      const rev: MascotAnimationRevision = {
        ...createValidProcessedAnimation(),
        id: "rev_01_attempt_1",
        attempt: 1,
        created_at: "2026-09-13T10:01:00.000Z",
      };

      const parsed = MascotAnimationRevisionSchema.parse(rev);
      assert.equal(parsed.id, "rev_01_attempt_1");
      assert.equal(parsed.attempt, 1);
    });

    it("accepts dynamic duration, fps, and frame_count", () => {
      const dynamicAnim = createValidProcessedAnimation({
        frame_count: 96,
        playback_fps: 24,
        duration_ms: 4000,
        frame_urls: Array.from({ length: 96 }, (_, i) => `/assets/animations/frame_${i + 1}.png`),
      });
      const parsed = MascotProcessedAnimationSchema.parse(dynamicAnim);
      assert.equal(parsed.frame_count, 96);
      assert.equal(parsed.playback_fps, 24);
      assert.equal(parsed.duration_ms, 4000);
      assert.equal(parsed.frame_urls?.length, 96);
    });

    it("rejects non-positive frame_count, playback_fps, or duration_ms", () => {
      assert.throws(() => MascotProcessedAnimationSchema.parse(createValidProcessedAnimation({ frame_count: 0 })));
      assert.throws(() => MascotProcessedAnimationSchema.parse(createValidProcessedAnimation({ playback_fps: -5 })));
      assert.throws(() => MascotProcessedAnimationSchema.parse(createValidProcessedAnimation({ duration_ms: 0 })));
    });

    it("rejects registration dimensions mismatching canvas dimensions", () => {
      assert.throws(
        () =>
          MascotProcessedAnimationSchema.parse(
            createValidProcessedAnimation({
              registration: {
                source_width: 1920,
                source_height: 1080,
                content_bounds: { x: 200, y: 100, width: 880, height: 620 },
                pivot: { x: 640, y: 720 },
                offset_x: 0,
                offset_y: 0,
              },
            }),
          ),
        /Registration source_width must match canvas width/,
      );
    });

    it("evaluates publish eligibility correctly for non-ready or invalid animations", () => {
      const failedAnim = createValidProcessedAnimation({ status: "qa_failed" });
      assert.equal(isProcessedAnimationPublishEligible(failedAnim), false);
    });
  });

  describe("MascotVideoAnimationManifestSchema validation", () => {
    it("validates a compliant video animation manifest artifact", () => {
      const manifest: MascotVideoAnimationManifest = {
        version: 1,
        style_id: "style_pixel",
        state: "celebrate",
        slot_index: 2,
        frame_count: 12,
        source_fps: 30,
        playback_fps: 8,
        duration_ms: 1500,
        loop: false,
        loop_mode: "one_shot_rest",
        atlas: {
          file_path: "atlas.png",
          width: 1536,
          height: 128,
        },
        frames: createValid12Frames(),
        canvas: { width: 1280, height: 720 },
        content_bounds: { x: 200, y: 100, width: 880, height: 620 },
        pivot: { x: 640, y: 720 },
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 200, y: 100, width: 880, height: 620 },
          pivot: { x: 640, y: 720 },
          offset_x: 0,
          offset_y: 0,
        },
        processing_fingerprint: "proc_fp_test_123",
      };

      const parsed = MascotVideoAnimationManifestSchema.parse(manifest);
      assert.equal(parsed.version, 1);
      assert.equal(parsed.style_id, "style_pixel");
      assert.equal(parsed.loop_mode, "one_shot_rest");
      assert.equal(parsed.frames.length, 12);
    });

    it("rejects frame exceeding atlas dimensions", () => {
      const invalidFrames = createValid12Frames();
      invalidFrames[11].x = 1500; // 1500 + 128 = 1628 > 1536 atlas width
      const invalidManifest = {
        version: 1,
        style_id: "style_pixel",
        state: "celebrate",
        slot_index: 2,
        frame_count: 12,
        playback_fps: 8,
        duration_ms: 1500,
        loop: false,
        loop_mode: "one_shot_rest",
        atlas: { width: 1536, height: 128 },
        frames: invalidFrames,
        canvas: { width: 1280, height: 720 },
        content_bounds: { x: 200, y: 100, width: 880, height: 620 },
        pivot: { x: 640, y: 720 },
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 200, y: 100, width: 880, height: 620 },
          pivot: { x: 640, y: 720 },
          offset_x: 0,
          offset_y: 0,
        },
        processing_fingerprint: "proc_fp_test_123",
      };

      assert.throws(() => MascotVideoAnimationManifestSchema.parse(invalidManifest), /exceeds atlas dimensions/);
    });
  });

  describe("Video Pipeline Fingerprint Determinism", () => {
    it("computes deterministic video source fingerprint", () => {
      const inputA = {
        videoSha256: "aabbccdd11223344aabbccdd11223344",
        durationMs: 1500,
        width: 1280,
        height: 720,
        fps: 29.97,
      };
      const inputB = { ...inputA };

      const fpA = computeVideoSourceFingerprint(inputA);
      const fpB = computeVideoSourceFingerprint(inputB);
      assert.equal(fpA, fpB);
      assert.equal(typeof fpA, "string");
      assert.equal(fpA.length, 64);

      // Mutation produces different hash
      const fpC = computeVideoSourceFingerprint({ ...inputA, durationMs: 1501 });
      assert.notEqual(fpA, fpC);
    });

    it("computes deterministic video processing fingerprint", () => {
      const inputA = {
        sourceVideoFingerprint: "src_vid_fp_123",
        frameCount: 12,
        playbackFps: 8,
        loopMode: "loop",
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 200, y: 100, width: 880, height: 620 },
          pivot: { x: 640, y: 720 },
          offset_x: 0,
          offset_y: 0,
        },
        frames: createValid12Frames(),
        atlasChecksum: "atlas_sha256_abcdef",
      };

      const fpA = computeVideoProcessingFingerprint(inputA);
      const fpB = computeVideoProcessingFingerprint({ ...inputA });
      assert.equal(fpA, fpB);

      // Frame mutation alters fingerprint
      const mutatedFrames = createValid12Frames();
      mutatedFrames[0].width = 130;
      const fpC = computeVideoProcessingFingerprint({ ...inputA, frames: mutatedFrames });
      assert.notEqual(fpA, fpC);
    });
  });
});
