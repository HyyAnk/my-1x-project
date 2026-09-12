import { describe, expect, it } from "vitest";
import {
  type DirectorPlan,
  type QuizV2,
  QuizV2Schema,
} from "@studio/shared";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { reconcileQuizAssetSizing } from "../src/quiz/assets/reconcileQuizAssetSizing.js";

function buildTestQuiz(questions: QuizV2["questions"]): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "test-reconciliation-ep",
    age_band: "7-9",
    language: "English",
    questions,
  });
}

function buildTestDirectorPlan(beats: DirectorPlan["beats"]): DirectorPlan {
  return {
    schema_version: 2,
    episode_id: "test-reconciliation-ep",
    archetype_family: "candy_arcade",
    midpoint_question_id: null,
    final_challenge_question_id: null,
    beats,
  };
}

describe("quizAssetSizingReconciliation", () => {
  it("plans 4:3 answer options for visual_choices_three and compiles prompt without square frame wording", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-vc3",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which fruit is yellow?",
        choices: [
          { id: "c-1", text: "Banana" },
          { id: "c-2", text: "Apple" },
          { id: "c-3", text: "Grape" },
        ],
        correct_choice_id: "c-1",
        explanation: "Bananas are yellow.",
        fun_fact: "",
        source_ids: ["S-01"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-vc3",
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
    const options = plan.assets.filter((a) => a.purpose === "answer_option");
    expect(options.map((a) => a.aspect_ratio)).toEqual(["4:3", "4:3", "4:3"]);
    expect(options[0].sizing?.recommended_width).toBe(672);
    expect(options[0].sizing?.recommended_height).toBe(504);

    const compiled = compileQuizAssetPrompt(options[0], plan.consistency_groups[0]);
    expect(compiled.prompt).toContain("Output framing: 4:3.");
    expect(compiled.prompt).not.toContain("square frame");
  });

  it("preserves hand-edited subjects during reconciliation and is idempotent on repeat execution", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-reconcile",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Select the animal",
        choices: [
          { id: "c-1", text: "Lion" },
          { id: "c-2", text: "Tiger" },
          { id: "c-3", text: "Bear" },
        ],
        correct_choice_id: "c-1",
        explanation: "Lion is a big cat.",
        fun_fact: "",
        source_ids: ["S-02"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-reconcile",
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

    // Construct an older plan with 1:1 square ratio and custom edited subject
    const originalPlan = {
      schema_version: 2 as const,
      episode_id: quiz.episode_id,
      assets: [
        {
          asset_id: "asset-q-reconcile-c-1",
          question_id: "q-reconcile",
          subject: "Custom majestic male lion with golden mane in sunset savanna",
          purpose: "answer_option" as const,
          style: "cute_illustration" as const,
          aspect_ratio: "1:1" as const,
          transparent_background: true,
          required: true,
          semantic_key: "q-reconcile:choice:c-1",
          consistency_group_id: "q-reconcile:visual-answer-set",
        },
        {
          asset_id: "asset-q-reconcile-c-2",
          question_id: "q-reconcile",
          subject: "Tiger",
          purpose: "answer_option" as const,
          style: "cute_illustration" as const,
          aspect_ratio: "1:1" as const,
          transparent_background: true,
          required: true,
          semantic_key: "q-reconcile:choice:c-2",
          consistency_group_id: "q-reconcile:visual-answer-set",
        },
        {
          asset_id: "asset-q-reconcile-c-3",
          question_id: "q-reconcile",
          subject: "Bear",
          purpose: "answer_option" as const,
          style: "cute_illustration" as const,
          aspect_ratio: "1:1" as const,
          transparent_background: true,
          required: true,
          semantic_key: "q-reconcile:choice:c-3",
          consistency_group_id: "q-reconcile:visual-answer-set",
        },
      ],
      consistency_groups: [],
    };

    const reconciliation = reconcileQuizAssetSizing(quiz, director, originalPlan);
    const updatedPlan = reconciliation.plan;

    // Preserves hand-authored subject!
    expect(updatedPlan.assets[0].subject).toBe(originalPlan.assets[0].subject);
    expect(updatedPlan.assets[0].aspect_ratio).toBe("4:3");
    expect(updatedPlan.assets[0].sizing?.recommended_width).toBe(672);

    // Changes were classified as generation_affecting because ratio shifted from 1:1 to 4:3
    expect(reconciliation.changes).toHaveLength(3);
    expect(reconciliation.changes[0]).toEqual({
      assetId: "asset-q-reconcile-c-1",
      kind: "generation_affecting",
      previousRatio: "1:1",
      currentRatio: "4:3",
    });

    // Reconciling twice is a complete no-op!
    const secondPass = reconcileQuizAssetSizing(quiz, director, updatedPlan);
    expect(secondPass.changes).toEqual([]);
    expect(secondPass.plan).toEqual(updatedPlan);
  });

  it("classifies metadata_only changes when ratio and raster match but sizing is missing", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-hero",
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
        explanation: "Platypus.",
        fun_fact: "",
        source_ids: ["S-01"],
        visual_opportunity: "A platypus swimming",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-hero",
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

    // Already 4:3, but missing sizing object
    const planWithoutSizing = {
      schema_version: 2 as const,
      episode_id: quiz.episode_id,
      assets: [
        {
          asset_id: "asset-q-hero-hero",
          question_id: "q-hero",
          subject: "A platypus swimming",
          purpose: "hero_question_image" as const,
          style: "cute_illustration" as const,
          aspect_ratio: "4:3" as const,
          transparent_background: false,
          required: true,
          semantic_key: "q-hero:hero_question_image",
          consistency_group_id: null,
        },
      ],
      consistency_groups: [],
    };

    const result = reconcileQuizAssetSizing(quiz, director, planWithoutSizing);
    expect(result.changes).toEqual([
      {
        assetId: "asset-q-hero-hero",
        kind: "metadata_only",
        previousRatio: "4:3",
        currentRatio: "4:3",
      },
    ]);
    expect(result.plan.assets[0].sizing?.recommended_width).toBe(1056);
  });

  it("produces NO choice images for full_stack_list and split_versus_two in text mode", () => {
    const quiz = buildTestQuiz([
      {
        id: "q-stack",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Name the capital",
        choices: [
          { id: "c-1", text: "Paris" },
          { id: "c-2", text: "London" },
          { id: "c-3", text: "Berlin" },
        ],
        correct_choice_id: "c-1",
        explanation: "Paris.",
        fun_fact: "",
        source_ids: ["S-01"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ]);

    const director = buildTestDirectorPlan([
      {
        question_id: "q-stack",
        archetype: "text_multiple_choice",
        layout_id: "full_stack_list",
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
        asset_intents: [],
        mascot_state: "celebrate",
        sfx_intents: ["countdown_tick", "correct_small"],
        transition_intent: "cut",
        reward_intensity: "small",
      },
    ]);

    const plan = planQuizAssets(quiz, director);
    expect(plan.assets).toEqual([]);
  });
});
