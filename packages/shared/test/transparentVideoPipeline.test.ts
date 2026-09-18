import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  MascotProcessedAnimationSchema,
  MascotAnimationRevisionSchema,
  MascotVideoAnimationManifestSchema,
  MascotAnimationAssetV1Schema,
  AlphaCodecSchema,
  resolveAnimationFrameAtTime,
  computeVideoProcessingFingerprint,
  isProcessedAnimationPublishEligible,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  ANIMATION_DURATION_MS,
  type MascotProcessedAnimation,
  type MascotAnimationRevision,
  type MascotVideoAnimationManifest,
  type MascotFrameRect,
  type AnimationPlaybackTarget,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

function createMockFrames(count: number, fps: number): MascotFrameRect[] {
  const frameDurationMs = (1 / fps) * 1000;
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: (index % 10) * 128,
    y: Math.floor(index / 10) * 128,
    width: 128,
    height: 128,
    duration_ms: frameDurationMs,
  }));
}

function createBaseProcessedAnimation(overrides: Partial<MascotProcessedAnimation> = {}): MascotProcessedAnimation {
  return {
    version: 1,
    style_id: "style_pixel",
    state: "thinking",
    slot_index: 1,
    source_video_url: "/uploads/mascot_source.mp4",
    manifest_url: "/assets/animations/manifest.json",
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
    status: "ready",
    transparent_video_url: "/assets/animations/thinking_01.webm",
    alpha_codec: "vp9_alpha",
    ...overrides,
  };
}

describe("Transparent Video Animation Pipeline Contracts (Stage 1 Option B)", () => {
  describe("AlphaCodecSchema validation", () => {
    it("accepts supported alpha codecs", () => {
      assert.equal(AlphaCodecSchema.parse("vp9_alpha"), "vp9_alpha");
      assert.equal(AlphaCodecSchema.parse("raw_rgba"), "raw_rgba");
      assert.equal(AlphaCodecSchema.parse("none"), "none");
    });

    it("rejects unsupported codecs", () => {
      assert.throws(() => AlphaCodecSchema.parse("h264"));
      assert.throws(() => AlphaCodecSchema.parse("prores_4444"));
      assert.throws(() => AlphaCodecSchema.parse(""));
    });
  });

  describe("Dynamic 4-second video at 24 FPS (96 frames)", () => {
    const frameCount = 96;
    const fps = 24;
    const durationMs = 4000;
    const frames = createMockFrames(frameCount, fps);

    it("validates dynamic 4s processed animation with WebM VP9 transparent video", () => {
      const anim = createBaseProcessedAnimation({
        frame_count: frameCount,
        source_fps: 24,
        playback_fps: fps,
        duration_ms: durationMs,
        transparent_video_url: "/assets/animations/owl_thinking_4s_24fps.webm",
        alpha_codec: "vp9_alpha",
        frame_urls: Array.from({ length: frameCount }, (_, i) => `/frames/frame_${i}.png`),
      });

      const parsed = MascotProcessedAnimationSchema.parse(anim);
      assert.equal(parsed.frame_count, 96);
      assert.equal(parsed.playback_fps, 24);
      assert.equal(parsed.duration_ms, 4000);
      assert.equal(parsed.transparent_video_url, "/assets/animations/owl_thinking_4s_24fps.webm");
      assert.equal(parsed.alpha_codec, "vp9_alpha");
      assert.equal(isProcessedAnimationPublishEligible(parsed), true);
    });

    it("validates dynamic 4s revision record with transparent video", () => {
      const revision: MascotAnimationRevision = {
        ...createBaseProcessedAnimation({
          frame_count: frameCount,
          playback_fps: fps,
          duration_ms: durationMs,
          transparent_video_url: "/assets/animations/owl_thinking_4s_24fps.webm",
          alpha_codec: "vp9_alpha",
        }),
        id: "rev_4s_24fps_attempt_1",
        attempt: 1,
        created_at: "2026-09-14T12:00:00.000Z",
      };

      const parsed = MascotAnimationRevisionSchema.parse(revision);
      assert.equal(parsed.id, "rev_4s_24fps_attempt_1");
      assert.equal(parsed.frame_count, 96);
      assert.equal(parsed.duration_ms, 4000);
      assert.equal(parsed.transparent_video_url, "/assets/animations/owl_thinking_4s_24fps.webm");
    });

    it("validates dynamic 4s video animation manifest with transparent video url", () => {
      const manifest: MascotVideoAnimationManifest = {
        version: 1,
        style_id: "style_pixel",
        state: "thinking",
        slot_index: 1,
        frame_count: frameCount,
        source_fps: 24,
        playback_fps: fps,
        duration_ms: durationMs,
        loop: true,
        loop_mode: "loop",
        frames,
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
        processing_fingerprint: "proc_fp_4s_96frames",
        transparent_video_url: "/assets/animations/owl_thinking_4s_24fps.webm",
        alpha_codec: "vp9_alpha",
      };

      const parsed = MascotVideoAnimationManifestSchema.parse(manifest);
      assert.equal(parsed.frame_count, 96);
      assert.equal(parsed.playback_fps, 24);
      assert.equal(parsed.duration_ms, 4000);
      assert.equal(parsed.transparent_video_url, "/assets/animations/owl_thinking_4s_24fps.webm");
      assert.equal(parsed.frames?.length, 96);
    });

    it("resolves frame deterministically at arbitrary timestamps for 4s at 24 FPS", () => {
      const playbackTarget: AnimationPlaybackTarget = {
        frame_count: frameCount,
        playback_fps: fps,
        duration_ms: durationMs,
        loop: true,
        loop_policy: "loop",
        frames,
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 200, y: 100, width: 880, height: 620 },
          pivot: { x: 640, y: 720 },
          offset_x: 0,
          offset_y: 0,
        },
        transparent_video_url: "/assets/animations/owl_thinking_4s_24fps.webm",
      };

      // At 0.0s -> frame 0
      const res0 = resolveAnimationFrameAtTime(playbackTarget, 0.0);
      assert.equal(res0.frameIndex, 0);
      assert.equal(res0.cycleSeconds, 4.0);

      // At 1.0s -> frame 24
      const res1 = resolveAnimationFrameAtTime(playbackTarget, 1.0);
      assert.equal(res1.frameIndex, 24);

      // At 2.5s -> frame 60 (2.5 * 24 = 60)
      const res25 = resolveAnimationFrameAtTime(playbackTarget, 2.5);
      assert.equal(res25.frameIndex, 60);

      // At 3.99s -> frame 95
      const resLast = resolveAnimationFrameAtTime(playbackTarget, 3.99);
      assert.equal(resLast.frameIndex, 95);

      // At 4.0s (loop wrap) -> frame 0
      const resWrap = resolveAnimationFrameAtTime(playbackTarget, 4.0);
      assert.equal(resWrap.frameIndex, 0);

      // One-shot clamp at 4.0s+ -> frame 95 clamped
      const oneShotTarget: AnimationPlaybackTarget = {
        ...playbackTarget,
        loop: false,
        loop_policy: "one_shot_rest",
      };
      const resClamped = resolveAnimationFrameAtTime(oneShotTarget, 4.0);
      assert.equal(resClamped.frameIndex, 95);
      assert.equal(resClamped.isClamped, true);
    });
  });

  describe("Dynamic 10-second video at 30 FPS (300 frames)", () => {
    const frameCount = 300;
    const fps = 30;
    const durationMs = 10000;

    it("validates dynamic 10s processed animation with WebM VP9 transparent video", () => {
      const anim = createBaseProcessedAnimation({
        frame_count: frameCount,
        source_fps: 30,
        playback_fps: fps,
        duration_ms: durationMs,
        transparent_video_url: "/assets/animations/owl_celebrate_10s_30fps.webm",
        alpha_codec: "vp9_alpha",
      });

      const parsed = MascotProcessedAnimationSchema.parse(anim);
      assert.equal(parsed.frame_count, 300);
      assert.equal(parsed.playback_fps, 30);
      assert.equal(parsed.duration_ms, 10000);
      assert.equal(parsed.transparent_video_url, "/assets/animations/owl_celebrate_10s_30fps.webm");
      assert.equal(isProcessedAnimationPublishEligible(parsed), true);
    });

    it("validates dynamic 10s manifest without sprite atlas when transparent video is primary", () => {
      const manifest: MascotVideoAnimationManifest = {
        version: 1,
        style_id: "style_pixel",
        state: "celebrate",
        slot_index: 2,
        frame_count: frameCount,
        source_fps: 30,
        playback_fps: fps,
        duration_ms: durationMs,
        loop: false,
        loop_mode: "one_shot_rest",
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
        processing_fingerprint: "proc_fp_10s_300frames",
        transparent_video_url: "/assets/animations/owl_celebrate_10s_30fps.webm",
        alpha_codec: "vp9_alpha",
      };

      const parsed = MascotVideoAnimationManifestSchema.parse(manifest);
      assert.equal(parsed.frame_count, 300);
      assert.equal(parsed.duration_ms, 10000);
      assert.equal(parsed.atlas, undefined);
      assert.equal(parsed.transparent_video_url, "/assets/animations/owl_celebrate_10s_30fps.webm");
    });

    it("resolves frame deterministically for 10s at 30 FPS without frames array (video-primary fallback)", () => {
      const videoPrimaryTarget: AnimationPlaybackTarget = {
        frame_count: frameCount,
        playback_fps: fps,
        duration_ms: durationMs,
        loop: false,
        loop_mode: "one_shot_rest",
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 200, y: 100, width: 880, height: 620 },
          pivot: { x: 640, y: 720 },
          offset_x: 0,
          offset_y: 0,
        },
        transparent_video_url: "/assets/animations/owl_celebrate_10s_30fps.webm",
        alpha_codec: "vp9_alpha",
      };

      // At 5.0s -> frame 150
      const resMid = resolveAnimationFrameAtTime(videoPrimaryTarget, 5.0);
      assert.equal(resMid.frameIndex, 150);
      assert.equal(resMid.cycleSeconds, 10.0);
      assert.equal(resMid.isClamped, false);
      assert.equal(resMid.frame.index, 150);
      assert.equal(resMid.frame.width, 1280);
      assert.equal(resMid.frame.height, 720);

      // At 10.0s+ -> clamped to frame 299
      const resClamped = resolveAnimationFrameAtTime(videoPrimaryTarget, 10.0);
      assert.equal(resClamped.frameIndex, 299);
      assert.equal(resClamped.isClamped, true);
    });
  });

  describe("Backwards compatibility with 1.5s video at 8 FPS (12 frames)", () => {
    it("validates 1.5s 12-frame processed animation with atlas and frame_urls", () => {
      const anim = createBaseProcessedAnimation({
        frame_count: 12,
        playback_fps: 8,
        duration_ms: 1500,
        atlas_url: "/assets/animations/atlas_12.png",
        frame_urls: Array.from({ length: 12 }, (_, i) => `/frames/frame_${i}.png`),
      });

      const parsed = MascotProcessedAnimationSchema.parse(anim);
      assert.equal(parsed.frame_count, 12);
      assert.equal(parsed.playback_fps, 8);
      assert.equal(parsed.duration_ms, 1500);
      assert.equal(parsed.atlas_url, "/assets/animations/atlas_12.png");
      assert.equal(parsed.frame_urls?.length, 12);
    });

    it("validates 12-frame V1 animation asset schema unchanged", () => {
      const v1Frames: MascotFrameRect[] = Array.from({ length: 12 }, (_, index) => ({
        index,
        x: index * 128,
        y: 0,
        width: 128,
        height: 128,
        duration_ms: 125,
      }));

      const v1Asset = {
        version: 1 as const,
        state: "thinking" as const,
        atlas_url: "/assets/animations/v1_atlas.png",
        manifest_url: "/assets/animations/v1_manifest.json",
        frame_count: 12 as const,
        fps: 8 as const,
        loop: true,
        loop_policy: "loop" as const,
        frames: v1Frames,
        registration: {
          source_width: 1536,
          source_height: 128,
          content_bounds: { x: 10, y: 10, width: 100, height: 100 },
          pivot: { x: 64, y: 120 },
          offset_x: 0,
          offset_y: 0,
        },
        content_fingerprint: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        source_fingerprint: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      };

      const parsed = MascotAnimationAssetV1Schema.parse(v1Asset);
      assert.equal(parsed.frame_count, 12);
      assert.equal(parsed.fps, 8);
      assert.equal(parsed.frames.length, 12);
    });
  });

  describe("Fingerprint determinism with transparent video metadata", () => {
    it("computes deterministic processing fingerprint including transparent video and alpha codec", () => {
      const input = {
        sourceVideoFingerprint: "src_vid_fp_abc123",
        frameCount: 96,
        playbackFps: 24,
        loopMode: "loop",
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 200, y: 100, width: 880, height: 620 },
          pivot: { x: 640, y: 720 },
          offset_x: 0,
          offset_y: 0,
        },
        transparentVideoUrl: "/assets/animations/owl_96.webm",
        alphaCodec: "vp9_alpha" as const,
      };

      const fp1 = computeVideoProcessingFingerprint(input);
      const fp2 = computeVideoProcessingFingerprint({ ...input });
      assert.equal(fp1, fp2);
      assert.equal(typeof fp1, "string");
      assert.equal(fp1.length, 64);

      // Changing transparent video URL changes the fingerprint
      const fpDifferentUrl = computeVideoProcessingFingerprint({
        ...input,
        transparentVideoUrl: "/assets/animations/owl_96_v2.webm",
      });
      assert.notEqual(fp1, fpDifferentUrl);

      // Changing alpha codec changes the fingerprint
      const fpDifferentCodec = computeVideoProcessingFingerprint({
        ...input,
        alphaCodec: "raw_rgba" as const,
      });
      assert.notEqual(fp1, fpDifferentCodec);
    });
  });
});
