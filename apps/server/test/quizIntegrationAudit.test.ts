import { describe, expect, it } from "vitest";
import {
  DirectorPlanSchema,
  QuizConfigSchema,
  QuizV2Schema,
  resolveQuizLayout,
  type DirectorPlan,
  type QuizV2,
} from "@studio/shared";
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
        choices: [
          { id: "c-lion", text: "Lion" },
          { id: "c-tiger", text: "Tiger" },
          { id: "c-bear", text: "Bear" },
        ],
        correct_choice_id: "c-lion",
        explanation: "The lion has a magnificent mane.",
        fun_fact: "Lions live in prides.",
        source_ids: ["claim-1"],
        visual_opportunity: "Majestic lion silhouette with lush savanna backdrop",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-clue",
        number: 2,
        format: "image_guess",
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
    it("accepts 'mystery_reveal' and 'clue_deduction' in DirectorPlanSchema", () => {
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
            question_id: "q-clue",
            archetype: "clue_deduction",
            energy: "excited",
            visual_density: "lively",
            palette_id: "aqua",
            layout_id: "clue_deduction",
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
        midpoint_question_id: "q-clue",
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
        choiceCount: 3,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("mystery_reveal");
      }
    });

    it("routes archetype 'clue_deduction' with auto layout to 'clue_deduction'", () => {
      const res = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "clue_deduction",
        questionFormat: "image_guess",
        choiceCount: 3,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("clue_deduction");
      }
    });

    it("routes fallback image_guess format with auto layout to 'mystery_reveal'", () => {
      const res = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "image_guess",
        questionFormat: "image_guess",
        choiceCount: 3,
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
        choiceCount: 3,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.layoutId).toBe("mystery_reveal");
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
    it("assigns transparent_background: true to mystery_reveal beats and false to clue_deduction beats", () => {
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
            question_id: "q-clue",
            archetype: "clue_deduction",
            energy: "excited",
            visual_density: "lively",
            palette_id: "aqua",
            layout_id: "clue_deduction",
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

      const clueAsset = assetPlan.assets.find((a) => a.question_id === "q-clue");
      expect(clueAsset).toBeDefined();
      expect(clueAsset?.transparent_background).toBe(false);
    });
  });

  describe("5. QuizConfigSchema Preservation", () => {
    it("validates optional archetype and target_layout fields in QuizConfig", () => {
      const config = QuizConfigSchema.parse({
        question_count: 5,
        quiz_format: "image_guess",
        archetype: "clue_deduction",
        target_layout: "clue_deduction",
      });

      expect(config.archetype).toBe("clue_deduction");
      expect(config.target_layout).toBe("clue_deduction");
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

    it("renders valid HTML with clue-deduction elements for clue_deduction questions", () => {
      const question = baseQuiz.questions[1];
      const resolution = resolveQuizLayout({
        requestedLayout: "clue_deduction",
        archetype: "clue_deduction",
        questionFormat: question.format,
        choiceCount: question.choices.length,
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
        archetype: "clue_deduction",
        layoutResolution: resolution,
        questionIndex: 1,
        count: 3,
        visual: {
          palette: {
            id: "aqua",
            name: "Aqua",
            primary: "#00ffff",
            secondary: "#ffffff",
            accent: "#0000ff",
            dark: "#000033",
            light: "#ccffff",
            surface: "#006666",
            card: "#009999",
            ink: "#000000",
          },
          motionId: "enter.slideUp",
          transitionId: "bubble_splash",
        },
        copy: quizCopy("en"),
        assets: {},
        isFinal: false,
      });

      expect(html).toContain("layout-clue_deduction");
      expect(html).toContain("clue-deduction-stage-wrapper");
      expect(html).toContain("clue-stage-backdrop");
      expect(html).toContain("clue-card-stage");
      expect(html).toContain("clue-hero-frame");
      expect(html).toContain("clue-glow-ring");
    });
  });

  describe("7. Visual Sandbox Preview Integration", () => {
    it("renders Visual Sandbox previews for mystery_reveal and clue_deduction without runtime errors", () => {
      const previewMystery = adaptSandboxQuizScene(
        {
          layout_id: "mystery_reveal",
          question_number: 1,
          total_questions: 5,
          question_text: "What animal is hidden?",
          choices: ["Lion", "Tiger", "Bear"],
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
        choices: ["Lion", "Tiger", "Bear"],
        correct_choice_index: 0,
        fact_card_text: "Lions roar loudly!",
        palette_id: "lime",
        aspect_ratio: "16:9",
        mascot_position: "bottom_left",
        question_format: "image_guess",
      });
      expect(mysteryHtml.html).toContain("mystery-stage-wrapper");

      const previewClue = adaptSandboxQuizScene(
        {
          layout_id: "clue_deduction",
          question_number: 2,
          total_questions: 5,
          question_text: "Whose tool is this?",
          choices: ["Doctor", "Pilot", "Chef"],
          correct_choice_index: 0,
          fact_card_text: "Doctors heal patients!",
          palette_id: "aqua",
          aspect_ratio: "16:9",
          mascot_position: "bottom_left",
          question_format: "image_guess",
        },
        false,
      );
      expect(previewClue.layout.id).toBe("clue_deduction");

      const clueHtml = buildSandboxComposition({
        layout_id: "clue_deduction",
        question_number: 2,
        total_questions: 5,
        question_text: "Whose tool is this?",
        choices: ["Doctor", "Pilot", "Chef"],
        correct_choice_index: 0,
        fact_card_text: "Doctors heal patients!",
        palette_id: "aqua",
        aspect_ratio: "16:9",
        mascot_position: "bottom_left",
        question_format: "image_guess",
      });
      expect(clueHtml.html).toContain("clue-deduction-stage-wrapper");
    });
  });
});
