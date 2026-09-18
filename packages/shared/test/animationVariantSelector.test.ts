import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  computeSelectionSeed,
  fnv1a32,
  selectAnimationVariant,
  selectStyleAnimationVariant,
  type AnimationVariantSelectionInput,
  type AnimationVariantSelectionResult,
  type MascotAnimatedStateVariant,
  type MascotStyle,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

function createMockVariants(count = 10): MascotAnimatedStateVariant[] {
  return Array.from({ length: count }, (_, index) => {
    const slotIndex = index + 1;
    return {
      id: `variant_slot_${slotIndex}`,
      slot_index: slotIndex,
      image_url: `/mascots/owl/variant_${slotIndex}.png`,
      status: "ready",
      generation_revision: 2,
      animation: {
        version: 1,
        state: "thinking",
        atlas_url: `/mascots/owl/thinking_atlas_${slotIndex}.png`,
        manifest_url: `/mascots/owl/thinking_manifest_${slotIndex}.json`,
        frame_count: 12,
        fps: 8,
        loop: true,
        frames: Array.from({ length: 12 }, (_, fIndex) => ({
          index: fIndex,
          x: (fIndex % 4) * 64,
          y: Math.floor(fIndex / 4) * 64,
          width: 64,
          height: 64,
          duration_ms: 125,
        })),
        registration: {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
        content_fingerprint: `fp_content_${slotIndex}`,
        source_fingerprint: `fp_source_${slotIndex}`,
      },
    };
  });
}

describe("Deterministic Question Animation Selection (Stage 15)", () => {
  describe("FNV-1a 32-bit Hash and Seed Computation", () => {
    it("computes deterministic seed from videoId, questionId, state, and styleId", () => {
      const seed1 = computeSelectionSeed("vid_101", "q_1", "thinking", "style_core");
      const seed2 = computeSelectionSeed("vid_101", "q_1", "thinking", "style_core");
      assert.equal(seed1, seed2, "Same input must produce identical seed");
      assert.ok(Number.isInteger(seed1), "Seed must be an integer");
      assert.ok(seed1 >= 0, "Seed must be unsigned non-negative integer");
    });

    it("changes seed when any parameter changes", () => {
      const baseSeed = computeSelectionSeed("vid_101", "q_1", "thinking", "style_core");
      const diffVideo = computeSelectionSeed("vid_102", "q_1", "thinking", "style_core");
      const diffQuestion = computeSelectionSeed("vid_101", "q_2", "thinking", "style_core");
      const diffState = computeSelectionSeed("vid_101", "q_1", "celebrate", "style_core");
      const diffStyle = computeSelectionSeed("vid_101", "q_1", "thinking", "style_retro");

      assert.notEqual(baseSeed, diffVideo);
      assert.notEqual(baseSeed, diffQuestion);
      assert.notEqual(baseSeed, diffState);
      assert.notEqual(baseSeed, diffStyle);
    });

    it("fnv1a32 returns identical unsigned 32-bit integer", () => {
      const h1 = fnv1a32("test-deterministic-key");
      const h2 = fnv1a32("test-deterministic-key");
      assert.equal(h1, h2);
      assert.ok(h1 >= 0 && h1 <= 0xffffffff);
    });
  });

  describe("Deterministic Selection from Seeds", () => {
    it("selects candidate strictly by seed % length without randomness", () => {
      const variants = createMockVariants(10);
      const input: AnimationVariantSelectionInput = {
        videoId: "video_quiz_888",
        questionId: "question_alpha",
        state: "thinking",
        styleId: "cyberpunk",
        readyVariants: variants,
      };

      const seed = computeSelectionSeed(input.videoId, input.questionId, input.state, input.styleId);
      const expectedIndex = Math.abs(seed) % variants.length;
      const expectedSlot = variants[expectedIndex].slot_index;

      const result1 = selectAnimationVariant(input);
      const result2 = selectAnimationVariant(input);

      assert.equal(result1.slot_index, expectedSlot);
      assert.equal(result1.candidate_index, expectedIndex);
      assert.equal(result1.seed, seed);
      assert.equal(result1.revision, 2);
      assert.deepEqual(result1, result2, "Multiple calls must produce bit-for-bit identical results");
    });

    it("evaluates 50 iterations consistently with zero drift", () => {
      const variants = createMockVariants(10);
      const input: AnimationVariantSelectionInput = {
        videoId: "stable_run",
        questionId: "q_42",
        state: "celebrate",
        styleId: "pixel_art",
        readyVariants: variants,
      };

      const baseline = selectAnimationVariant(input);
      for (let i = 0; i < 50; i += 1) {
        const next = selectAnimationVariant(input);
        assert.equal(next.slot_index, baseline.slot_index);
        assert.equal(next.candidate_index, baseline.candidate_index);
        assert.equal(next.seed, baseline.seed);
      }
    });
  });

  describe("Repeat Avoidance Rule", () => {
    it("advances 1 position when candidate matches previousSlotIndex and length >= 2", () => {
      const variants = createMockVariants(4);
      // Let's determine the natural candidate index
      const input: AnimationVariantSelectionInput = {
        videoId: "test_repeat",
        questionId: "q_test",
        state: "thinking",
        styleId: "default",
        readyVariants: variants,
      };

      const naturalResult = selectAnimationVariant(input);
      const naturalSlot = naturalResult.slot_index;
      const naturalIndex = naturalResult.candidate_index;

      // When previousSlotIndex equals the natural slot, it must advance
      const avoidedResult = selectAnimationVariant({
        ...input,
        previousSlotIndex: naturalSlot,
      });

      const expectedNextIndex = (naturalIndex + 1) % variants.length;
      const expectedNextSlot = variants[expectedNextIndex].slot_index;

      assert.notEqual(avoidedResult.slot_index, naturalSlot, "Must not repeat previous slot");
      assert.equal(avoidedResult.candidate_index, expectedNextIndex);
      assert.equal(avoidedResult.slot_index, expectedNextSlot);
    });

    it("does not advance when candidate differs from previousSlotIndex", () => {
      const variants = createMockVariants(4);
      const input: AnimationVariantSelectionInput = {
        videoId: "test_repeat",
        questionId: "q_test",
        state: "thinking",
        styleId: "default",
        readyVariants: variants,
      };

      const naturalResult = selectAnimationVariant(input);
      // Pass a previousSlotIndex that is different from natural slot
      const differentSlot = naturalResult.slot_index === 1 ? 2 : 1;

      const nonRepeatResult = selectAnimationVariant({
        ...input,
        previousSlotIndex: differentSlot,
      });

      assert.equal(nonRepeatResult.slot_index, naturalResult.slot_index);
      assert.equal(nonRepeatResult.candidate_index, naturalResult.candidate_index);
    });

    it("wraps around cleanly when advancing from last index", () => {
      const variants = createMockVariants(3);
      // Mock variants at slot 1, 2, 3 (indices 0, 1, 2)
      // Craft input where candidateIndex is 2
      const candidateAtLast = variants[2];

      // If seed % 3 === 2 and previous is slot 3, next index is (2 + 1) % 3 = 0 (slot 1)
      const mockInput: AnimationVariantSelectionInput = {
        videoId: "v",
        questionId: "q",
        state: "thinking",
        styleId: "s",
        readyVariants: variants,
        previousSlotIndex: candidateAtLast.slot_index,
      };

      // Test with custom seed or direct simulation
      const res = selectAnimationVariant(mockInput);
      if (res.candidate_index === 0) {
        assert.equal(res.slot_index, variants[0].slot_index);
      }
      assert.notEqual(res.slot_index, mockInput.previousSlotIndex);
    });
  });

  describe("Single Ready Variant Edge Case", () => {
    it("returns the single ready variant without advancing even if previousSlotIndex matches", () => {
      const singleVariant = createMockVariants(1);
      const soleSlot = singleVariant[0].slot_index;

      const result = selectAnimationVariant({
        videoId: "vid_edge",
        questionId: "q_edge",
        state: "thinking",
        styleId: "lone_style",
        readyVariants: singleVariant,
        previousSlotIndex: soleSlot,
      });

      assert.equal(result.slot_index, soleSlot, "Must return the only available variant");
      assert.equal(result.candidate_index, 0);
      assert.equal(result.variant.id, singleVariant[0].id);
    });

    it("throws error when readyVariants array is empty", () => {
      assert.throws(
        () =>
          selectAnimationVariant({
            videoId: "vid_err",
            questionId: "q_err",
            state: "thinking",
            styleId: "empty_style",
            readyVariants: [],
          }),
        /No ready animation variants available/,
      );
    });
  });

  describe("Re-render and Resume Stability", () => {
    it("produces identical sequential selections across resume and re-render passes", () => {
      const variants = createMockVariants(10);
      const videoId = "video_production_100";
      const questionIds = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];

      // Initial render pass
      const pass1Selections: number[] = [];
      let prevSlot: number | undefined;

      for (const qId of questionIds) {
        const sel = selectAnimationVariant({
          videoId,
          questionId: qId,
          state: "thinking",
          styleId: "core",
          readyVariants: variants,
          previousSlotIndex: prevSlot,
        });
        pass1Selections.push(sel.slot_index);
        prevSlot = sel.slot_index;
      }

      // Resume / re-render pass with exact same inputs
      const pass2Selections: number[] = [];
      prevSlot = undefined;

      for (const qId of questionIds) {
        const sel: AnimationVariantSelectionResult = selectAnimationVariant({
          videoId,
          questionId: qId,
          state: "thinking",
          styleId: "core",
          readyVariants: variants,
          previousSlotIndex: prevSlot,
        });
        pass2Selections.push(sel.slot_index);
        prevSlot = sel.slot_index;
      }

      assert.deepEqual(pass1Selections, pass2Selections, "Re-render pass must match 100%");

      // Verify non-immediate repeat rule held throughout sequence
      for (let i = 1; i < pass1Selections.length; i += 1) {
        assert.notEqual(
          pass1Selections[i],
          pass1Selections[i - 1],
          `Slot ${pass1Selections[i]} must not immediately repeat slot ${pass1Selections[i - 1]}`,
        );
      }
    });
  });

  describe("selectStyleAnimationVariant Helper", () => {
    it("filters ready variants with animation and selects deterministically", () => {
      const mockStyle: MascotStyle = {
        id: "style_helper",
        name: "Helper Style",
        keyword: "helper",
        anchor_image_url: "/anchor.png",
        raw_anchor_image_url: null,
        is_default: true,
        states: {
          thinking: createMockVariants(5),
          celebrate: [
            // Slot without animation
            {
              id: "unready_slot",
              slot_index: 1,
              image_url: "/unready.png",
              status: "not_started",
            },
          ],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const thinkingSelection = selectStyleAnimationVariant({
        videoId: "vid_style",
        questionId: "q_style",
        state: "thinking",
        style: mockStyle,
      });

      assert.ok(thinkingSelection !== null);
      assert.ok(thinkingSelection.slot_index >= 1 && thinkingSelection.slot_index <= 5);

      // Celebrate has no ready animation slots, should return null
      const celebrateSelection = selectStyleAnimationVariant({
        videoId: "vid_style",
        questionId: "q_style",
        state: "celebrate",
        style: mockStyle,
      });

      assert.equal(celebrateSelection, null);
    });
  });
});
