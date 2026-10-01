import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
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
        randomSeed: 1_334_778_624,
      });

      assert.ok(details !== null);
      assert.equal(details.slot_index, 1);
      assert.equal(details.candidate_index, 0);
      assert.equal(details.revision, 2);
      assert.equal(details.seed, 1_334_778_624);
    });
  });

  describe("Random Selection and Seed Injection", () => {
    it("returns identical selections when a caller supplies the same random seed", () => {
      const variants = createSampleVariants(4);
      const input: QuestionMascotVariantSelectionInput = {
        videoId: "ep_physics_001",
        questionId: "q_gravity_04",
        state: "thinking",
        styleId: "police",
        variants,
        randomSeed: 7,
      };

      const first = selectQuestionMascotVariant(input);
      assert.ok(first !== null);

      for (let i = 0; i < 50; i += 1) {
        const next = selectQuestionMascotVariant(input);
        assert.deepEqual(next, first, "An injected seed must make a selection reproducible");
      }
    });

    it("uses different random seeds to select different available slots", () => {
      const variants = createSampleVariants(4);
      const first = selectQuestionMascotVariantResult({
        state: "thinking",
        styleId: "core",
        variants,
        randomSeed: 0,
      });
      const second = selectQuestionMascotVariantResult({
        state: "thinking",
        styleId: "core",
        variants,
        randomSeed: 1,
      });

      assert.equal(first?.slot_index, 1);
      assert.equal(second?.slot_index, 2);
    });

    it("allows a repeated slot even when previousSlotIndex is supplied", () => {
      const variants = createSampleVariants(4);
      const result = selectQuestionMascotVariant({
        state: "thinking",
        styleId: "core",
        variants,
        randomSeed: 0,
        previousSlotIndex: 1,
      });

      assert.equal(result?.slot_index, 1);
    });
  });

  describe("Repeated Selection", () => {
    it("allows adjacent questions to reuse the same slot", () => {
      const variants = createSampleVariants(4);
      const first = selectQuestionMascotVariant({ state: "thinking", styleId: "core", variants, randomSeed: 0 });
      const second = selectQuestionMascotVariant({
        state: "thinking",
        styleId: "core",
        variants,
        randomSeed: 0,
        previousSlotIndex: 1,
      });

      assert.equal(first?.slot_index, 1);
      assert.equal(second?.slot_index, 1);
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
          randomSeed: i,
        });

        assert.ok(selected !== null);
        const slot = selected.slot_index;
        assert.ok(slotCounts.has(slot));
        slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
      }

      // Assert that every available slot was selected at least once
      for (const [slot, count] of slotCounts.entries()) {
        if (slot % 2 === 1) continue;
        assert.ok(count > 0, `Slot ${slot} was never selected over ${iterations} iterations`);
        // Each slot should receive a reasonable proportion (at least 10% for 4 slots)
        const ratio = count / iterations;
        assert.ok(ratio >= 0.1, `Slot ${slot} received only ${(ratio * 100).toFixed(1)}% of selections, expected >= 10%`);
      }
    });

    it("selects animation variants when mediaMode is animation", () => {
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
          mediaMode: "animation",
          randomSeed: i,
        });

        assert.ok(selected !== null);
        if (selected.animation?.transparent_video_url) {
          videoCount += 1;
        } else {
          staticCount += 1;
        }
      }

      assert.equal(staticCount, 0, "In animation mode, static-only variants must yield to animation variants");
      assert.equal(videoCount, iterations, "All selections must come from published animation variants");
    });

    it("prioritizes image variants when mediaMode is static or default", () => {
      // Slot 1: static 3D, Slot 2: WebM video (no static image), Slot 3: static 3D
      const variants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_1_static",
          slot_index: 1,
          image_url: "/mascots/owl/still_1.png",
          status: "ready",
        },
        {
          id: "slot_2_video_only",
          slot_index: 2,
          image_url: null,
          status: "ready",
          animation: {
            transparent_video_url: "/mascots/owl/video_2.webm",
          },
        },
        {
          id: "slot_3_static",
          slot_index: 3,
          image_url: "/mascots/owl/still_3.png",
          status: "ready",
        },
      ];

      for (let i = 0; i < 50; i += 1) {
        const selected = selectQuestionMascotVariant({
          videoId: "static_mode_ep",
          questionId: `q_static_${i}`,
          state: "thinking",
          styleId: "core",
          variants,
          mediaMode: "static",
          randomSeed: i,
        });

        assert.ok(selected !== null);
        assert.ok(selected.slot_index === 1 || selected.slot_index === 3, "Static mode must only select slots with static images");
        assert.notEqual(selected.slot_index, 2, "Video-only slot 2 must not be selected when static images are available");
      }
    });
  });
});
