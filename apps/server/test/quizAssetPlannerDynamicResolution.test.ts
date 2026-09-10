import { describe, expect, it } from "vitest";
import {
  type DirectorPlan,
  type QuizV2,
  QuizV2Schema,
  resolveQuizLayoutAssetAspectRatio,
} from "@studio/shared";
import { assetFingerprint } from "../src/quiz/assets/assetFingerprint.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";

function buildTestQuiz(questions: QuizV2["questions"]): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "test-dynamic-res-ep",
    age_band: "7-9",
    language: "English",
    questions,
  });
}

function buildTestDirectorPlan(beats: DirectorPlan["beats"]): DirectorPlan {
  return {
    schema_version: 2,
    episode_id: "test-dynamic-res-ep",
    archetype_family: "candy_arcade",
    midpoint_question_id: null,
    final_challenge_question_id: null,
    beats,
  };
}

describe("Dynamic Resolution in Asset Planner & Pipeline", () => {
  it("ensures assetFingerprint cleanly separates different aspect ratios to avoid cache collisions", () => {
    const baseRequest = {
      semantic_key: "question-01:hero_question_image",
      subject: "A curious red fox sitting in autumn woods",
      purpose: "hero_question_image" as const,
      style: "cute_illustration" as const,
      aspect_ratio: "16:9" as const,
      transparent_background: false,
    };

    const fp16_9 = assetFingerprint({ ...baseRequest, aspect_ratio: "16:9" });
    const fp4_3 = assetFingerprint({ ...baseRequest, aspect_ratio: "4:3" });
    const fp1_1 = assetFingerprint({ ...baseRequest, aspect_ratio: "1:1" });
    const fp9_16 = assetFingerprint({ ...baseRequest, aspect_ratio: "9:16" });

    // Every aspect ratio must produce a unique hash
    const distinctSet = new Set([fp16_9, fp4_3, fp1_1, fp9_16]);
    expect(distinctSet.size).toBe(4);
  });

  it("plans aspect_ratio: '4:3' for hero question image when layout is media_left_choices_right", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-media-left",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which bird can fly backwards?",
        choices: [
          { id: "c-1", text: "Hummingbird" },
          { id: "c-2", text: "Eagle" },
          { id: "c-3", text: "Penguin" },
        ],
        correct_choice_id: "c-1",
        explanation: "Hummingbirds can fly backwards.",
        fun_fact: "",
        source_ids: ["S01"],
        visual_opportunity: "A colorful hummingbird hovering near flowers",
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

    const plan = planQuizAssets(quiz, director);
    const heroAsset = plan.assets.find((asset) => asset.purpose === "hero_question_image");

    expect(heroAsset).toBeDefined();
    expect(heroAsset?.asset_id).toBe("asset-q-media-left-hero");
    expect(heroAsset?.aspect_ratio).toBe("4:3");

    // Verify prompt compilation incorporates the 4:3 framing
    const compiled = compileQuizAssetPrompt(heroAsset!);
    expect(compiled.prompt).toContain("Output framing: 4:3.");
    expect(compiled.prompt).toContain("4:3 standard horizontal canvas");
  });

  it("plans aspect_ratio: '4:3' for hero question image when layout is verdict_true_false", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-verdict-tf",
        number: 1,
        format: "true_false",
        difficulty: 1,
        question: "Is lightning hotter than the surface of the sun?",
        choices: [
          { id: "c-true", text: "True" },
          { id: "c-false", text: "False" },
        ],
        correct_choice_id: "c-true",
        explanation: "Lightning can reach 30,000 kelvins.",
        fun_fact: "",
        source_ids: ["S02"],
        visual_opportunity: "A dramatic lightning strike against storm clouds",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-verdict-tf",
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
    const heroAsset = plan.assets.find((asset) => asset.purpose === "hero_question_image");

    expect(heroAsset).toBeDefined();
    expect(heroAsset?.aspect_ratio).toBe("4:3");

    const compiled = compileQuizAssetPrompt(heroAsset!);
    expect(compiled.prompt).toContain("Output framing: 4:3.");
  });

  it("plans aspect_ratio: '16:9' for hero question image when layout is mystery_reveal", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-mystery",
        number: 1,
        format: "image_guess",
        difficulty: 1,
        question: "Guess the hidden creature!",
        choices: [
          { id: "c-1", text: "Chameleon" },
          { id: "c-2", text: "Gecko" },
          { id: "c-3", text: "Iguana" },
        ],
        correct_choice_id: "c-1",
        explanation: "It is a chameleon blending in.",
        fun_fact: "",
        source_ids: ["S03"],
        visual_opportunity: "A green chameleon perched on a jungle branch",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-mystery",
        archetype: "mystery_reveal",
        layout_id: "mystery_reveal",
        energy: "playful",
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
    const heroAsset = plan.assets.find((asset) => asset.purpose === "hero_question_image");

    expect(heroAsset).toBeDefined();
    expect(heroAsset?.aspect_ratio).toBe("16:9");
    expect(heroAsset?.transparent_background).toBe(true);

    const compiled = compileQuizAssetPrompt(heroAsset!);
    expect(compiled.prompt).toContain("Output framing: 16:9.");
    expect(compiled.prompt).toContain("16:9 widescreen landscape framing");
  });

  it("plans aspect_ratio: '1:1' for answer options when layout is visual_choices_three", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-visual-choices",
        number: 1,
        format: "odd_one_out",
        difficulty: 1,
        question: "Which one does not belong?",
        choices: [
          { id: "c-a", text: "Apple" },
          { id: "c-b", text: "Banana" },
          { id: "c-c", text: "Carrot" },
        ],
        correct_choice_id: "c-c",
        explanation: "Carrot is a root vegetable, not a fruit.",
        fun_fact: "",
        source_ids: ["S04"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-visual-choices",
        archetype: "visual_multiple_choice",
        layout_id: "visual_choices_three",
        energy: "curious",
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
    const optionAssets = plan.assets.filter((asset) => asset.purpose === "answer_option");

    expect(optionAssets.length).toBe(3);
    for (const option of optionAssets) {
      expect(option.aspect_ratio).toBe("1:1");
      expect(option.transparent_background).toBe(true);

      const compiled = compileQuizAssetPrompt(option);
      expect(compiled.prompt).toContain("Output framing: 1:1.");
      expect(compiled.prompt).toContain("1:1 square canvas");
    }
  });

  it("correctly resolves aspect ratio with resolveQuizLayoutAssetAspectRatio helper directly", () => {
    expect(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "hero_question_image")).toBe("4:3");
    expect(resolveQuizLayoutAssetAspectRatio("verdict_true_false", "hero_question_image")).toBe("4:3");
    expect(resolveQuizLayoutAssetAspectRatio("clue_deduction", "hero_question_image")).toBe("4:3");
    expect(resolveQuizLayoutAssetAspectRatio("split_versus_two", "hero_question_image")).toBe("4:3");
    expect(resolveQuizLayoutAssetAspectRatio("mystery_reveal", "hero_question_image")).toBe("16:9");
    expect(resolveQuizLayoutAssetAspectRatio("baseline", "hero_question_image")).toBe("16:9");
    expect(resolveQuizLayoutAssetAspectRatio("visual_choices_three", "answer_option")).toBe("1:1");
    expect(resolveQuizLayoutAssetAspectRatio("visual_choices_three_pure", "answer_option")).toBe("1:1");
    expect(resolveQuizLayoutAssetAspectRatio("split_versus_two", "answer_option")).toBe("1:1");
  });

  it("compiles authentic character identities verbatim without censorship across 16:9, 4:3, 1:1, 3:4, and 9:16", () => {
    const authenticSubjects = [
      { name: "Pikachu with red electric cheeks", ratio: "16:9" as const, framing: "16:9 widescreen landscape framing" },
      { name: "Spider-Man perching on a brick wall", ratio: "4:3" as const, framing: "4:3 standard horizontal canvas" },
      { name: "Mario in blue overalls with mustache", ratio: "1:1" as const, framing: "1:1 square canvas" },
      { name: "Elsa creating crystalline snowflakes", ratio: "3:4" as const, framing: "3:4 portrait card canvas" },
      { name: "Goku in orange martial arts gi", ratio: "9:16" as const, framing: "9:16 vertical portrait framing" },
    ];

    for (const item of authenticSubjects) {
      const assetReq = {
        asset_id: `asset-${item.ratio.replace(":", "-")}`,
        question_id: "q-authentic",
        semantic_key: `q-authentic:${item.ratio}`,
        subject: item.name,
        purpose: "hero_question_image" as const,
        style: "cute_illustration" as const,
        aspect_ratio: item.ratio,
        transparent_background: false,
        required: true,
      };

      const compiled = compileQuizAssetPrompt(assetReq);
      // Verify subject is preserved verbatim without censorship or proxy rewriting
      expect(compiled.prompt).toContain(`Subject: ${item.name}.`);
      // Verify correct aspect ratio framing
      expect(compiled.prompt).toContain(`Output framing: ${item.ratio}.`);
      expect(compiled.prompt).toContain(item.framing);
      // Verify safe margins and edge-clipping prevention
      expect(compiled.prompt).toMatch(/safe margins|margins on all sides|top\/bottom and side margins/);
      expect(compiled.prompt).toMatch(/edge-clipping/);
    }
  });

  it("resolves canonical 720p base dimensions deterministically for all supported aspect ratios", async () => {
    const { getStandardDimensionsForAspectRatio, STANDARD_ASPECT_RATIO_DIMENSIONS } = await import(
      "../src/providers/gpti2Dimensions.js"
    );

    expect(getStandardDimensionsForAspectRatio("16:9")).toEqual({ width: 1280, height: 720, dimensions: "1280x720" });
    expect(getStandardDimensionsForAspectRatio("4:3")).toEqual({ width: 960, height: 720, dimensions: "960x720" });
    expect(getStandardDimensionsForAspectRatio("1:1")).toEqual({ width: 720, height: 720, dimensions: "720x720" });
    expect(getStandardDimensionsForAspectRatio("3:4")).toEqual({ width: 720, height: 960, dimensions: "720x960" });
    expect(getStandardDimensionsForAspectRatio("9:16")).toEqual({ width: 720, height: 1280, dimensions: "720x1280" });

    expect(STANDARD_ASPECT_RATIO_DIMENSIONS["16:9"].dimensions).toBe("1280x720");
    expect(STANDARD_ASPECT_RATIO_DIMENSIONS["4:3"].dimensions).toBe("960x720");
    expect(STANDARD_ASPECT_RATIO_DIMENSIONS["1:1"].dimensions).toBe("720x720");
    expect(STANDARD_ASPECT_RATIO_DIMENSIONS["3:4"].dimensions).toBe("720x960");
    expect(STANDARD_ASPECT_RATIO_DIMENSIONS["9:16"].dimensions).toBe("720x1280");
  });
});
