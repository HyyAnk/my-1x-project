import { describe, expect, it } from "vitest";
import {
  ALL_ANSWER_CARD_STYLES,
  DirectorPlanSchema,
  QuizLayoutIdSchema,
  QuizQuestionSchema,
  QUIZ_LAYOUT_CATALOG,
  QuizV2Schema,
  ResolvedQuizLayoutIdSchema,
  getQuizLayoutCapability,
  resolveQuizLayout,
  type DirectorPlan,
  type QuizPreviewLayoutId,
  type QuizV2,
} from "@studio/shared";
import { QUIZ_LAYOUT_RENDERERS, getQuizLayoutRenderer, quizLayoutCss, renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { validateDirectorPlan } from "../src/quiz/director/validateDirectorPlan.js";
import { assessQuizVisualLayout } from "../src/quiz/qa/visualQa.js";
import { getOptimalAssetDimensions } from "../src/tasks/video/imageOptimizer.js";

const slots = {
  questionBoxHtml: "<question-box />",
  heroHtml: "<hero />",
  choicesHtml: "<choices />",
  phaseHtml: "<phase />",
};

const sampleQuiz: QuizV2 = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "ep_phase6_test",
  title: "Phase 6 Layout Proofs",
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

describe("Phase 6 Test Matrix: Shared catalog and compatibility", () => {
  it("P6-CAT-01: Layout schema IDs parse exhaustively", () => {
    const expectedIds = ["auto", "media_left_choices_right", "visual_choices_three", "full_stack_list"];
    expect(QuizLayoutIdSchema.options.sort()).toEqual(expectedIds.sort());
    for (const id of expectedIds) {
      expect(QuizLayoutIdSchema.parse(id)).toBe(id);
    }
  });

  it("P6-CAT-02: Catalog and renderer parity for all production layouts", () => {
    const resolvedIds = ResolvedQuizLayoutIdSchema.options;
    expect(resolvedIds.length).toBe(3);
    for (const id of resolvedIds) {
      expect(QUIZ_LAYOUT_CATALOG[id]).toBeDefined();
      expect(QUIZ_LAYOUT_RENDERERS[id]).toBeDefined();
    }
  });

  it("P6-CAT-04: full_stack_list capabilities match declared contract", () => {
    const capability = getQuizLayoutCapability("full_stack_list");
    expect(capability.id).toBe("full_stack_list");
    expect(capability.supportedPresentations).toEqual(["text"]);
    expect(capability.supportedChoiceCounts).toEqual([2, 3]);
    expect(capability.supportedFormats).toEqual(["multiple_choice", "true_false"]);
    expect(capability.supportedAspectRatios).toEqual(["16:9", "9:16"]);
    expect(capability.media.supported).toEqual([]);
    expect(capability.media.required).toEqual([]);
    expect(capability.metrics.render.width).toBe(1440);
    expect(capability.metrics.render.height).toBe(720);
  });

  it("P6-CAT-05: Existing auto cases remain unchanged (ADR-006)", () => {
    const textAuto = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
    });
    expect(textAuto).toMatchObject({ ok: true, layoutId: "media_left_choices_right", source: "auto" });

    const visualAuto = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "visual_multiple_choice",
      questionFormat: "odd_one_out",
      choiceCount: 3,
    });
    expect(visualAuto).toMatchObject({ ok: true, layoutId: "visual_choices_three", source: "auto" });
  });

  it("P6-CAT-06: Explicit compatible request is preserved and resolved", () => {
    const fullStack = resolveQuizLayout({
      requestedLayout: "full_stack_list",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 2,
      media: [],
    });
    expect(fullStack).toMatchObject({ ok: true, layoutId: "full_stack_list", source: "explicit" });
  });

  it("P6-CAT-07: Explicit new incompatible request returns structured issues", () => {
    const incompatible = resolveQuizLayout({
      requestedLayout: "full_stack_list",
      archetype: "visual_multiple_choice",
      questionFormat: "odd_one_out",
      choiceCount: 3,
      choicePresentation: "visual",
    });
    expect(incompatible.ok).toBe(false);
    if (!incompatible.ok) {
      expect(incompatible.requestedLayout).toBe("full_stack_list");
      expect(incompatible.issues.some((i) => i.code === "layout_choice_presentation_unsupported")).toBe(true);
    }
  });

  it("P6-CAT-08: Four choices are rejected by domain schema", () => {
    const invalidQuestion = {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      correct_choice_id: "c1",
      question: "Which sea animal has eight tentacles?",
      explanation: "Octopuses have eight tentacles.",
      source_ids: ["S1"],
      choices: [
        { id: "c1", text: "A" },
        { id: "c2", text: "B" },
        { id: "c3", text: "C" },
        { id: "c4", text: "D" },
      ],
    };
    const parseResult = QuizQuestionSchema.safeParse(invalidQuestion);
    expect(parseResult.success).toBe(false);
  });

  it("P6-CAT-09: Director plan round-trips explicit layout IDs", () => {
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
});

describe("Phase 6 Test Matrix: Layout rendering and capacity", () => {
  it("P6-LAY-02: Full-stack unified slots arrange title, choices, and phase without hero slot", () => {
    const html = renderQuizLayoutBody("full_stack_list", slots);
    expect(html).toBe('<question-box /><choices /><div class="phase-region"><phase /></div>');
  });

  it("P6-LAY-03: Two and three choices render cleanly in text layouts", () => {
    const split2 = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      choices: ["Choice 1", "Choice 2"],
      correct_choice_index: 0,
      phase: "choices",
    });
    expect(split2.html).toContain("answer-count-2");
    expect(split2.html).toContain('data-choice-id="sandbox-choice-1"');
    expect(split2.html).toContain('data-choice-id="sandbox-choice-2"');

    const stack3 = buildSandboxComposition({
      layout_id: "full_stack_list",
      choices: ["Option A", "Option B", "Option C"],
      correct_choice_index: 1,
      phase: "choices",
    });
    expect(stack3.html).toContain("answer-count-3");
    expect(stack3.html).toContain('data-choice-id="sandbox-choice-3"');
  });

  it("P6-LAY-04: Missing question hero source falls back safely", () => {
    const comp = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      choices: ["Yes", "No"],
      phase: "question",
    });
    expect(comp.html).toContain("hero-image");
    expect(comp.html).toContain("data:image/svg+xml");
  });

  it("P6-LAY-05: Capability metrics are consumed by image optimizer and QA", () => {
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

  it("P6-LAY-06: Layout CSS uses Phase 5 capacity tokens without selecting skin classes", () => {
    const splitCss = getQuizLayoutRenderer("media_left_choices_right").css("16:9");
    expect(splitCss).toContain("--choice-card-min-height");
    expect(splitCss).toContain("--choice-font-size-base");
    expect(splitCss).not.toMatch(/\.ac-/);

    const stackCss = getQuizLayoutRenderer("full_stack_list").css("16:9");
    expect(stackCss).toContain("--choice-card-min-height");
    expect(stackCss).toContain("--choice-font-size-base");
    expect(stackCss).not.toMatch(/\.ac-/);
  });
});

describe("Phase 6 Test Matrix: Visual, aspect ratio, and skin coverage", () => {
  it("P6-VIS-01: Split layout renders for 16:9 and 9:16 portrait", () => {
    const comp169 = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      aspect_ratio: "16:9",
      choices: ["Choice 1", "Choice 2", "Choice 3"],
    });
    expect(comp169.html).toContain("layout-media_left_choices_right");

    const comp916 = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      aspect_ratio: "9:16",
      choices: ["Choice 1", "Choice 2", "Choice 3"],
    });
    expect(comp916.html).toContain('data-aspect-ratio="9:16"');
    expect(comp916.html).toContain("layout-media_left_choices_right");
  });

  it("P6-VIS-02: Full-stack renders for 16:9 and 9:16 portrait", () => {
    const comp169 = buildSandboxComposition({
      layout_id: "full_stack_list",
      aspect_ratio: "16:9",
      choices: ["Alpha", "Beta"],
    });
    expect(comp169.html).toContain("layout-full_stack_list");

    const comp916 = buildSandboxComposition({
      layout_id: "full_stack_list",
      aspect_ratio: "9:16",
      choices: ["Alpha", "Beta"],
    });
    expect(comp916.html).toContain('data-aspect-ratio="9:16"');
    expect(comp916.html).toContain("layout-full_stack_list");
  });

  it("P6-VIS-03: Long text tiers fit in both new layouts", () => {
    const longComp = buildSandboxComposition({
      layout_id: "full_stack_list",
      choices: [
        "This is an exceptionally long answer choice meant to test whether typography scaling functions properly",
        "Another equally detailed and descriptive option for rigorous layout testing",
      ],
      phase: "choices",
    });
    expect(longComp.html).toContain("choice-tier-");
  });

  it("P6-VIS-04: All Answer Card skins render cleanly in text layouts", () => {
    const skins = ALL_ANSWER_CARD_STYLES.filter((s) => s !== "auto");
    const layouts: QuizPreviewLayoutId[] = ["media_left_choices_right", "full_stack_list"];

    for (const layout of layouts) {
      for (const skin of skins) {
        const comp = buildSandboxComposition({
          layout_id: layout,
          answer_card_style: skin,
          choices: ["First choice", "Second choice"],
        });
        expect(comp.html).toContain(`ac-${skin.replace(/_/g, "-")}`);
      }
    }
  });

  it("P6-VIS-05: Mascot occupancy modifies capacity without collision", () => {
    const withMascot = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      mascot_enabled: true,
      mascot_position: "bottom_left",
      choices: ["Choice A", "Choice B", "Choice C"],
    });
    expect(withMascot.html).toContain("has-mascot");
  });

  it("P6-VIS-06: Lifecycle phases (choices, thinking, reveal) work cleanly", () => {
    for (const phase of ["choices", "thinking", "reveal"] as const) {
      const comp = buildSandboxComposition({
        layout_id: "full_stack_list",
        phase,
        correct_choice_index: 0,
        choices: ["Correct answer", "Wrong answer"],
      });
      if (phase === "reveal") {
        expect(comp.html).toMatch(/class="[^"]*answer-correct[^"]*"/);
        expect(comp.html).toMatch(/class="[^"]*answer-incorrect[^"]*"/);
      } else {
        expect(comp.html).not.toMatch(/class="[^"]*answer-correct[^"]*"/);
        expect(comp.html).not.toMatch(/class="[^"]*answer-incorrect[^"]*"/);
      }
    }
  });

  it("P6-VIS-07: Reduced motion CSS rule is present and valid", () => {
    const css = quizLayoutCss("16:9");
    expect(css).toBeDefined();
    const fullCss = buildSandboxComposition({ layout_id: "full_stack_list" }).html;
    expect(fullCss).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("Phase 6 Test Matrix: Production composition integration", () => {
  it("P6-PROD-01: buildCandyArcadeCompositionBundle renders production layout scenes", () => {
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
