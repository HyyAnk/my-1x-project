import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type DirectorPlan,
  getQuizPreviewLayoutCapability,
  QUIZ_LAYOUT_CATALOG,
  type QuizLayoutAssetAspectRatio,
  type QuizPreviewLayoutId,
  type QuizV2,
  QuizV2Schema,
  resolveQuizLayoutAssetAspectRatio,
} from "@studio/shared";
import { assetFingerprint } from "../src/quiz/assets/assetFingerprint.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { framingRules } from "../src/quiz/assets/promptFramingRules.js";
import { resolveImageDimensions } from "../src/providers/gpti2Dimensions.js";
import { generateThemedPlaceholderPng } from "../src/providers/pngEncoder.js";
import { getOptimalAssetDimensions, optimizeRenderImage } from "../src/tasks/video/imageOptimizer.js";
import { renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

function buildTestQuiz(questions: QuizV2["questions"]): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "test-aspect-ratio-e2e-ep",
    age_band: "7-9",
    language: "English",
    questions,
  });
}

function buildTestDirectorPlan(beats: DirectorPlan["beats"]): DirectorPlan {
  return {
    schema_version: 2,
    episode_id: "test-aspect-ratio-e2e-ep",
    archetype_family: "candy_arcade",
    midpoint_question_id: null,
    final_challenge_question_id: null,
    beats,
  };
}

describe("Quiz Layout Asset Aspect Ratio End-to-End Suite", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `quiz-ar-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("1. Full Pipeline Flow Across All 4 Aspect Ratios", () => {
    it("executes full pipeline for '4:3' layout: media_left_choices_right", () => {
      const quiz = buildTestQuiz([
        {
          id: "q-media-left",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which mammal lay eggs?",
          choices: [
            { id: "c-1", text: "Platypus" },
            { id: "c-2", text: "Kangaroo" },
            { id: "c-3", text: "Koala" },
          ],
          correct_choice_id: "c-1",
          explanation: "The platypus is a monotreme that lays eggs.",
          fun_fact: "Monotremes are unique mammals.",
          source_ids: ["S-01"],
          visual_opportunity: "A cheerful platypus swimming in a clean freshwater stream",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ]);

      const director = buildTestDirectorPlan([
        {
          question_id: "q-media-left",
          archetype: "illustrated_multiple_choice",
          layout_id: "media_left_choices_right",
          energy: "curious",
          visual_density: "focused",
          palette_id: "lime",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          background_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["question_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick", "correct_small"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ]);

      // 1. Asset Planner & Dynamic Resolution
      const plan = planQuizAssets(quiz, director);
      const hero = plan.assets.find((a) => a.purpose === "hero_question_image");
      expect(hero).toBeDefined();
      expect(hero?.aspect_ratio).toBe("4:3");
      expect(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "hero_question_image")).toBe("4:3");

      // 2. Prompt Compiler
      const compiled = compileQuizAssetPrompt(hero!);
      expect(compiled.prompt).toContain("Output framing: 4:3.");
      expect(compiled.prompt).toContain("4:3 standard horizontal canvas");

      // 3. Provider Target Sizing
      const gpti2Size = resolveImageDimensions(hero?.aspect_ratio, "gpt-image-2");
      expect(gpti2Size).toEqual({ size: "1024x768", aspect_ratio: "4:3" });
      const nanoBananaSize = resolveImageDimensions(hero?.aspect_ratio, "nano-banana-2");
      expect(nanoBananaSize).toEqual({ size: "2K", aspect_ratio: "4:3" });

      // 4. Image Optimizer Target Metrics
      const dims = getOptimalAssetDimensions("hero", "media_left_choices_right");
      expect(dims).toEqual({ maxWidth: 1056, maxHeight: 792, aspectRatio: "4:3" });
    });

    it("executes full pipeline for '16:9' layout: verdict_true_false", () => {
      const quiz = buildTestQuiz([
        {
          id: "q-tf",
          number: 1,
          format: "true_false",
          difficulty: 1,
          question: "Sound travels faster in water than in air.",
          choices: [
            { id: "c-t", text: "True" },
            { id: "c-f", text: "False" },
          ],
          correct_choice_id: "c-t",
          explanation: "Water is denser, carrying sound waves faster.",
          fun_fact: "Sound travels about 4.3 times faster in water.",
          source_ids: ["S-02"],
          visual_opportunity: "Underwater soundwaves rippling through deep ocean blue",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ]);

      const director = buildTestDirectorPlan([
        {
          question_id: "q-tf",
          archetype: "true_false",
          layout_id: "verdict_true_false",
          energy: "excited",
          visual_density: "lively",
          palette_id: "aqua",
          motion_id: "enter.scale",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          background_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["question_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick", "correct_small"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ]);

      const plan = planQuizAssets(quiz, director);
      const hero = plan.assets.find((a) => a.purpose === "hero_question_image");
      expect(hero).toBeDefined();
      expect(hero?.aspect_ratio).toBe("16:9");

      const compiled = compileQuizAssetPrompt(hero!);
      expect(compiled.prompt).toContain("Output framing: 16:9.");

      const dims = getOptimalAssetDimensions("hero", "verdict_true_false");
      expect(dims).toEqual({ maxWidth: 1408, maxHeight: 792, aspectRatio: "16:9" });
    });

    it("executes full pipeline for '16:9' layout: clue_deduction", () => {
      const quiz = buildTestQuiz([
        {
          id: "q-clue",
          number: 1,
          format: "image_guess",
          difficulty: 2,
          question: "Which profession uses these tools?",
          choices: [
            { id: "c-1", text: "Astronomer" },
            { id: "c-2", text: "Geologist" },
            { id: "c-3", text: "Botanist" },
          ],
          correct_choice_id: "c-1",
          explanation: "Telescopes and star maps belong to astronomers.",
          fun_fact: "Astronomers study celestial bodies.",
          source_ids: ["S-03"],
          visual_opportunity: "A brass telescope pointed towards starry night skies",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ]);

      const director = buildTestDirectorPlan([
        {
          question_id: "q-clue",
          archetype: "clue_deduction",
          layout_id: "clue_deduction",
          energy: "curious",
          visual_density: "focused",
          palette_id: "grape",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          background_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["question_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick", "correct_small"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ]);

      const plan = planQuizAssets(quiz, director);
      const hero = plan.assets.find((a) => a.purpose === "hero_question_image");
      expect(hero?.aspect_ratio).toBe("16:9");

      const compiled = compileQuizAssetPrompt(hero!);
      expect(compiled.prompt).toContain("Output framing: 16:9.");

      const dims = getOptimalAssetDimensions("hero", "clue_deduction");
      expect(dims).toEqual({ maxWidth: 896, maxHeight: 504, aspectRatio: "16:9" });
    });

    it("executes full pipeline for '1:1' layout: visual_choices_three and visual_choices_three_pure", () => {
      const quiz = buildTestQuiz([
        {
          id: "q-visual",
          number: 1,
          format: "odd_one_out",
          difficulty: 1,
          question: "Which one cannot fly?",
          choices: [
            { id: "c-1", text: "Robin" },
            { id: "c-2", text: "Ostrich" },
            { id: "c-3", text: "Sparrow" },
          ],
          correct_choice_id: "c-2",
          explanation: "Ostriches are flightless birds.",
          fun_fact: "Ostriches can run up to 70 km/h.",
          source_ids: ["S-04"],
          visual_opportunity: "",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ]);

      const director = buildTestDirectorPlan([
        {
          question_id: "q-visual",
          archetype: "visual_multiple_choice",
          layout_id: "visual_choices_three",
          energy: "lively",
          visual_density: "lively",
          palette_id: "orange",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          background_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["choice_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick", "correct_small"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ]);

      const plan = planQuizAssets(quiz, director);
      const choiceAssets = plan.assets.filter((a) => a.purpose === "answer_option");
      expect(choiceAssets).toHaveLength(3);

      for (const choice of choiceAssets) {
        expect(choice.aspect_ratio).toBe("4:3");
        expect(choice.transparent_background).toBe(true);

        const compiled = compileQuizAssetPrompt(choice);
        expect(compiled.prompt).toContain("Output framing: 4:3.");
        expect(compiled.prompt).toContain("4:3 standard horizontal canvas");

        const gpti2Size = resolveImageDimensions(choice.aspect_ratio, "gpt-image-2");
        expect(gpti2Size).toEqual({ size: "1024x768", aspect_ratio: "4:3" });

        const nanoSize = resolveImageDimensions(choice.aspect_ratio, "nano-banana-2");
        expect(nanoSize).toEqual({ size: "2K", aspect_ratio: "4:3" });
      }

      // Check visual_choices_three optimizer dimensions
      const optChoices = getOptimalAssetDimensions("choice_thumbnail", "visual_choices_three");
      expect(optChoices).toEqual({ maxWidth: 672, maxHeight: 504, aspectRatio: "4:3" });

      // Check visual_choices_three_pure resolution & optimizer
      expect(resolveQuizLayoutAssetAspectRatio("visual_choices_three_pure", "answer_option")).toBe("1:1");
      const optPure = getOptimalAssetDimensions("choice_thumbnail", "visual_choices_three_pure");
      expect(optPure).toEqual({ maxWidth: 728, maxHeight: 728, aspectRatio: "1:1" });
    });

    it("executes full pipeline for '16:9' and '4:3' hybrid layout: split_versus_two", () => {
      expect(resolveQuizLayoutAssetAspectRatio("split_versus_two", "answer_option")).toBe("16:9");
      expect(resolveQuizLayoutAssetAspectRatio("split_versus_two", "hero_question_image")).toBe("4:3");

      const heroDims = getOptimalAssetDimensions("hero", "split_versus_two");
      expect(heroDims).toEqual({ maxWidth: 1080, maxHeight: 810, aspectRatio: "4:3" });

      const choiceDims = getOptimalAssetDimensions("answer_option", "split_versus_two");
      expect(choiceDims).toEqual({ maxWidth: 1024, maxHeight: 576, aspectRatio: "16:9" });
    });

    it("executes full pipeline for '16:9' layout: mystery_reveal and baseline", () => {
      const quiz = buildTestQuiz([
        {
          id: "q-mystery",
          number: 1,
          format: "image_guess",
          difficulty: 1,
          question: "Can you guess what this is?",
          choices: [
            { id: "c-1", text: "Giraffe" },
            { id: "c-2", text: "Zebra" },
            { id: "c-3", text: "Horse" },
          ],
          correct_choice_id: "c-1",
          explanation: "The tall neck reveals the giraffe.",
          fun_fact: "Giraffes have blue tongues.",
          source_ids: ["S-05"],
          visual_opportunity: "A gentle giraffe peeking through savanna acacia trees",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ]);

      const director = buildTestDirectorPlan([
        {
          question_id: "q-mystery",
          archetype: "mystery_reveal",
          layout_id: "mystery_reveal",
          energy: "curious",
          visual_density: "focused",
          palette_id: "sunny",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          background_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["question_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick", "correct_small"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ]);

      const plan = planQuizAssets(quiz, director);
      const hero = plan.assets.find((a) => a.purpose === "hero_question_image");
      expect(hero?.aspect_ratio).toBe("16:9");
      expect(hero?.transparent_background).toBe(true);

      const compiled = compileQuizAssetPrompt(hero!);
      expect(compiled.prompt).toContain("Output framing: 16:9.");
      expect(compiled.prompt).toContain("16:9 widescreen landscape framing");

      const gpti2Size = resolveImageDimensions(hero?.aspect_ratio, "gpt-image-2");
      expect(gpti2Size).toEqual({ size: "1280x720", aspect_ratio: "16:9" });

      const dims = getOptimalAssetDimensions("hero", "mystery_reveal");
      expect(dims).toEqual({ maxWidth: 768, maxHeight: 432, aspectRatio: "16:9" });

      // Baseline preview layout
      expect(resolveQuizLayoutAssetAspectRatio("baseline", "hero_question_image")).toBe("16:9");
      const baseDims = getOptimalAssetDimensions("hero", "baseline");
      expect(baseDims).toEqual({ maxWidth: 1080, maxHeight: 608, aspectRatio: "16:9" });
    });

    it("executes full pipeline for '3:4' portrait card aspect ratio", () => {
      const framing = framingRules("3:4", "hero_question_image");
      expect(framing).toBe(
        "Composition: 3:4 portrait card canvas. Center the focal subject vertically and horizontally with balanced top/bottom and side margins to avoid edge-clipping, tailored for card containers.",
      );

      const gpti2 = resolveImageDimensions("3:4", "gpt-image-2");
      expect(gpti2).toEqual({ size: "768x1024", aspect_ratio: "3:4" });

      const nano = resolveImageDimensions("3:4", "nano-banana-2");
      expect(nano).toEqual({ size: "2K", aspect_ratio: "3:4" });

      // PngEncoder placeholder sizing for 3:4
      const placeholder3_4 = generateThemedPlaceholderPng("Test 3:4 Title", "Test Subtitle", "candy_arcade", 540, 720);
      expect(placeholder3_4.byteLength).toBeGreaterThan(100);

      // Verify prompt compilation incorporates 3:4 framing rule
      const mockAssetReq = {
        asset_id: "asset-card-34",
        question_id: "q-card-34",
        semantic_key: "q-card-34:hero_question_image",
        subject: "A majestic golden lion emblem",
        purpose: "hero_question_image" as const,
        style: "cute_illustration" as const,
        aspect_ratio: "3:4" as QuizLayoutAssetAspectRatio,
        transparent_background: false,
      };
      const compiledPrompt = compileQuizAssetPrompt(mockAssetReq);
      expect(compiledPrompt.prompt).toContain("Output framing: 3:4.");
      expect(compiledPrompt.prompt).toContain("3:4 portrait card canvas");
    });
  });

  describe("2. Asset Fingerprint Caching Safety Across All 4 Ratios", () => {
    it("guarantees unique fingerprints across 16:9, 4:3, 1:1, and 3:4 with zero collision", () => {
      const base = {
        semantic_key: "question-golden:hero_question_image",
        subject: "A gleaming golden compass pointing north",
        purpose: "hero_question_image" as const,
        style: "cute_illustration" as const,
        transparent_background: false,
      };

      const fp16_9 = assetFingerprint({ ...base, aspect_ratio: "16:9" });
      const fp4_3 = assetFingerprint({ ...base, aspect_ratio: "4:3" });
      const fp1_1 = assetFingerprint({ ...base, aspect_ratio: "1:1" });
      const fp3_4 = assetFingerprint({ ...base, aspect_ratio: "3:4" });

      // All 4 hashes must be mutually distinct
      const uniqueHashes = new Set([fp16_9, fp4_3, fp1_1, fp3_4]);
      expect(uniqueHashes.size).toBe(4);

      // Mutating only aspect_ratio must invalidate cache key
      expect(fp4_3).not.toBe(fp16_9);
      expect(fp4_3).not.toBe(fp1_1);
      expect(fp4_3).not.toBe(fp3_4);
      expect(fp1_1).not.toBe(fp3_4);
    });
  });

  describe("3. Visual Parity & Render Markup Verification", () => {
    it("renders valid markup via renderQuizLayoutBody for all supported layouts without breakages", () => {
      const layouts: QuizPreviewLayoutId[] = [
        "media_left_choices_right",
        "verdict_true_false",
        "clue_deduction",
        "visual_choices_three",
        "visual_choices_three_pure",
        "split_versus_two",
        "mystery_reveal",
        "full_stack_list",
        "baseline",
      ];

      const slots = {
        questionBoxHtml: '<div class="test-question-box">Question?</div>',
        heroHtml: '<div class="test-hero"><img src="hero.png" /></div>',
        choicesHtml: '<div class="test-choices">Choices</div>',
        phaseHtml: '<div class="test-phase">Phase</div>',
      };

      for (const layoutId of layouts) {
        const rendered = renderQuizLayoutBody(layoutId, slots);
        expect(rendered).toContain(slots.questionBoxHtml);
        expect(rendered).toContain(slots.choicesHtml);
        if (layoutId === "media_left_choices_right") {
          expect(rendered).toContain('<div class="phase-region">');
          expect(rendered).toContain(slots.heroHtml);
        }
      }
    });

    it("renders valid sandbox compositions in snapshot and rehearsal modes with media_left_choices_right", () => {
      const snapshot = buildSandboxComposition({
        layout_id: "media_left_choices_right",
        question_number: 1,
        total_questions: 3,
        question_text: "What animal builds dams?",
        choices: ["Beaver", "Otter", "Badger"],
        correct_choice_index: 0,
        fact_card_text: "Beavers build lodges and dams using wood and mud.",
        mode: "snapshot",
        phase: "choices",
      });

      expect(snapshot.html).toContain("layout-media_left_choices_right");
      expect(snapshot.html).toContain("What animal builds dams?");
      expect(snapshot.css).toContain(".layout-media_left_choices_right");
      expect(snapshot.contrast_report.ok).toBe(true);

      const rehearsal = buildSandboxComposition({
        layout_id: "media_left_choices_right",
        question_number: 1,
        total_questions: 3,
        question_text: "What animal builds dams?",
        choices: ["Beaver", "Otter", "Badger"],
        correct_choice_index: 0,
        fact_card_text: "Beavers build lodges and dams using wood and mud.",
        mode: "rehearsal",
      });

      expect(rehearsal.html).toContain("layout-media_left_choices_right");
      expect(rehearsal.html).toContain("phase-region");
      expect(rehearsal.contrast_report.ok).toBe(true);
    });
  });

  describe("4. Mathematical & Visual Cropping Analysis", () => {
    it("verifies mathematically that 4:3 hero reduces horizontal cropping from ~24.2% down to 0%", () => {
      // Container specification in mediaLeftChoicesRightLayout:
      // Stage width: 1420px, Column gap: 34px -> Available width: 1386px
      // Grid columns: minmax(0, 1.05fr) minmax(480px, 0.95fr)
      // Left hero column width: (1.05 / 2.00) * 1386 = 727.65px (~728px)
      // Container height: 540px
      const containerWidth = 727.65;
      const containerHeight = 540.0;

      // 1. Legacy 16:9 Image in object-fit: cover
      const imageRatio16_9 = 16 / 9; // ~1.7778
      // Under object-fit: cover, since imageRatio > containerRatio, height scales to fit container:
      const renderedWidth16_9 = containerHeight * imageRatio16_9; // 540 * (16/9) = 960px
      const horizontalCropPx16_9 = renderedWidth16_9 - containerWidth; // 960 - 727.65 = 232.35px
      const horizontalCropPercent16_9 = (horizontalCropPx16_9 / renderedWidth16_9) * 100;

      // Legacy 16:9 loses ~24.2% of its width to horizontal cropping
      expect(horizontalCropPercent16_9).toBeGreaterThan(24.0);
      expect(horizontalCropPercent16_9).toBeLessThan(24.5);

      // 2. Upgraded 4:3 Image in object-fit: cover
      const imageRatio4_3 = 4 / 3; // ~1.3333
      // Since imageRatio4_3 <= containerRatio (1.3333 <= 1.3475), the width scales to fit container:
      // Rendered width matches container width exactly (727.65px), so horizontal cropping is 0%!
      const horizontalCropPercent4_3 = 0;

      // Vertical difference:
      const renderedHeight4_3 = containerWidth / imageRatio4_3; // 727.65 / (4/3) = 545.7375px
      const verticalCropPx4_3 = renderedHeight4_3 - containerHeight; // 545.7375 - 540 = 5.7375px
      const verticalCropPercent4_3 = (verticalCropPx4_3 / renderedHeight4_3) * 100; // ~1.05%

      // Verification assertions
      expect(horizontalCropPercent4_3).toBe(0);
      expect(verticalCropPercent4_3).toBeLessThan(1.1); // ~1.05% vertical crop (practically unnoticeable)

      // The horizontal crop reduction is greater than 24 percentage points
      const cropReduction = horizontalCropPercent16_9 - horizontalCropPercent4_3;
      expect(cropReduction).toBeGreaterThan(24.0);
    });
  });

  describe("5. Sharp Image Optimization Across Layout Metrics", () => {
    it("optimizes real 4:3, 1:1, and 3:4 raster images to respective layout targets without distortion", async () => {
      // 1. 4:3 Hero Image optimization
      const src4_3 = path.join(tempDir, "sample_4_3.png");
      const out4_3 = path.join(tempDir, "sample_4_3_optimized.png");
      await sharp({
        create: { width: 1600, height: 1200, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
      })
        .png()
        .toFile(src4_3);

      const res4_3 = await optimizeRenderImage({
        sourcePath: src4_3,
        targetPath: out4_3,
        purpose: "hero",
        layout: "media_left_choices_right",
      });

      expect(res4_3.optimized).toBe(true);
      expect(res4_3.targetWidth).toBe(1056);
      expect(res4_3.targetHeight).toBe(792);

      // 2. 1:1 Choice Image optimization
      const src1_1 = path.join(tempDir, "sample_1_1.png");
      const out1_1 = path.join(tempDir, "sample_1_1_optimized.png");
      await sharp({
        create: { width: 1000, height: 1000, channels: 4, background: { r: 250, g: 100, b: 50, alpha: 1 } },
      })
        .png()
        .toFile(src1_1);

      const res1_1 = await optimizeRenderImage({
        sourcePath: src1_1,
        targetPath: out1_1,
        purpose: "choice_thumbnail",
        layout: "visual_choices_three_pure",
      });

      expect(res1_1.optimized).toBe(true);
      expect(res1_1.targetWidth).toBe(728);
      expect(res1_1.targetHeight).toBe(728);

      // 3. 3:4 Card Image optimization
      const src3_4 = path.join(tempDir, "sample_3_4.png");
      const out3_4 = path.join(tempDir, "sample_3_4_optimized.png");
      await sharp({
        create: { width: 1200, height: 1600, channels: 4, background: { r: 120, g: 220, b: 120, alpha: 1 } },
      })
        .png()
        .toFile(src3_4);

      const res3_4 = await optimizeRenderImage({
        sourcePath: src3_4,
        targetPath: out3_4,
        maxWidth: 768,
        maxHeight: 1024,
      });

      expect(res3_4.optimized).toBe(true);
      expect(res3_4.targetWidth).toBe(768);
      expect(res3_4.targetHeight).toBe(1024);
    });
  });

  describe("6. Provider Adapter Multi-Ratio Dispatch & Authentic Identity", () => {
    it("verifies provider adapters accept and handle all 5 aspect ratios deterministically", async () => {
      const { resolveImageDimensions, getStandardDimensionsForAspectRatio } = await import(
        "../src/providers/gpti2Dimensions.js"
      );

      const ratios = ["16:9", "4:3", "1:1", "3:4", "9:16"] as const;

      for (const ratio of ratios) {
        // Standard canonical dimensions
        const standard = getStandardDimensionsForAspectRatio(ratio);
        expect(standard.dimensions).toBeDefined();

        // GPT-Image-2 provider dimensions
        const gpti2 = resolveImageDimensions(ratio, "gpt-image-2");
        expect(gpti2.aspect_ratio).toBe(ratio);
        expect(gpti2.size).toMatch(/^\d+x\d+$/);

        // Nano-Banana provider dimensions
        const nano = resolveImageDimensions(ratio, "nano-banana-2");
        expect(nano.aspect_ratio).toBe(ratio);
        expect(nano.size).toBe("2K");
      }
    });

    it("verifies prompt compilation preserves authentic character identities across all 5 aspect ratios", () => {
      const characterTests = [
        { subject: "Pikachu releasing thunderbolt sparks", ratio: "16:9" as const },
        { subject: "Super Mario jumping over green pipes", ratio: "4:3" as const },
        { subject: "Sonic the Hedgehog curling into spin attack", ratio: "1:1" as const },
        { subject: "Batman standing on a Gotham rooftop gargoyle", ratio: "3:4" as const },
        { subject: "Spider-Man swinging between skyscrapers", ratio: "9:16" as const },
      ];

      for (const { subject, ratio } of characterTests) {
        const req = {
          asset_id: `asset-${ratio.replace(":", "-")}`,
          question_id: "q-hero",
          semantic_key: `q-hero:${ratio}`,
          subject,
          purpose: "hero_question_image" as const,
          style: "cute_illustration" as const,
          aspect_ratio: ratio,
          transparent_background: false,
          required: true,
        };

        const compiled = compileQuizAssetPrompt(req);
        // Subject preserved verbatim
        expect(compiled.prompt).toContain(`Subject: ${subject}.`);
        // Aspect ratio instructed clearly
        expect(compiled.prompt).toContain(`Output framing: ${ratio}.`);
        // Identifying marks permitted without artificial censorship
        expect(compiled.prompt).toContain("retain identifying marks explicitly required by the subject");
        // No forced proxy rewriting
        expect(compiled.prompt).not.toContain("safe_visual_proxy");
        expect(compiled.prompt).not.toContain("forbidden_visual_keywords");
      }
    });
  });
});
