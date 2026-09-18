import { describe, expect, it } from "vitest";
import { DirectorPlanSchema, QuizConfigSchema, QuizV2Schema, resolveQuizLayout, type DirectorPlan, type QuizV2 } from "@studio/shared";
import { validateDirectorPlan } from "../src/quiz/director/validateDirectorPlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { questionClip, quizCopy } from "../src/quiz/render/candyArcade/candyArcadeClips.js";
import { adaptSandboxQuizScene } from "../src/quiz/render/scene/sandboxSceneAdapter.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Quiz Integration Audit Suite", () => {
  const baseQuiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "ep-audit-test",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q-silhouette",
        number: 1,
        format: "image_guess",
        difficulty: 2,
        question: "Guess the animal from its shadow?",
        answer_mode: "single_reveal",
        choices: [{ id: "c-lion", text: "Lion" }],
        correct_choice_id: "c-lion",
        explanation: "The lion has a magnificent mane.",
        fun_fact: "Lions live in prides.",
        source_ids: ["claim-1"],
        visual_opportunity: "Majestic lion silhouette with lush savanna backdrop",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-trivia",
        number: 2,
        format: "multiple_choice",
        difficulty: 3,
        question: "Whose medical tool is this stethoscope?",
        choices: [
          { id: "c-doctor", text: "Doctor" },
          { id: "c-pilot", text: "Pilot" },
          { id: "c-chef", text: "Chef" },
        ],
        correct_choice_id: "c-doctor",
        explanation: "Doctors use stethoscopes to listen to heartbeats.",
        fun_fact: "Invented in France in 1816.",
        source_ids: ["claim-2"],
        visual_opportunity: "Modern acoustic stethoscope on examination desk",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-fact",
        number: 3,
        format: "true_false",
        difficulty: 1,
        question: "Do octopuses have three hearts?",
        choices: [
          { id: "c-true", text: "True" },
          { id: "c-false", text: "False" },
        ],
        correct_choice_id: "c-true",
        explanation: "Octopuses have three hearts and blue blood.",
        fun_fact: "Two pump blood to the gills, one to the body.",
        source_ids: ["claim-3"],
        visual_opportunity: "Cute cartoon octopus in deep blue ocean",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });

  describe("1. Director Schema & Archetype Enums", () => {
    it("accepts 'mystery_reveal' in DirectorPlanSchema", () => {
      const plan: DirectorPlan = {
        schema_version: 2,
        episode_id: "ep-audit-test",
        archetype_family: "candy_arcade",
        beats: [
          {
            question_id: "q-silhouette",
            archetype: "mystery_reveal",
            energy: "curious",
            visual_density: "focused",
            palette_id: "lime",
            layout_id: "mystery_reveal",
            motion_id: "enter.pop",
            transition_id: "bubble_splash",
            thinking_bar_style: "auto",
            question_counter_style: "auto",
            question_box_style: "auto",
            answer_card_style: "auto",
            background_style: "auto",
            thinking_seconds: 7.0,
            beat_intents: ["question_enter", "thinking", "answer_reveal"],
            asset_intents: ["question_illustration"],
            mascot_state: "curious",
            sfx_intents: ["countdown_tick"],
            transition_intent: "slide",
            reward_intensity: "small",
          },
          {
            question_id: "q-trivia",
            archetype: "illustrated_multiple_choice",
            energy: "excited",
            visual_density: "lively",
            palette_id: "aqua",
            layout_id: "media_left_choices_right",
            motion_id: "enter.slideUp",
            transition_id: "bubble_splash",
            thinking_bar_style: "auto",
            question_counter_style: "auto",
            question_box_style: "auto",
            answer_card_style: "auto",
            background_style: "auto",
            thinking_seconds: 7.5,
            beat_intents: ["question_enter", "thinking", "answer_reveal"],
            asset_intents: ["question_illustration"],
            mascot_state: "thinking",
            sfx_intents: ["countdown_tick"],
            transition_intent: "slide",
            reward_intensity: "medium",
          },
          {
            question_id: "q-fact",
            archetype: "true_false",
            energy: "triumphant",
            visual_density: "burst",
            palette_id: "sunny",
            layout_id: "verdict_true_false",
            motion_id: "enter.scale",
            transition_id: "lightning_brush",
            thinking_bar_style: "auto",
            question_counter_style: "auto",
            question_box_style: "auto",
            answer_card_style: "auto",
            background_style: "auto",
            thinking_seconds: 8.0,
            beat_intents: ["question_enter", "thinking", "answer_reveal", "celebrate"],
            asset_intents: ["question_illustration"],
            mascot_state: "celebrate",
            sfx_intents: ["countdown_final", "correct_big"],
            transition_intent: "zoom",
            reward_intensity: "big",
          },
        ],
        midpoint_question_id: "q-trivia",
        final_challenge_question_id: "q-fact",
      };

      const parsed = DirectorPlanSchema.safeParse(plan);
      expect(parsed.success).toBe(true);

      const validation = validateDirectorPlan(baseQuiz, plan);
      const blockers = validation.issues.filter((i) => i.severity === "blocker");
      expect(blockers).toHaveLength(0);
      expect(validation.plan).not.toBeNull();
    });
  });

  describe("2. Layout Auto-Resolution Policy", () => {
    it("routes archetype 'mystery_reveal' with auto layout to 'mystery_reveal'", () => {
      const res = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "mystery_reveal",
        questionFormat: "image_guess",
        choiceCount: 1,
        answerMode: "single_reveal",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("mystery_reveal");
      }
    });

    it("routes fallback image_guess format with auto layout to 'mystery_reveal'", () => {
      const res = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "image_guess",
        questionFormat: "image_guess",
        choiceCount: 1,
        answerMode: "single_reveal",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("mystery_reveal");
      }
    });

    it("routes legacy visual_reveal archetype with auto layout to 'mystery_reveal'", () => {
      const res = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "visual_reveal",
        questionFormat: "image_guess",
        choiceCount: 1,
        answerMode: "single_reveal",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("mystery_reveal");
      }
    });

    it("falls back to 'media_left_choices_right' when choiceCount > 1 for image_guess", () => {
      const res = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "mystery_reveal",
        questionFormat: "image_guess",
        choiceCount: 3,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("media_left_choices_right");
      }
    });
  });

  describe("3. Default Director Plan Generation", () => {
    it("creates default beats mapping image_guess format to mystery_reveal layout", () => {
      const plan = createDefaultDirectorPlan(baseQuiz);
      expect(plan.beats).toHaveLength(3);

      const silhouetteBeat = plan.beats.find((b) => b.question_id === "q-silhouette");
      expect(silhouetteBeat).toBeDefined();
      expect(silhouetteBeat?.archetype).toBe("mystery_reveal");
      expect(silhouetteBeat?.layout_id).toBe("mystery_reveal");

      const factBeat = plan.beats.find((b) => b.question_id === "q-fact");
      expect(factBeat).toBeDefined();
      expect(factBeat?.layout_id).toBe("verdict_true_false");
    });
  });

  describe("4. Asset Planner Integration", () => {
    it("assigns transparent_background: true to mystery_reveal beats and false to illustrated_multiple_choice beats", () => {
      const plan: DirectorPlan = {
        schema_version: 2,
        episode_id: baseQuiz.episode_id,
        archetype_family: "candy_arcade",
        beats: [
          {
            question_id: "q-silhouette",
            archetype: "mystery_reveal",
            energy: "curious",
            visual_density: "focused",
            palette_id: "lime",
            layout_id: "auto", // auto layout
            motion_id: "enter.pop",
            transition_id: "bubble_splash",
            thinking_bar_style: "auto",
            question_counter_style: "auto",
            question_box_style: "auto",
            answer_card_style: "auto",
            background_style: "auto",
            thinking_seconds: 7.0,
            beat_intents: ["question_enter", "thinking", "answer_reveal"],
            asset_intents: ["question_illustration"],
            mascot_state: "curious",
            sfx_intents: ["countdown_tick"],
            transition_intent: "slide",
            reward_intensity: "small",
          },
          {
            question_id: "q-trivia",
            archetype: "illustrated_multiple_choice",
            energy: "excited",
            visual_density: "lively",
            palette_id: "aqua",
            layout_id: "media_left_choices_right",
            motion_id: "enter.slideUp",
            transition_id: "bubble_splash",
            thinking_bar_style: "auto",
            question_counter_style: "auto",
            question_box_style: "auto",
            answer_card_style: "auto",
            background_style: "auto",
            thinking_seconds: 7.5,
            beat_intents: ["question_enter", "thinking", "answer_reveal"],
            asset_intents: ["question_illustration"],
            mascot_state: "think",
            sfx_intents: ["countdown_tick"],
            transition_intent: "slide",
            reward_intensity: "medium",
          },
        ],
        midpoint_question_id: null,
        final_challenge_question_id: null,
      };

      const assetPlan = planQuizAssets(baseQuiz, plan, "pixar_3d");
      expect(assetPlan.assets).toHaveLength(2);

      const silhouetteAsset = assetPlan.assets.find((a) => a.question_id === "q-silhouette");
      expect(silhouetteAsset).toBeDefined();
      expect(silhouetteAsset?.transparent_background).toBe(true);

      const triviaAsset = assetPlan.assets.find((a) => a.question_id === "q-trivia");
      expect(triviaAsset).toBeDefined();
      expect(triviaAsset?.transparent_background).toBe(false);
    });
  });

  describe("5. QuizConfigSchema Preservation", () => {
    it("validates optional archetype and target_layout fields in QuizConfig", () => {
      const config = QuizConfigSchema.parse({
        question_count: 5,
        quiz_format: "image_guess",
        archetype: "mystery_reveal",
        target_layout: "mystery_reveal",
      });

      expect(config.archetype).toBe("mystery_reveal");
      expect(config.target_layout).toBe("mystery_reveal");
    });
  });

  describe("6. Production Scene Adapter & Render Clips", () => {
    it("renders valid HTML with mystery-reveal elements for mystery_reveal questions", () => {
      const question = baseQuiz.questions[0];
      const resolution = resolveQuizLayout({
        requestedLayout: "mystery_reveal",
        archetype: "mystery_reveal",
        questionFormat: question.format,
        choiceCount: question.choices.length,
        answerMode: question.answer_mode,
      });
      expect(resolution.ok).toBe(true);
      if (!resolution.ok) return;

      const html = questionClip({
        start: 0,
        choicesStart: 2,
        thinkingStart: 4,
        revealStart: 9,
        rewardStart: 10,
        end: 12,
        question,
        archetype: "mystery_reveal",
        layoutResolution: resolution,
        questionIndex: 0,
        count: 3,
        visual: {
          palette: {
            id: "lime",
            name: "Lime",
            primary: "#00ff00",
            secondary: "#ffffff",
            accent: "#ffff00",
            dark: "#003300",
            light: "#ccffcc",
            surface: "#006600",
            card: "#009900",
            ink: "#000000",
          },
          motionId: "enter.pop",
          transitionId: "bubble_splash",
        },
        copy: quizCopy("en"),
        assets: {},
        isFinal: false,
      });

      expect(html).toContain("layout-mystery_reveal");
      expect(html).toContain("mystery-stage-wrapper");
      expect(html).toContain("mystery-scanner-bar");
      expect(html).toContain("scanner-beam");
      expect(html).toContain("scanner-flare");
    });
  });

  describe("7. Visual Sandbox Preview Integration", () => {
    it("renders Visual Sandbox previews for mystery_reveal without runtime errors", () => {
      const previewMystery = adaptSandboxQuizScene(
        {
          layout_id: "mystery_reveal",
          question_number: 1,
          total_questions: 5,
          question_text: "What animal is hidden?",
          choices: ["Lion"],
          correct_choice_index: 0,
          fact_card_text: "Lions roar loudly!",
          palette_id: "lime",
          aspect_ratio: "16:9",
          mascot_position: "bottom_left",
          question_format: "image_guess",
        },
        false,
      );
      expect(previewMystery.layout.id).toBe("mystery_reveal");

      const mysteryHtml = buildSandboxComposition({
        layout_id: "mystery_reveal",
        question_number: 1,
        total_questions: 5,
        question_text: "What animal is hidden?",
        choices: ["Lion"],
        correct_choice_index: 0,
        fact_card_text: "Lions roar loudly!",
        palette_id: "lime",
        aspect_ratio: "16:9",
        mascot_position: "bottom_left",
        question_format: "image_guess",
      });
      expect(mysteryHtml.html).toContain("mystery-stage-wrapper");
    });
  });
});
