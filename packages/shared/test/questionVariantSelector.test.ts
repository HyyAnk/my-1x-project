import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  computeSelectionSeed,
  selectQuestionMascotVariant,
  selectQuestionMascotVariantResult,
  type MascotVariantMediaCandidate,
  type QuestionMascotVariantSelectionInput,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

function createSampleVariants(count = 4): MascotVariantMediaCandidate[] {
  return Array.from({ length: count }, (_, index) => {
    const slotIndex = index + 1;
    // Mix static 3D character images and transparent WebM video variants
    if (slotIndex % 2 === 1) {
      return {
        id: `variant_slot_${slotIndex}`,
        slot_index: slotIndex,
        image_url: `/mascots/owl/variant_${slotIndex}.png`,
        status: "ready",
        generation_revision: 2,
      };
    }
    return {
      id: `variant_slot_${slotIndex}`,
      slot_index: slotIndex,
      image_url: `/mascots/owl/variant_${slotIndex}.png`,
      status: "ready",
      generation_revision: 3,
      animation: {
        transparent_video_url: `/mascots/owl/video_${slotIndex}.webm`,
        version: 2,
        frame_count: 96,
        fps: 24,
      },
    };
  });
}

describe("Question Mascot Variant Selector Engine (Phase 3)", () => {
  describe("Zero Variants Handling", () => {
    it("returns null cleanly when variants array is empty", () => {
      const result = selectQuestionMascotVariant({
        videoId: "video_100",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: [],
      });
      assert.equal(result, null);
    });

    it("returns null cleanly when variants parameter is null or undefined", () => {
      const resultNull = selectQuestionMascotVariant({
        videoId: "video_100",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: null,
      });
      assert.equal(resultNull, null);

      const resultUndefined = selectQuestionMascotVariant({
        videoId: "video_100",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: undefined,
      });
      assert.equal(resultUndefined, null);
    });

    it("returns null cleanly when all variants are unavailable or mock fixtures", () => {
      const mockOnlyVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_empty",
          slot_index: 1,
          status: "empty",
          image_url: null,
        },
        {
          id: "slot_mock",
          slot_index: 2,
          status: "ready",
          animation: {
            atlas_url: "/synthetic/mock_atlas.png",
          },
        },
        {
          id: "slot_failed",
          slot_index: 3,
          status: "failed",
          image_url: "/images/failed.png",
        },
      ];

      const result = selectQuestionMascotVariant({
        videoId: "video_100",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: mockOnlyVariants,
      });
      assert.equal(result, null);

      const resultDetails = selectQuestionMascotVariantResult({
        videoId: "video_100",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: mockOnlyVariants,
      });
      assert.equal(resultDetails, null);
    });
  });

  describe("Single Variant Selection", () => {
    it("correctly selects the only variant without error", () => {
      const single = createSampleVariants(1);
      const result = selectQuestionMascotVariant({
        videoId: "video_single",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: single,
      });

      assert.ok(result !== null);
      assert.equal(result.slot_index, 1);
      assert.equal(result.id, "variant_slot_1");
    });

    it("returns the single variant even if previousSlotIndex matches its slot_index", () => {
      const single = createSampleVariants(1);
      const result = selectQuestionMascotVariant({
        videoId: "video_single",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
        variants: single,
        previousSlotIndex: 1,
      });

      assert.ok(result !== null);
      assert.equal(result.slot_index, 1);
    });

    it("returns full metadata result for single variant", () => {
      const single = createSampleVariants(1);
      const details = selectQuestionMascotVariantResult({
        videoId: "video_single",
        questionId: "q_1",
        state: "celebrate",
        styleId: "core",
        variants: single,
      });

      assert.ok(details !== null);
      assert.equal(details.slot_index, 1);
      assert.equal(details.candidate_index, 0);
      assert.equal(details.revision, 2);
      assert.equal(details.seed, computeSelectionSeed("video_single", "q_1", "celebrate", "core"));
    });
  });

  describe("Determinism and Seeding", () => {
    it("identical inputs return identical slot selections across repeated invocations", () => {
      const variants = createSampleVariants(4);
      const input: QuestionMascotVariantSelectionInput = {
        videoId: "ep_physics_001",
        questionId: "q_gravity_04",
        state: "thinking",
        styleId: "police",
        variants,
      };

      const first = selectQuestionMascotVariant(input);
      assert.ok(first !== null);

      for (let i = 0; i < 50; i += 1) {
        const next = selectQuestionMascotVariant(input);
        assert.deepEqual(next, first, "Every call with identical inputs must return identical variant");
      }
    });

    it("supports episodeId as an alias for videoId with identical deterministic seed", () => {
      const variants = createSampleVariants(4);
      const withVideo = selectQuestionMascotVariantResult({
        videoId: "ep_math_202",
        questionId: "q_calc_1",
        state: "thinking",
        styleId: "core",
        variants,
      });

      const withEpisode = selectQuestionMascotVariantResult({
        episodeId: "ep_math_202",
        questionId: "q_calc_1",
        state: "thinking",
        styleId: "core",
        variants,
      });

      assert.ok(withVideo !== null);
      assert.ok(withEpisode !== null);
      assert.equal(withVideo.seed, withEpisode.seed);
      assert.equal(withVideo.slot_index, withEpisode.slot_index);
    });

    it("synthesizes default stable seed parameters when videoId or questionId are missing", () => {
      const variants = createSampleVariants(4);
      const result1 = selectQuestionMascotVariant({
        questionId: "",
        state: "thinking",
        styleId: "core",
        variants,
      });
      const result2 = selectQuestionMascotVariant({
        questionId: "",
        state: "thinking",
        styleId: "core",
        variants,
      });

      assert.ok(result1 !== null);
      assert.equal(result1.slot_index, result2?.slot_index);
    });
  });

  describe("Repeat Avoidance Rule", () => {
    it("never repeats previousSlotIndex when availableVariants.length >= 2", () => {
      const variants = createSampleVariants(4);

      // Find natural selection without previousSlotIndex
      const natural = selectQuestionMascotVariant({
        videoId: "test_vid",
        questionId: "q_repeat_check",
        state: "thinking",
        styleId: "style_1",
        variants,
      });
      assert.ok(natural !== null);

      // Provide previousSlotIndex equal to natural selection
      const avoided = selectQuestionMascotVariant({
        videoId: "test_vid",
        questionId: "q_repeat_check",
        state: "thinking",
        styleId: "style_1",
        variants,
        previousSlotIndex: natural.slot_index,
      });
      assert.ok(avoided !== null);
      assert.notEqual(avoided.slot_index, natural.slot_index, "Selection must advance to avoid consecutive repeat");
    });

    it("verifies adjacent questions never repeat across 20 sequential questions", () => {
      const variants = createSampleVariants(4);
      const sequence: number[] = [];
      let previousSlot: number | undefined;

      for (let i = 1; i <= 20; i += 1) {
        const selected = selectQuestionMascotVariant({
          videoId: "ep_sequence_test",
          questionId: `question_${i}`,
          state: "thinking",
          styleId: "core",
          variants,
          previousSlotIndex: previousSlot,
        });

        assert.ok(selected !== null);
        assert.ok(typeof selected.slot_index === "number");

        if (previousSlot !== undefined) {
          assert.notEqual(
            selected.slot_index,
            previousSlot,
            `Question ${i} (slot ${selected.slot_index}) must not match Question ${i - 1} (slot ${previousSlot})`,
          );
        }

        sequence.push(selected.slot_index);
        previousSlot = selected.slot_index;
      }

      assert.equal(sequence.length, 20);
    });

    it("alternates cleanly and avoids repeats with exactly 2 available variants", () => {
      const twoVariants = createSampleVariants(2);
      let previousSlot: number | undefined;

      for (let i = 1; i <= 10; i += 1) {
        const selected = selectQuestionMascotVariant({
          videoId: "ep_two_variants",
          questionId: `q_${i}`,
          state: "celebrate",
          styleId: "core",
          variants: twoVariants,
          previousSlotIndex: previousSlot,
        });

        assert.ok(selected !== null);
        if (previousSlot !== undefined) {
          assert.notEqual(selected.slot_index, previousSlot);
        }
        previousSlot = selected.slot_index;
      }
    });

    it("wraps around cleanly when candidate is at the last array index and matches previousSlotIndex", () => {
      const threeVariants = createSampleVariants(3);
      // Construct an input where candidateIndex is the last index (2)
      // Find a questionId that naturally picks slot 3 (index 2)
      let targetQ = "q_wrap_0";
      for (let i = 0; i < 50; i += 1) {
        const qCandidate = `q_wrap_${i}`;
        const seed = computeSelectionSeed("wrap_video", qCandidate, "thinking", "core");
        if (Math.abs(seed) % 3 === 2) {
          targetQ = qCandidate;
          break;
        }
      }

      const result = selectQuestionMascotVariantResult({
        videoId: "wrap_video",
        questionId: targetQ,
        state: "thinking",
        styleId: "core",
        variants: threeVariants,
        previousSlotIndex: threeVariants[2].slot_index, // slot 3
      });

      assert.ok(result !== null);
      assert.equal(result.candidate_index, 0, "Must wrap around to index 0");
      assert.equal(result.slot_index, threeVariants[0].slot_index);
    });
  });

  describe("Uniform Distribution Across Iterations", () => {
    it("selects all available slots over multiple questions and seeds", () => {
      const variants = createSampleVariants(4);
      const slotCounts = new Map<number, number>([
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ]);

      const iterations = 120;
      for (let i = 0; i < iterations; i += 1) {
        const selected = selectQuestionMascotVariant({
          videoId: "distribution_ep",
          questionId: `q_random_${i}`,
          state: "thinking",
          styleId: "core",
          variants,
        });

        assert.ok(selected !== null);
        const slot = selected.slot_index;
        assert.ok(slotCounts.has(slot));
        slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
      }

      // Assert that every available slot was selected at least once
      for (const [slot, count] of slotCounts.entries()) {
        assert.ok(count > 0, `Slot ${slot} was never selected over ${iterations} iterations`);
        // Each slot should receive a reasonable proportion (at least 10% for 4 slots)
        const ratio = count / iterations;
        assert.ok(ratio >= 0.1, `Slot ${slot} received only ${(ratio * 100).toFixed(1)}% of selections, expected >= 10%`);
      }
    });

    it("selects both static 3D character images and video variants uniformly", () => {
      // Slot 1: static 3D, Slot 2: WebM video, Slot 3: static 3D, Slot 4: WebM video
      const variants = createSampleVariants(4);
      let staticCount = 0;
      let videoCount = 0;

      const iterations = 100;
      for (let i = 0; i < iterations; i += 1) {
        const selected = selectQuestionMascotVariant({
          videoId: "mixed_media_ep",
          questionId: `question_num_${i}`,
          state: "celebrate",
          styleId: "police",
          variants,
        });

        assert.ok(selected !== null);
        if (selected.animation?.transparent_video_url) {
          videoCount += 1;
        } else {
          staticCount += 1;
        }
      }

      assert.ok(staticCount > 15, `Static variants count ${staticCount} must be well represented`);
      assert.ok(videoCount > 15, `Video variants count ${videoCount} must be well represented`);
    });
  });
});
