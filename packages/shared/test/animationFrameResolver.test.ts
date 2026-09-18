import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  computeAtlasCssOffset,
  resolveAnimationFrameAtTime,
  FRAME_DURATION_MS,
  type MascotAnimationAssetV1,
  type MascotFrameRect,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

function createUniformFrames(): MascotFrameRect[] {
  return Array.from({ length: 12 }, (_, index) => ({
    index,
    x: (index % 4) * 128,
    y: Math.floor(index / 4) * 128,
    width: 128,
    height: 128,
    duration_ms: FRAME_DURATION_MS,
  }));
}

function createTestAnimation(overrides: Partial<MascotAnimationAssetV1> = {}): MascotAnimationAssetV1 {
  return {
    version: 1,
    state: "thinking",
    atlas_url: "/mascot/assets/owl/thinking_atlas.png",
    manifest_url: "/mascot/assets/owl/thinking_manifest.json",
    frame_count: 12,
    fps: 8,
    loop: true,
    loop_policy: "loop",
    frames: createUniformFrames(),
    registration: {
      source_width: 512,
      source_height: 384,
      content_bounds: { x: 10, y: 10, width: 108, height: 108 },
      pivot: { x: 64, y: 128 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: "fingerprint-content-test-1234567890",
    source_fingerprint: "fingerprint-source-test-0987654321",
    slot_index: 1,
    recipe_id: "thinking-01-head-tilt-left",
    ...overrides,
  };
}

describe("Shared Animation Frame Resolver (Stage 13)", () => {
  describe("Exact frame boundary resolution", () => {
    const loopingAnimation = createTestAnimation({ loop: true, loop_policy: "loop" });

    it("resolves exact boundary at 0.0s to frame 0", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 0.0);
      assert.equal(result.frameIndex, 0);
      assert.equal(result.frame.index, 0);
      assert.equal(result.isClamped, false);
      assert.equal(result.atlasOffsets.offsetX, 0);
      assert.equal(result.atlasOffsets.offsetY, 0);
      assert.equal(result.atlasOffsets.cssBackgroundPosition, "0px 0px");
    });

    it("resolves exact boundary at 0.125s (frame 1 threshold) to frame 1", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 0.125);
      assert.equal(result.frameIndex, 1);
      assert.equal(result.frame.index, 1);
      assert.equal(result.atlasOffsets.offsetX, -128);
      assert.equal(result.atlasOffsets.offsetY, 0);
      assert.equal(result.atlasOffsets.cssBackgroundPosition, "-128px 0px");
    });

    it("resolves exact boundary at 1.375s to final frame 11", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 1.375);
      assert.equal(result.frameIndex, 11);
      assert.equal(result.frame.index, 11);
      assert.equal(result.atlasOffsets.offsetX, -384);
      assert.equal(result.atlasOffsets.offsetY, -256);
      assert.equal(result.atlasOffsets.cssBackgroundPosition, "-384px -256px");
    });

    it("resolves exact boundary at 1.5s to loop wrap back to frame 0", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 1.5);
      assert.equal(result.frameIndex, 0);
      assert.equal(result.frame.index, 0);
      assert.equal(result.isClamped, false);
      assert.equal(result.atlasOffsets.cssBackgroundPosition, "0px 0px");
    });

    it("wraps seamlessly across multiple cycles (e.g., 3.0s, 3.125s, 4.5s)", () => {
      assert.equal(resolveAnimationFrameAtTime(loopingAnimation, 3.0).frameIndex, 0);
      assert.equal(resolveAnimationFrameAtTime(loopingAnimation, 3.125).frameIndex, 1);
      assert.equal(resolveAnimationFrameAtTime(loopingAnimation, 4.375).frameIndex, 11);
      assert.equal(resolveAnimationFrameAtTime(loopingAnimation, 4.5).frameIndex, 0);
    });
  });

  describe("Mid-frame timestamp resolution", () => {
    const loopingAnimation = createTestAnimation({ loop: true, loop_policy: "loop" });

    it("resolves mid-frame at 0.06s to frame 0", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 0.06);
      assert.equal(result.frameIndex, 0);
      assert.equal(result.frame.index, 0);
    });

    it("resolves mid-frame at 0.19s to frame 1", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 0.19);
      assert.equal(result.frameIndex, 1);
      assert.equal(result.frame.index, 1);
    });

    it("resolves mid-frame at 1.45s to frame 11", () => {
      const result = resolveAnimationFrameAtTime(loopingAnimation, 1.45);
      assert.equal(result.frameIndex, 11);
      assert.equal(result.frame.index, 11);
    });
  });

  describe("One-shot / return-to-rest celebrate policy clamping", () => {
    const oneShotAnimation = createTestAnimation({
      state: "celebrate",
      loop: false,
      loop_policy: "one_shot_rest",
    });

    it("plays normally before 1.5s cycle duration", () => {
      assert.equal(resolveAnimationFrameAtTime(oneShotAnimation, 0.0).frameIndex, 0);
      assert.equal(resolveAnimationFrameAtTime(oneShotAnimation, 0.125).frameIndex, 1);
      assert.equal(resolveAnimationFrameAtTime(oneShotAnimation, 1.375).frameIndex, 11);
      assert.equal(resolveAnimationFrameAtTime(oneShotAnimation, 1.375).isClamped, false);
    });

    it("clamps to final frame 11 at exactly 1.5s", () => {
      const result = resolveAnimationFrameAtTime(oneShotAnimation, 1.5);
      assert.equal(result.frameIndex, 11);
      assert.equal(result.frame.index, 11);
      assert.equal(result.isClamped, true);
    });

    it("remains clamped to frame 11 at 2.0s, 5.0s, and beyond", () => {
      const at2s = resolveAnimationFrameAtTime(oneShotAnimation, 2.0);
      assert.equal(at2s.frameIndex, 11);
      assert.equal(at2s.isClamped, true);

      const at5s = resolveAnimationFrameAtTime(oneShotAnimation, 5.0);
      assert.equal(at5s.frameIndex, 11);
      assert.equal(at5s.isClamped, true);

      const at100s = resolveAnimationFrameAtTime(oneShotAnimation, 100.0);
      assert.equal(at100s.frameIndex, 11);
      assert.equal(at100s.isClamped, true);
    });
  });

  describe("Non-uniform manifest frame dimensions", () => {
    it("strictly uses declared manifest frame rectangles without assuming uniform grid cells", () => {
      const irregularFrames: MascotFrameRect[] = [
        { index: 0, x: 0, y: 0, width: 200, height: 180, duration_ms: FRAME_DURATION_MS },
        { index: 1, x: 200, y: 0, width: 220, height: 190, duration_ms: FRAME_DURATION_MS },
        { index: 2, x: 420, y: 0, width: 190, height: 210, duration_ms: FRAME_DURATION_MS },
        { index: 3, x: 0, y: 210, width: 250, height: 200, duration_ms: FRAME_DURATION_MS },
        { index: 4, x: 250, y: 210, width: 180, height: 195, duration_ms: FRAME_DURATION_MS },
        { index: 5, x: 430, y: 210, width: 210, height: 185, duration_ms: FRAME_DURATION_MS },
        { index: 6, x: 0, y: 410, width: 195, height: 205, duration_ms: FRAME_DURATION_MS },
        { index: 7, x: 195, y: 410, width: 205, height: 190, duration_ms: FRAME_DURATION_MS },
        { index: 8, x: 400, y: 410, width: 220, height: 200, duration_ms: FRAME_DURATION_MS },
        { index: 9, x: 0, y: 615, width: 210, height: 190, duration_ms: FRAME_DURATION_MS },
        { index: 10, x: 210, y: 615, width: 200, height: 195, duration_ms: FRAME_DURATION_MS },
        { index: 11, x: 410, y: 615, width: 230, height: 210, duration_ms: FRAME_DURATION_MS },
      ];

      const irregularAnimation = createTestAnimation({
        frames: irregularFrames,
        registration: {
          source_width: 640,
          source_height: 825,
          content_bounds: { x: 0, y: 0, width: 640, height: 825 },
          pivot: { x: 320, y: 825 },
          offset_x: 0,
          offset_y: 0,
        },
      });

      // Frame 1
      const res1 = resolveAnimationFrameAtTime(irregularAnimation, 0.125);
      assert.equal(res1.frameIndex, 1);
      assert.equal(res1.frame.x, 200);
      assert.equal(res1.frame.y, 0);
      assert.equal(res1.frame.width, 220);
      assert.equal(res1.frame.height, 190);
      assert.equal(res1.atlasOffsets.offsetX, -200);
      assert.equal(res1.atlasOffsets.offsetY, 0);
      assert.equal(res1.atlasOffsets.cssBackgroundPosition, "-200px 0px");

      // Frame 3 (on row 2)
      const res3 = resolveAnimationFrameAtTime(irregularAnimation, 0.375);
      assert.equal(res3.frameIndex, 3);
      assert.equal(res3.frame.x, 0);
      assert.equal(res3.frame.y, 210);
      assert.equal(res3.frame.width, 250);
      assert.equal(res3.frame.height, 200);
      assert.equal(res3.atlasOffsets.offsetX, 0);
      assert.equal(res3.atlasOffsets.offsetY, -210);
      assert.equal(res3.atlasOffsets.cssBackgroundPosition, "0px -210px");

      // Frame 11 (final frame)
      const res11 = resolveAnimationFrameAtTime(irregularAnimation, 1.375);
      assert.equal(res11.frameIndex, 11);
      assert.equal(res11.frame.x, 410);
      assert.equal(res11.frame.y, 615);
      assert.equal(res11.frame.width, 230);
      assert.equal(res11.frame.height, 210);
      assert.equal(res11.atlasOffsets.offsetX, -410);
      assert.equal(res11.atlasOffsets.offsetY, -615);
      assert.equal(res11.atlasOffsets.cssBackgroundPosition, "-410px -615px");
    });
  });

  describe("Edge cases and numerical stability", () => {
    const animation = createTestAnimation();

    it("normalizes negative timestamps to 0.0s (frame 0)", () => {
      const resNegative = resolveAnimationFrameAtTime(animation, -2.5);
      assert.equal(resNegative.frameIndex, 0);
      assert.equal(resNegative.timeSeconds, 0);
    });

    it("handles non-finite timestamps gracefully (NaN / Infinity)", () => {
      const resNan = resolveAnimationFrameAtTime(animation, Number.NaN);
      assert.equal(resNan.frameIndex, 0);
      assert.equal(resNan.timeSeconds, 0);
    });
  });

  describe("computeAtlasCssOffset", () => {
    it("computes pixel and percentage positions accurately", () => {
      const frame: MascotFrameRect = {
        index: 2,
        x: 256,
        y: 128,
        width: 128,
        height: 128,
        duration_ms: FRAME_DURATION_MS,
      };
      const offsets = computeAtlasCssOffset(frame, { width: 512, height: 384 });

      assert.equal(offsets.offsetX, -256);
      assert.equal(offsets.offsetY, -128);
      assert.equal(offsets.pixelOffsetX, -256);
      assert.equal(offsets.pixelOffsetY, -128);
      assert.equal(offsets.width, 128);
      assert.equal(offsets.height, 128);
      assert.equal(offsets.cssBackgroundPosition, "-256px -128px");
      assert.ok(offsets.percentageOffsetX !== undefined);
      assert.ok(offsets.percentageOffsetY !== undefined);
      assert.ok(offsets.cssPercentagePosition !== undefined);
    });
  });
});
