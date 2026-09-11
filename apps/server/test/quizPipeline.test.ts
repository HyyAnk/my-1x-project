import { describe, expect, it } from "vitest";
import {
  DirectorPlanSchema,
  QuizV2Schema,
  adaptLegacyVisualPreset,
  resolvePresetPreviewLayoutId,
  type DirectorPlan,
  type QuizV2,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { validateDirectorPlan } from "../src/quiz/director/validateDirectorPlan.js";
import { resolveQuestionLayout } from "../src/quiz/layoutCompatibility.js";
import { assessQuizVisualLayout } from "../src/quiz/qa/visualQa.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { getOptimalAssetDimensions } from "../src/tasks/video/imageOptimizer.js";

const sampleQuiz: QuizV2 = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "ep_pipeline_test",
  title: "Pipeline Layout Proofs",
  age_band: "7-9",
  target_duration_seconds: 60,
  target_audience: "Elementary kids",
  language: "en",
  status: "DRAFT",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      correct_choice_id: "c1",
      question: "Which sea animal has eight tentacles?",
      visual_opportunity: "An octopus swimming peacefully under blue waves",
      fun_fact: "An octopus has three hearts and blue blood!",
      explanation: "Octopuses have eight tentacles with suction cups.",
      source_ids: ["S1"],
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      choices: [
        { id: "c1", text: "Octopus", is_correct: true },
        { id: "c2", text: "Dolphin", is_correct: false },
        { id: "c3", text: "Shark", is_correct: false },
      ],
    },
    {
      id: "q2",
      number: 2,
      format: "true_false",
      difficulty: 1,
      correct_choice_id: "c4",
      question: "Sound travels faster in water than in air.",
      visual_opportunity: "Sound waves rippling in clear ocean water",
      fun_fact: "Sound travels about 4.3 times faster in water!",
      explanation: "Water is denser than air, allowing sound waves to propagate faster.",
      source_ids: ["S2"],
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      choices: [
        { id: "c4", text: "True", is_correct: true },
        { id: "c5", text: "False", is_correct: false },
      ],
    },
  ],
});

describe("Quiz HyperFrames composition", () => {
  it("uses structured question content and keeps the narration duration as the timeline", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const voicePlan = buildQuizVoicePlan(sampleQuiz);
    const timeline = compileQuizTimeline({
      quiz: sampleQuiz,
      director,
      voicePlan,
      targetDurationSeconds: 14.2,
    });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_pop" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: 14.2,
    });

    expect(bundle.html).toContain('data-composition-id="quiz-v2-candy-arcade"');
    expect(bundle.html).toContain('data-duration="14.200"');
    expect(bundle.html).toContain('id="quiz-narration"');
    expect(bundle.html).toContain("data-no-timeline");

    const allContent = [bundle.html, ...Object.values(bundle.files)].join("\n");
    expect(allContent).toContain("Which sea animal has");
    expect(allContent).toContain("travels faster in water than in air");
  });
});

describe("Quiz pipeline director & layout integration", () => {
  it("validates director plan layout IDs and preserves them through schemas", () => {
    const defaultPlan = createDefaultDirectorPlan(sampleQuiz);
    const directorPlan: DirectorPlan = {
      ...defaultPlan,
      beats: [
        { ...defaultPlan.beats[0], layout_id: "media_left_choices_right" },
        { ...defaultPlan.beats[1], layout_id: "full_stack_list", asset_intents: [] },
      ],
    };

    const parsed = DirectorPlanSchema.safeParse(directorPlan);
    expect(parsed.success).toBe(true);

    const validation = validateDirectorPlan(sampleQuiz, directorPlan);
    expect(validation.plan).not.toBeNull();
    const blockers = validation.issues.filter((i) => i.severity === "blocker");
    expect(blockers).toEqual([]);
  });

  it("consumes capability metrics in image optimization and visual QA", () => {
    const dimsSplit = getOptimalAssetDimensions("hero", "media_left_choices_right");
    expect(dimsSplit.maxWidth).toBe(1080);
    expect(dimsSplit.maxHeight).toBe(810);

    const dimsStack = getOptimalAssetDimensions("hero", "full_stack_list");
    expect(dimsStack).toBeDefined();

    const qaIssues = assessQuizVisualLayout({
      quiz: sampleQuiz,
      director: {
        episode_id: sampleQuiz.episode_id,
        age_band: sampleQuiz.age_band,
        visual_theme: "candy_arcade",
        audio_plan: { music_energy_curve: ["medium", "high"], sfx_moments: [] },
        beats: [
          {
            question_id: "q1",
            archetype: "text_multiple_choice",
            layout_id: "media_left_choices_right",
            palette_id: "lime",
            thinking_bar_style: "star_slider",
            question_box_style: "candy_pop",
            answer_card_style: "glossy_arcade",
            question_counter_style: "hanging_woodsign",
            motion_id: "enter.pop",
            transition_id: "bubble_splash",
            thinking_seconds: 7.0,
            energy: "excited",
            beat_intents: ["answer_reveal"],
            asset_intents: ["question_illustration"],
            camera: { framing: "wide", push_in: false },
          },
        ],
      },
    });
    const blockers = qaIssues.filter((i) => i.severity === "blocker");
    expect(blockers).toEqual([]);
  });

  it("resolves preset preview layout for showcase while production remains question-driven", () => {
    const presetWithPreviewLayout = {
      id: "preset_test",
      preview_layout_id: "visual_choices_three" as const,
    };
    expect(resolvePresetPreviewLayoutId(presetWithPreviewLayout)).toBe("visual_choices_three");

    const question = {
      id: "q1",
      number: 1,
      question: "Which one is an animal?",
      format: "multiple_choice" as const,
      choices: ["Lion", "Car", "Tree"],
      answer_index: 0,
    };
    const beat = {
      question_id: "q1",
      archetype: "text_multiple_choice" as const,
      layout_id: "auto" as const,
    };
    const prodResolution = resolveQuestionLayout(question, beat, "16:9");
    expect(prodResolution.ok).toBe(true);
    if (prodResolution.ok) {
      expect(prodResolution.layoutId).toBe("media_left_choices_right");
    }

    const legacyPreset = {
      id: "legacy_1",
      name: "Old Preset",
      layout_id: "visual_choices_three" as const,
    };
    expect(resolvePresetPreviewLayoutId(legacyPreset)).toBe("visual_choices_three");
    const adapted = adaptLegacyVisualPreset(legacyPreset);
    expect(adapted.preview_layout_id).toBe("visual_choices_three");
    expect(adapted.layout_id).toBe("visual_choices_three");
  });

  it("buildCandyArcadeCompositionBundle renders production layout scenes", () => {
    const defaultPlan = createDefaultDirectorPlan(sampleQuiz);
    const directorPlan: DirectorPlan = {
      ...defaultPlan,
      beats: [
        { ...defaultPlan.beats[0], layout_id: "media_left_choices_right" },
        { ...defaultPlan.beats[1], layout_id: "full_stack_list", asset_intents: [] },
      ],
    };

    const voicePlan = buildQuizVoicePlan(sampleQuiz);
    const timeline = compileQuizTimeline({ quiz: sampleQuiz, director: directorPlan, voicePlan });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz: sampleQuiz,
      director: directorPlan,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });
    expect(bundle.html).toContain("candy-intro.html");
    const sceneFiles = Object.values(bundle.files).join("\n");
    expect(sceneFiles).toContain("layout-media_left_choices_right");
    expect(sceneFiles).toContain("layout-full_stack_list");
  });
});
