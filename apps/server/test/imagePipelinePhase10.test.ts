import { describe, expect, it } from "vitest";
import { type DirectorPlan, type QuizQuestion, type QuizV2 } from "@studio/shared";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { framingRules } from "../src/quiz/assets/promptFramingRules.js";
import { assetFingerprint } from "../src/quiz/assets/assetFingerprint.js";
import { extractImageDimensions, validateReturnedImageDimensions } from "../src/quiz/assets/imageDimensionValidator.js";
import { resolveImageDimensions } from "../src/providers/gpti2Dimensions.js";
import { resolveImgStudioAspectRatio } from "../src/providers/imgstudio/dimensions.js";

function makeMockPngBytes(width: number, height: number): Uint8Array {
  // Construct minimal valid PNG buffer with IHDR chunk
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const ihdrData = new Uint8Array(13);
  const view = new DataView(ihdrData.buffer);
  view.setUint32(0, width, false);
  view.setUint32(4, height, false);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrLength = 13;
  const chunkLength = 4 + 4 + ihdrLength + 4; // len + type + data + crc
  const buffer = new Uint8Array(signature.length + chunkLength + 12); // + IEND
  buffer.set(signature, 0);

  let offset = signature.length;
  const bufView = new DataView(buffer.buffer);
  bufView.setUint32(offset, ihdrLength, false);
  offset += 4;
  buffer.set([73, 72, 68, 82], offset); // "IHDR"
  offset += 4;
  buffer.set(ihdrData, offset);
  offset += ihdrLength;
  bufView.setUint32(offset, 0, false); // CRC placeholder
  offset += 4;

  // IEND chunk
  bufView.setUint32(offset, 0, false);
  offset += 4;
  buffer.set([73, 69, 78, 68], offset); // "IEND"
  offset += 4;
  bufView.setUint32(offset, 0, false); // CRC

  return buffer;
}

describe("Phase 10 - Image Prompt, Request and Cache Propagation", () => {
  describe("planQuizAssets layout-aware asset requirements", () => {
    it("plans zero image assets for Full Stack List questions", () => {
      const fullStackQuestion: QuizQuestion = {
        id: "q_full_stack",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which of these is the largest ocean?",
        choices: [
          { id: "c1", text: "Pacific Ocean" },
          { id: "c2", text: "Atlantic Ocean" },
          { id: "c3", text: "Indian Ocean" },
        ],
        correct_choice_id: "c1",
        explanation: "The Pacific Ocean covers more than 30% of Earth.",
        source_ids: ["src1"],
        visual_opportunity: "",
      };

      const quiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep_fs",
        title: "Oceans",
        theme: "Geography",
        language: "en",
        questions: [fullStackQuestion],
      };

      const director: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep_fs",
        beats: [
          {
            type: "question",
            question_id: "q_full_stack",
            archetype: "multiple_choice_list",
            layout_id: "full_stack_list",
            thinking_seconds: 5,
            reward_intensity: "medium",
            sfx_intents: [],
            asset_intents: [],
          },
        ],
      };

      const plan = planQuizAssets(quiz, director);
      expect(plan.assets).toHaveLength(0);
      expect(plan.consistency_groups).toHaveLength(0);
    });

    it("plans exactly 1 hero asset and 0 choice assets for Mystery Reveal questions", () => {
      const mysteryQuestion: QuizQuestion = {
        id: "q_mystery",
        number: 1,
        format: "image_guess",
        answer_mode: "single_reveal",
        difficulty: 1,
        question: "Who is this iconic scientist?",
        choices: [{ id: "c_einstein", text: "Albert Einstein" }],
        correct_choice_id: "c_einstein",
        explanation: "He developed the theory of relativity.",
        source_ids: ["src1"],
        visual_opportunity: "Albert Einstein with wild hair",
      };

      const quiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep_myst",
        title: "Scientists",
        theme: "Science",
        language: "en",
        questions: [mysteryQuestion],
      };

      const director: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep_myst",
        beats: [
          {
            type: "question",
            question_id: "q_mystery",
            archetype: "mystery_reveal",
            layout_id: "mystery_reveal",
            thinking_seconds: 5,
            reward_intensity: "big",
            sfx_intents: ["scanner"],
            asset_intents: ["question_illustration"],
          },
        ],
      };

      const plan = planQuizAssets(quiz, director);
      expect(plan.assets).toHaveLength(1);
      expect(plan.assets[0].purpose).toBe("hero_question_image");
      expect(plan.assets[0].aspect_ratio).toBe("16:9");
      expect(plan.assets[0].sizing?.layout_id).toBe("mystery_reveal");
      expect(plan.consistency_groups).toHaveLength(0);
    });

    it("plans 4:3 hero asset for Media Left questions", () => {
      const q: QuizQuestion = {
        id: "q_ml",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Identify this landmark.",
        choices: [
          { id: "c1", text: "Colosseum" },
          { id: "c2", text: "Parthenon" },
          { id: "c3", text: "Pantheon" },
        ],
        correct_choice_id: "c1",
        explanation: "It was built in ancient Rome.",
        source_ids: ["src1"],
        visual_opportunity: "Ancient Colosseum in Rome",
      };

      const quiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep_ml",
        title: "Landmarks",
        theme: "History",
        language: "en",
        questions: [q],
      };

      const director: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep_ml",
        beats: [
          {
            type: "question",
            question_id: "q_ml",
            archetype: "media_left_3_choice",
            layout_id: "media_left_choices_right",
            thinking_seconds: 5,
            reward_intensity: "medium",
            sfx_intents: [],
            asset_intents: ["question_illustration"],
          },
        ],
      };

      const plan = planQuizAssets(quiz, director);
      expect(plan.assets).toHaveLength(1);
      expect(plan.assets[0].aspect_ratio).toBe("4:3");
      expect(plan.assets[0].sizing?.recommended_width).toBe(1120);
      expect(plan.assets[0].sizing?.recommended_height).toBe(840);
    });

    it("plans 3 choice assets with 1:1 ratio for Visual Choices Three (3 Choice Visual Card)", () => {
      const q: QuizQuestion = {
        id: "q_vc",
        number: 1,
        format: "odd_one_out",
        difficulty: 1,
        question: "Which one does not belong?",
        choices: [
          { id: "c1", text: "Apple" },
          { id: "c2", text: "Banana" },
          { id: "c3", text: "Carrot" },
        ],
        correct_choice_id: "c3",
        explanation: "Carrot is a root vegetable.",
        source_ids: ["src1"],
        visual_opportunity: "",
      };

      const quiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep_vc",
        title: "Food",
        theme: "Health",
        language: "en",
        questions: [q],
      };

      const director: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep_vc",
        beats: [
          {
            type: "question",
            question_id: "q_vc",
            archetype: "visual_multiple_choice",
            layout_id: "visual_choices_three",
            thinking_seconds: 5,
            reward_intensity: "medium",
            sfx_intents: [],
            asset_intents: ["choice_illustration"],
          },
        ],
      };

      const plan = planQuizAssets(quiz, director);
      expect(plan.assets).toHaveLength(3);
      expect(plan.assets[0].aspect_ratio).toBe("1:1");
      expect(plan.assets[0].sizing?.recommended_width).toBe(664);
      expect(plan.assets[0].sizing?.recommended_height).toBe(664);

      // Verify consistency group does not have 68-72% instruction
      expect(plan.consistency_groups).toHaveLength(1);
      expect(plan.consistency_groups[0].subject_scale).not.toContain("68-72");
      expect(plan.consistency_groups[0].subject_scale).toContain("scaled to fill the card comfortably");
    });

    it("plans 3 choice assets with 3:4 ratio for Visual Choices Three Pure (3 Choice Pure Visual)", () => {
      const q: QuizQuestion = {
        id: "q_pure",
        number: 1,
        format: "odd_one_out",
        difficulty: 1,
        question: "Find the odd one out.",
        choices: [
          { id: "c1", text: "Lion" },
          { id: "c2", text: "Tiger" },
          { id: "c3", text: "Eagle" },
        ],
        correct_choice_id: "c3",
        explanation: "Eagle is a bird.",
        source_ids: ["src1"],
        visual_opportunity: "",
      };

      const quiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep_pure",
        title: "Animals",
        theme: "Nature",
        language: "en",
        questions: [q],
      };

      const director: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep_pure",
        beats: [
          {
            type: "question",
            question_id: "q_pure",
            archetype: "visual_multiple_choice",
            layout_id: "visual_choices_three_pure",
            thinking_seconds: 5,
            reward_intensity: "medium",
            sfx_intents: [],
            asset_intents: ["choice_illustration"],
          },
        ],
      };

      const plan = planQuizAssets(quiz, director);
      expect(plan.assets).toHaveLength(3);
      expect(plan.assets[0].aspect_ratio).toBe("3:4");
      expect(plan.assets[0].sizing?.recommended_width).toBe(648);
      expect(plan.assets[0].sizing?.recommended_height).toBe(864);
    });

    it("plans 2 choice assets with 16:9 ratio for Split Versus Two", () => {
      const q: QuizQuestion = {
        id: "q_vs",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Who is faster?",
        choices: [
          { id: "c1", text: "Cheetah" },
          { id: "c2", text: "Peregrine Falcon" },
        ],
        correct_choice_id: "c2",
        explanation: "The Peregrine Falcon dives at over 200 mph.",
        source_ids: ["src1"],
        visual_opportunity: "",
      };

      const quiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep_vs",
        title: "Speed",
        theme: "Nature",
        language: "en",
        questions: [q],
      };

      const director: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep_vs",
        beats: [
          {
            type: "question",
            question_id: "q_vs",
            archetype: "split_versus_two",
            layout_id: "split_versus_two",
            thinking_seconds: 5,
            reward_intensity: "medium",
            sfx_intents: [],
            asset_intents: ["choice_illustration"],
          },
        ],
      };

      const plan = planQuizAssets(quiz, director);
      expect(plan.assets).toHaveLength(2);
      expect(plan.assets[0].aspect_ratio).toBe("16:9");
      expect(plan.assets[0].sizing?.recommended_width).toBe(1152);
      expect(plan.assets[0].sizing?.recommended_height).toBe(648);
    });
  });

  describe("promptFramingRules layout-aware safe region insets", () => {
    it("provides Media Left safe region without literal percentage annotations", () => {
      const rules = framingRules("4:3", "hero_question_image", { layoutId: "media_left_choices_right" });
      expect(rules).toContain("Output aspect ratio: 4:3.");
      expect(rules).toContain("safe region with comfortable breathing room");
      expect(rules).toContain("landscape hero card on the left side");
      expect(rules).not.toMatch(/\d+%/);
    });

    it("provides Visual Choices Three safe region without literal percentage annotations", () => {
      const rules = framingRules("1:1", "answer_option", { layoutId: "visual_choices_three" });
      expect(rules).toContain("Output aspect ratio: 1:1.");
      expect(rules).toContain("safe region with balanced breathing room on all sides");
      expect(rules).toContain("square visual choice card");
      expect(rules).not.toMatch(/\d+%/);
    });

    it("provides Pure Visual safe region without literal percentage annotations (badge reserve)", () => {
      const rules = framingRules("3:4", "answer_option", { layoutId: "visual_choices_three_pure" });
      expect(rules).toContain("Output aspect ratio: 3:4.");
      expect(rules).toContain("safe region, keeping the focal subject in the upper and middle area with generous bottom margin");
      expect(rules).toContain("badge overlapping its lower center");
      expect(rules).not.toMatch(/\d+%/);
    });

    it("provides Split Versus safe region without literal percentage annotations", () => {
      const rules = framingRules("16:9", "answer_option", { layoutId: "split_versus_two" });
      expect(rules).toContain("Output aspect ratio: 16:9.");
      expect(rules).toContain("safe region with generous side margins and clear space along all edges");
      expect(rules).toContain("split-versus competition card");
      expect(rules).not.toMatch(/\d+%/);
    });

    it("provides Verdict safe region without literal percentage annotations", () => {
      const rules = framingRules("4:3", "hero_question_image", { layoutId: "verdict_true_false" });
      expect(rules).toContain("Output aspect ratio: 4:3.");
      expect(rules).toContain("safe region with comfortable breathing room");
      expect(rules).toContain("verdict question card");
      expect(rules).not.toMatch(/\d+%/);
    });

    it("provides Mystery Reveal safe region without literal percentage annotations", () => {
      const rules = framingRules("16:9", "hero_question_image", { layoutId: "mystery_reveal" });
      expect(rules).toContain("Output aspect ratio: 16:9.");
      expect(rules).toContain("safe region with clear breathing room from all edges");
      expect(rules).toContain("centered mystery stage");
      expect(rules).toContain("do not generate a pre-blurred, pixelated, or mosaic image");
      expect(rules).not.toMatch(/\d+%/);
    });
  });

  describe("compileQuizAssetPrompt cache version and framing integration", () => {
    it("bumps cacheVersion to v6-clean-framing and includes safe region instructions without percentages", () => {
      const compiled = compileQuizAssetPrompt({
        asset_id: "asset-q1-c1",
        question_id: "q1",
        subject: "Peregrine Falcon diving",
        purpose: "answer_option",
        style: "cute_illustration",
        aspect_ratio: "16:9",
        transparent_background: true,
        required: true,
        semantic_key: "q1:choice:c1",
        consistency_group_id: null,
        sizing: {
          policy_version: 1,
          layout_id: "split_versus_two",
          geometry_key: "split_versus_two:answer_option:1920x1080:622x397_cover",
          recommended_width: 1152,
          recommended_height: 648,
        },
      });

      expect(compiled.cacheVersion).toContain("v6-clean-framing");
      expect(compiled.prompt).toContain("safe region with generous side margins");
      expect(compiled.prompt).not.toMatch(/\d+%/);
      expect(compiled.prompt).toContain("Output framing: 16:9.");
    });

    it("compiles graphic identity subjects with specialized vector emblem contract and v7 cache version", () => {
      const compiled = compileQuizAssetPrompt({
        asset_id: "asset-q1-hero",
        question_id: "q1",
        subject: "Official minimalist vector brand logo of Nike with iconic clean black swoosh",
        purpose: "hero_question_image",
        style: "cute_illustration",
        aspect_ratio: "16:9",
        transparent_background: true,
        required: true,
        semantic_key: "q1:hero_question_image",
        consistency_group_id: null,
      });

      expect(compiled.cacheVersion).toContain("v7-graphic-emblem");
      expect(compiled.prompt).toContain("Visual Style: Crisp 2D Flat Vector Graphic Emblem");
      expect(compiled.prompt).toContain("Graphic emblem contract: Clean, high-contrast, minimalist vector graphic emblem");
      expect(compiled.prompt).toContain("Zero physical commercial products");
      expect(compiled.prompt).toContain("render the official emblem or symbol mark accurately");
      expect(compiled.prompt).not.toContain("Face policy: natural_only");
      expect(compiled.prompt).not.toContain("No words, letters");
    });
  });

  describe("assetFingerprint geometry sensitivity", () => {
    it("produces different fingerprints for same aspect_ratio but different geometry_key", () => {
      // Both are 4:3 hero images, but Media Left has 696x546 viewport while Verdict has 800x545 viewport
      const mediaLeftAsset = {
        semantic_key: "q1:hero_question_image",
        subject: "Roman Colosseum",
        purpose: "hero_question_image" as const,
        style: "cute_illustration" as const,
        aspect_ratio: "4:3" as const,
        transparent_background: false,
        sizing: {
          policy_version: 1 as const,
          layout_id: "media_left_choices_right" as const,
          geometry_key: "media_left_choices_right:hero_question_image:1920x1080:696x546_cover",
          recommended_width: 1120,
          recommended_height: 840,
        },
      };

      const verdictAsset = {
        semantic_key: "q1:hero_question_image",
        subject: "Roman Colosseum",
        purpose: "hero_question_image" as const,
        style: "cute_illustration" as const,
        aspect_ratio: "4:3" as const,
        transparent_background: false,
        sizing: {
          policy_version: 1 as const,
          layout_id: "verdict_true_false" as const,
          geometry_key: "verdict_true_false:hero_question_image:1920x1080:800x545_cover",
          recommended_width: 1216,
          recommended_height: 912,
        },
      };

      const fpMediaLeft = assetFingerprint(mediaLeftAsset);
      const fpVerdict = assetFingerprint(verdictAsset);

      expect(fpMediaLeft).not.toBe(fpVerdict);
    });

    it("produces identical fingerprints for identical inputs (idempotent)", () => {
      const asset = {
        semantic_key: "q_myst:hero_question_image",
        subject: "Marie Curie",
        purpose: "hero_question_image" as const,
        style: "cute_illustration" as const,
        aspect_ratio: "16:9" as const,
        transparent_background: true,
        sizing: {
          policy_version: 1 as const,
          layout_id: "mystery_reveal" as const,
          geometry_key: "mystery_reveal:hero_question_image:1920x1080:880x495_contain",
          recommended_width: 1408,
          recommended_height: 792,
        },
      };

      expect(assetFingerprint(asset)).toBe(assetFingerprint(asset));
    });
  });

  describe("Provider aspect ratio validation and error handling", () => {
    it("resolveImageDimensions rejects unsupported aspect ratio for GPT-image-2", () => {
      expect(() => resolveImageDimensions("7:5", "gpt-image-2")).toThrow(/Unsupported aspect ratio/);
    });

    it("resolveImageDimensions returns valid dimensions for all 6 supported ratios", () => {
      const ratios = ["16:9", "4:3", "1:1", "3:4", "9:16", "3:2", "2:3"];
      for (const r of ratios) {
        const resolved = resolveImageDimensions(r, "gpt-image-2");
        expect(resolved.aspect_ratio).toBe(r);
        expect(resolved.size).toBeDefined();
      }
    });

    it("resolveImgStudioAspectRatio rejects unsupported aspect ratio", () => {
      expect(() => resolveImgStudioAspectRatio("7:5")).toThrow(/Unsupported aspect ratio/);
    });

    it("resolveImgStudioAspectRatio accepts all 6 supported ratios", () => {
      const ratios = ["1:1", "16:9", "4:3", "3:4", "9:16", "3:2", "2:3"] as const;
      for (const r of ratios) {
        expect(resolveImgStudioAspectRatio(r)).toBe(r);
      }
    });
  });

  describe("Returned image dimension decoding and validation", () => {
    it("decodes valid PNG dimensions from IHDR header", () => {
      const pngBytes = makeMockPngBytes(1280, 720);
      const dims = extractImageDimensions(pngBytes);
      expect(dims).not.toBeNull();
      expect(dims!.width).toBe(1280);
      expect(dims!.height).toBe(720);
      expect(dims!.aspectRatio).toBeCloseTo(16 / 9, 3);
    });

    it("validates that 1280x720 PNG matches requested 16:9 ratio", () => {
      const pngBytes = makeMockPngBytes(1280, 720);
      const validated = validateReturnedImageDimensions(pngBytes, "16:9");
      expect(validated.width).toBe(1280);
      expect(validated.height).toBe(720);
    });

    it("validates that 1024x768 PNG matches requested 4:3 ratio", () => {
      const pngBytes = makeMockPngBytes(1024, 768);
      const validated = validateReturnedImageDimensions(pngBytes, "4:3");
      expect(validated.width).toBe(1024);
      expect(validated.height).toBe(768);
    });

    it("validates that 768x1024 PNG matches requested 3:4 ratio", () => {
      const pngBytes = makeMockPngBytes(768, 1024);
      const validated = validateReturnedImageDimensions(pngBytes, "3:4");
      expect(validated.width).toBe(768);
      expect(validated.height).toBe(1024);
    });

    it("throws IMAGE_RATIO_MISMATCH when returned PNG ratio differs from requested ratio", () => {
      // Return 1024x1024 (1:1) when 16:9 was requested
      const squareBytes = makeMockPngBytes(1024, 1024);
      expect(() => {
        validateReturnedImageDimensions(squareBytes, "16:9");
      }).toThrow(/IMAGE_RATIO_MISMATCH/);
    });

    it("validates fallback metadataSize string when non-PNG bytes supplied", () => {
      const dummyBytes = new Uint8Array([1, 2, 3, 4]);
      const validated = validateReturnedImageDimensions(dummyBytes, "16:9", "1920x1080");
      expect(validated.width).toBe(1920);
      expect(validated.height).toBe(1080);
    });
  });
});
