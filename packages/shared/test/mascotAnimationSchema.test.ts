import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  MascotAnimationAssetV1Schema,
  MascotAnimationManifestSchema,
  MascotAnimationJobSchema,
  MascotAnimatedStateVariantSchema,
  MascotStateVariantSchema,
  isAnimationSlotPublishEligible,
  isStyleAnimationPublishEligible,
  FRAME_DURATION_MS,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  type MascotAnimationAssetV1,
  type MascotFrameRect,
  type MascotAnimatedStateVariant,
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
    duration_ms: FRAME_DURATION_MS,
  }));
}

function createValidAsset(overrides: Partial<MascotAnimationAssetV1> = {}): MascotAnimationAssetV1 {
  return {
    version: 1,
    state: "thinking",
    atlas_url: "/assets/mascots/owl/thinking_atlas.png",
    manifest_url: "/assets/mascots/owl/thinking_manifest.json",
    frame_count: 12,
    fps: 8,
    loop: true,
    loop_policy: "loop",
    frames: createValid12Frames(),
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
    slot_index: 1,
    recipe_id: "thinking-01-head-tilt-left",
    ...overrides,
  };
}

describe("Mascot Animation Schema & Contracts (Stage 03)", () => {
  describe("MascotAnimationAssetV1Schema validation", () => {
    it("validates a compliant 12-frame animation asset", () => {
      const validAsset = createValidAsset();
      const parsed = MascotAnimationAssetV1Schema.parse(validAsset);

      assert.equal(parsed.version, 1);
      assert.equal(parsed.state, "thinking");
      assert.equal(parsed.frame_count, REQUIRED_FRAME_COUNT);
      assert.equal(parsed.fps, REQUIRED_FPS);
      assert.equal(parsed.frames.length, 12);
      assert.equal(parsed.frames[0].duration_ms, 125);
    });

    it("rejects asset with less than 12 frames", () => {
      const invalidAsset = createValidAsset({
        frames: createValid12Frames().slice(0, 11),
      });

      assert.throws(() => MascotAnimationAssetV1Schema.parse(invalidAsset), /Animation must contain exactly 12 frames/);
    });

    it("rejects asset with more than 12 frames", () => {
      const frames = createValid12Frames();
      frames.push({
        index: 12,
        x: 12 * 128,
        y: 0,
        width: 128,
        height: 128,
        duration_ms: 125,
      });
      const invalidAsset = createValidAsset({ frames });

      assert.throws(() => MascotAnimationAssetV1Schema.parse(invalidAsset), /Animation must contain exactly 12 frames/);
    });

    it("rejects asset with invalid frame_count or fps numbers", () => {
      assert.throws(
        () => MascotAnimationAssetV1Schema.parse(createValidAsset({ frame_count: 8 as unknown as 12 })),
        /frame_count must be exactly 12/,
      );
      assert.throws(() => MascotAnimationAssetV1Schema.parse(createValidAsset({ fps: 24 as unknown as 8 })), /fps must be exactly 8/);
    });

    it("rejects frames with invalid duration_ms", () => {
      const frames = createValid12Frames();
      frames[3].duration_ms = 100;
      const invalidAsset = createValidAsset({ frames });

      assert.throws(() => MascotAnimationAssetV1Schema.parse(invalidAsset), /Frame duration must be strictly 125ms/);
    });

    it("rejects negative frame coordinates or dimensions", () => {
      const negativeX = createValid12Frames();
      negativeX[0].x = -5;
      assert.throws(
        () => MascotAnimationAssetV1Schema.parse(createValidAsset({ frames: negativeX })),
        /Frame x coordinate cannot be negative/,
      );

      const zeroWidth = createValid12Frames();
      zeroWidth[0].width = 0;
      assert.throws(
        () => MascotAnimationAssetV1Schema.parse(createValidAsset({ frames: zeroWidth })),
        /Frame width must be strictly positive/,
      );
    });

    it("rejects out-of-order or duplicate frame indices", () => {
      const disorderedFrames = createValid12Frames();
      disorderedFrames[0].index = 1;
      disorderedFrames[1].index = 0;

      assert.throws(
        () => MascotAnimationAssetV1Schema.parse(createValidAsset({ frames: disorderedFrames })),
        /Frame at position 0 must have index 0/,
      );
    });

    it("rejects invalid state", () => {
      assert.throws(() => MascotAnimationAssetV1Schema.parse(createValidAsset({ state: "running" as unknown as "thinking" })));
    });

    it("rejects empty atlas_url or manifest_url", () => {
      assert.throws(() => MascotAnimationAssetV1Schema.parse(createValidAsset({ atlas_url: "   " })), /Atlas URL cannot be empty/);
      assert.throws(() => MascotAnimationAssetV1Schema.parse(createValidAsset({ manifest_url: "" })), /Manifest URL cannot be empty/);
    });

    it("rejects registration whose content bounds exceed source dimensions", () => {
      const invalidRegistrationAsset = createValidAsset({
        registration: {
          source_width: 500,
          source_height: 500,
          content_bounds: { x: 400, y: 10, width: 200, height: 100 },
          pivot: { x: 250, y: 250 },
          offset_x: 0,
          offset_y: 0,
        },
      });

      assert.throws(() => MascotAnimationAssetV1Schema.parse(invalidRegistrationAsset), /Content bounds exceed source width/);
    });
  });

  describe("MascotAnimationManifestSchema validation", () => {
    it("validates a compliant manifest structure", () => {
      const manifest = {
        version: 1,
        state: "celebrate",
        recipe_id: "celebrate-01-both-hands-up",
        slot_index: 1,
        frame_count: 12,
        fps: 8,
        loop: false,
        loop_policy: "one_shot_rest",
        atlas: {
          url: "/atlas/celebrate.png",
          width: 1536,
          height: 128,
        },
        frames: createValid12Frames(),
        registration: {
          source_width: 1536,
          source_height: 128,
          content_bounds: { x: 10, y: 10, width: 100, height: 100 },
          pivot: { x: 64, y: 120 },
          offset_x: 0,
          offset_y: 0,
        },
        fingerprint: "manifest_fp_123",
      };

      const parsed = MascotAnimationManifestSchema.parse(manifest);
      assert.equal(parsed.recipe_id, "celebrate-01-both-hands-up");
      assert.equal(parsed.loop_policy, "one_shot_rest");
    });
  });

  describe("MascotAnimationJobSchema validation", () => {
    it("validates an animation job record with attempt history", () => {
      const job = {
        id: "job_01",
        mascot_id: "mascot_alpha",
        style_id: "style_pixel",
        state: "thinking",
        slot_index: 2,
        recipe_id: "thinking-02-head-tilt-right",
        status: "curating",
        fingerprint: "job_fp_999",
        attempts: [
          {
            attempt_number: 1,
            status: "ready",
            fingerprint: "att_fp_1",
            started_at: "2026-09-13T10:00:00.000Z",
            completed_at: "2026-09-13T10:01:30.000Z",
          },
        ],
        created_at: "2026-09-13T10:00:00.000Z",
        updated_at: "2026-09-13T10:01:30.000Z",
      };

      const parsed = MascotAnimationJobSchema.parse(job);
      assert.equal(parsed.id, "job_01");
      assert.equal(parsed.attempts.length, 1);
    });
  });

  describe("Slot publish eligibility and state variant extension", () => {
    it("rejects ready slot variant missing animation asset", () => {
      const invalidReadyVariant = {
        id: "slot_1",
        slot_index: 1,
        image_url: "/legacy_preview.png",
        status: "ready",
      };

      assert.throws(
        () => MascotStateVariantSchema.parse(invalidReadyVariant),
        /A ready animation slot must include a valid animation asset/,
      );
      assert.throws(
        () => MascotAnimatedStateVariantSchema.parse(invalidReadyVariant),
        /A ready animation slot must include a valid animation asset/,
      );
    });

    it("accepts ready slot variant with valid animation asset", () => {
      const validReadyVariant = {
        id: "slot_1",
        slot_index: 1,
        image_url: "/preview.png",
        status: "ready",
        animation: createValidAsset(),
      };

      const parsed = MascotStateVariantSchema.parse(validReadyVariant);
      assert.equal(parsed.status, "ready");
      assert.ok(parsed.animation);
      assert.equal(isAnimationSlotPublishEligible(parsed as MascotAnimatedStateVariant), true);
    });

    it("allows non-ready slot without animation asset", () => {
      const inProgressVariant = {
        id: "slot_2",
        slot_index: 2,
        image_url: "",
        status: "generating",
      };

      const parsed = MascotStateVariantSchema.parse(inProgressVariant);
      assert.equal(parsed.status, "generating");
      assert.equal(isAnimationSlotPublishEligible(parsed as MascotAnimatedStateVariant), false);
    });

    it("evaluates style publish eligibility accurately for full 20 slots", () => {
      const thinkingSlots: MascotAnimatedStateVariant[] = Array.from({ length: 10 }, (_, i) => ({
        id: `thinking_${i + 1}`,
        slot_index: i + 1,
        image_url: "",
        status: "ready",
        animation: createValidAsset({ slot_index: i + 1, state: "thinking" }),
      }));

      const celebrateSlots: MascotAnimatedStateVariant[] = Array.from({ length: 10 }, (_, i) => ({
        id: `celebrate_${i + 1}`,
        slot_index: i + 1,
        image_url: "",
        status: "ready",
        animation: createValidAsset({ slot_index: i + 1, state: "celebrate" }),
      }));

      // When all 20 are ready:
      const fullEligibility = isStyleAnimationPublishEligible(thinkingSlots, celebrateSlots);
      assert.equal(fullEligibility.eligible, true);
      assert.equal(fullEligibility.readyCount, 20);
      assert.equal(fullEligibility.missingSlots.length, 0);

      // When one celebrate slot is missing/not ready:
      celebrateSlots[9].status = "qa_failed";
      celebrateSlots[9].animation = undefined;

      const partialEligibility = isStyleAnimationPublishEligible(thinkingSlots, celebrateSlots);
      assert.equal(partialEligibility.eligible, false);
      assert.equal(partialEligibility.readyCount, 19);
      assert.deepEqual(partialEligibility.missingSlots, [{ state: "celebrate", slot_index: 10 }]);
    });
  });
});
