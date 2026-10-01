import { describe, expect, it } from "vitest";
import { QuizV2Schema, type ChannelMascotConfig, type MascotProfile } from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { renderProductionMascotHtmlLayer, resolveMascotQuestionStyle } from "../src/quiz/render/productionMascotRenderer.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

function createFiveQuestionQuiz() {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "rotation-demo",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Question number 1?",
        choices: [
          { id: "c1", text: "Answer 1" },
          { id: "c2", text: "Answer 2" },
          { id: "c3", text: "Answer 3" },
        ],
        correct_choice_id: "c1",
        explanation: "Explanation 1",
        fun_fact: "",
        source_ids: ["S1"],
        visual_opportunity: "Scene 1",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-02",
        number: 2,
        format: "multiple_choice",
        difficulty: 1,
        question: "Question number 2?",
        choices: [
          { id: "c1", text: "Answer 1" },
          { id: "c2", text: "Answer 2" },
          { id: "c3", text: "Answer 3" },
        ],
        correct_choice_id: "c1",
        explanation: "Explanation 2",
        fun_fact: "",
        source_ids: ["S2"],
        visual_opportunity: "Scene 2",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-03",
        number: 3,
        format: "multiple_choice",
        difficulty: 1,
        question: "Question number 3?",
        choices: [
          { id: "c1", text: "Answer 1" },
          { id: "c2", text: "Answer 2" },
          { id: "c3", text: "Answer 3" },
        ],
        correct_choice_id: "c1",
        explanation: "Explanation 3",
        fun_fact: "",
        source_ids: ["S3"],
        visual_opportunity: "Scene 3",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-04",
        number: 4,
        format: "multiple_choice",
        difficulty: 1,
        question: "Question number 4?",
        choices: [
          { id: "c1", text: "Answer 1" },
          { id: "c2", text: "Answer 2" },
          { id: "c3", text: "Answer 3" },
        ],
        correct_choice_id: "c1",
        explanation: "Explanation 4",
        fun_fact: "",
        source_ids: ["S4"],
        visual_opportunity: "Scene 4",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-05",
        number: 5,
        format: "multiple_choice",
        difficulty: 1,
        question: "Question number 5?",
        choices: [
          { id: "c1", text: "Answer 1" },
          { id: "c2", text: "Answer 2" },
          { id: "c3", text: "Answer 3" },
        ],
        correct_choice_id: "c1",
        explanation: "Explanation 5",
        fun_fact: "",
        source_ids: ["S5"],
        visual_opportunity: "Scene 5",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

const multiVariantMascot: MascotProfile = {
  id: "multi-variant-mascot",
  name: "Variant Mascot",
  description: "Test mascot with 3 thinking and 2 celebrate variants",
  visual_style: "pixar_3d",
  master_prompt: "A cute mascot",
  master_image_url: "/assets/master.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [
    {
      id: "core",
      name: "Core Style",
      keyword: "core",
      is_default: true,
      states: {
        thinking: [
          { id: "t0", slot_index: 1, image_url: "/assets/think-0.png", motion_preset: "sway" },
          { id: "t1", slot_index: 2, image_url: "/assets/think-1.png", motion_preset: "breathe" },
          { id: "t2", slot_index: 3, image_url: "/assets/think-2.png", motion_preset: "pulse" },
        ],
        celebrate: [
          { id: "c0", slot_index: 1, image_url: "/assets/celeb-0.png", motion_preset: "jump" },
          { id: "c1", slot_index: 2, image_url: "/assets/celeb-1.png", motion_preset: "wave" },
        ],
      },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
  ],
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mascotConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_left",
  scale: 1.5,
  offset_x: 0,
  offset_y: 0,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

function getQuestionHtml(bundle: { files: Record<string, string> }, questionNumber: number): string {
  const entry = Object.entries(bundle.files).find(([key]) => key.startsWith(`compositions/quiz-q${questionNumber}-`));
  if (!entry) {
    throw new Error(
      `Could not find question clip for question number ${questionNumber} in bundle. Available files: ${Object.keys(bundle.files).join(", ")}`,
    );
  }
  return entry[1];
}

describe("Mascot Variant Rotation & Style Resolution (Stage 8)", () => {
  it("selects available thinking and celebrate variants independently for every question", () => {
    const quiz = createFiveQuestionQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });

    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: multiVariantMascot,
      mascotConfig,
    });

    for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
      const html = getQuestionHtml(bundle, questionNumber);
      expect(html).toMatch(/\/assets\/think-[012]\.png/);
      expect(html).toMatch(/\/assets\/celeb-[01]\.png/);
      expect(html).toContain('data-mascot-motion-preset="none"');
    }

    const entries = bundle.mascotAnimationSnapshot?.entries ?? [];
    expect(entries).toHaveLength(10);
    for (const entry of entries) {
      expect(entry.slot_index).toBeGreaterThanOrEqual(1);
      expect(entry.slot_index).toBeLessThanOrEqual(entry.state === "thinking" ? 3 : 2);
    }
  });

  it("guarantees deterministic parity: running composition twice produces identical output", () => {
    const quiz = createFiveQuestionQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });

    const bundle1 = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: multiVariantMascot,
      mascotConfig,
    });

    const bundle2 = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: multiVariantMascot,
      mascotConfig,
      mascotAnimationSnapshot: bundle1.mascotAnimationSnapshot,
    });

    expect(bundle1.html).toBe(bundle2.html);
    const files1 = Object.keys(bundle1.files);
    const files2 = Object.keys(bundle2.files);
    expect(files1).toEqual(files2);
    for (const key of files1) {
      expect(bundle1.files[key]).toBe(bundle2.files[key]);
    }
  });

  it("cycles styles across questions when mascot_style_id is 'cycle' or 'all'", () => {
    const cyclingMascot: MascotProfile = {
      ...multiVariantMascot,
      styles: [
        {
          id: "cyberpunk",
          name: "Cyberpunk",
          keyword: "cyberpunk",
          is_default: true,
          states: {
            thinking: [{ id: "ct0", slot_index: 1, image_url: "/assets/cyber-think.png" }],
            celebrate: [{ id: "cc0", slot_index: 1, image_url: "/assets/cyber-celeb.png" }],
          },
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "retro",
          name: "Retro Pixel",
          keyword: "retro",
          is_default: false,
          states: {
            thinking: [{ id: "rt0", slot_index: 1, image_url: "/assets/retro-think.png" }],
            celebrate: [{ id: "rc0", slot_index: 1, image_url: "/assets/retro-celeb.png" }],
          },
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
      ],
    };

    const quiz = createFiveQuestionQuiz();
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });

    const bundleCycle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: cyclingMascot,
      mascotConfig,
      mascotStyleId: "cycle",
    });

    // Question 0 uses Style 0 (Cyberpunk)
    const q1 = getQuestionHtml(bundleCycle, 1);
    expect(q1).toContain("/assets/cyber-think.png");
    expect(q1).toContain("/assets/cyber-celeb.png");

    // Question 1 uses Style 1 (Retro)
    const q2 = getQuestionHtml(bundleCycle, 2);
    expect(q2).toContain("/assets/retro-think.png");
    expect(q2).toContain("/assets/retro-celeb.png");

    // Question 2 uses Style 0 (Cyberpunk)
    const q3 = getQuestionHtml(bundleCycle, 3);
    expect(q3).toContain("/assets/cyber-think.png");
    expect(q3).toContain("/assets/cyber-celeb.png");

    // Question 3 uses Style 1 (Retro)
    const q4 = getQuestionHtml(bundleCycle, 4);
    expect(q4).toContain("/assets/retro-think.png");
    expect(q4).toContain("/assets/retro-celeb.png");

    // Also verify 'all' alias
    const style0 = resolveMascotQuestionStyle(cyclingMascot, "all", 0);
    const style1 = resolveMascotQuestionStyle(cyclingMascot, "all", 1);
    expect(style0.id).toBe("cyberpunk");
    expect(style1.id).toBe("retro");
  });

  describe("graceful fallback for Intro and Outro", () => {
    it("falls back to celebrate[0] for intro and celebrate[1] for outro when wave/outro actions are absent", () => {
      const customStyleMascot: MascotProfile = {
        ...multiVariantMascot,
        actions: {}, // No wave, no outro
        render_bundle: undefined,
        styles: [
          {
            id: "custom",
            name: "Custom Poses",
            keyword: "custom",
            is_default: true,
            states: {
              thinking: [{ id: "t0", slot_index: 1, image_url: "/assets/custom-think-0.png" }],
              celebrate: [
                { id: "c0", slot_index: 1, image_url: "/assets/custom-celeb-0.png" },
                { id: "c1", slot_index: 2, image_url: "/assets/custom-celeb-1.png" },
              ],
            },
            created_at: "2026-09-01T00:00:00.000Z",
            updated_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      // Direct renderProductionMascotHtmlLayer tests
      const introHtml = renderProductionMascotHtmlLayer(customStyleMascot, mascotConfig, {
        phase: "intro",
        clipStartSeconds: 0,
        clipDurationSeconds: 2,
      });
      expect(introHtml).toContain('data-mascot-phase="intro"');
      expect(introHtml).toContain("/assets/custom-celeb-0.png");

      const outroHtml = renderProductionMascotHtmlLayer(customStyleMascot, mascotConfig, {
        phase: "outro",
        clipStartSeconds: 10,
        clipDurationSeconds: 2,
      });
      expect(outroHtml).toContain('data-mascot-phase="outro"');
      expect(outroHtml).toContain("/assets/custom-celeb-1.png");

      // Full composition bundle verification
      const quiz = createFiveQuestionQuiz();
      const director = createDefaultDirectorPlan(quiz);
      const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: customStyleMascot,
        mascotConfig,
      });

      const introScene = bundle.files["compositions/candy-intro.html"];
      expect(introScene).toContain("/assets/custom-celeb-0.png");

      const outroScene = bundle.files["compositions/candy-outro.html"];
      expect(outroScene).toContain("/assets/custom-celeb-1.png");
    });

    it("falls back to celebrate[0] for outro if only 1 celebrate variant exists", () => {
      const singleCelebrateMascot: MascotProfile = {
        ...multiVariantMascot,
        actions: {},
        styles: [
          {
            id: "single-celeb",
            name: "Single Celebrate",
            keyword: "",
            is_default: true,
            states: {
              thinking: [{ id: "t0", slot_index: 1, image_url: "/assets/think-only.png" }],
              celebrate: [{ id: "c0", slot_index: 1, image_url: "/assets/celeb-single.png" }],
            },
            created_at: "2026-09-01T00:00:00.000Z",
            updated_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      const introHtml = renderProductionMascotHtmlLayer(singleCelebrateMascot, mascotConfig, {
        phase: "intro",
        clipStartSeconds: 0,
        clipDurationSeconds: 2,
      });
      expect(introHtml).toContain("/assets/celeb-single.png");

      const outroHtml = renderProductionMascotHtmlLayer(singleCelebrateMascot, mascotConfig, {
        phase: "outro",
        clipStartSeconds: 10,
        clipDurationSeconds: 2,
      });
      expect(outroHtml).toContain("/assets/celeb-single.png");
    });

    it("falls back to thinking[0] when no celebrate variants exist", () => {
      const thinkingOnlyMascot: MascotProfile = {
        ...multiVariantMascot,
        actions: {},
        styles: [
          {
            id: "thinking-only",
            name: "Thinking Only",
            keyword: "",
            is_default: true,
            states: {
              thinking: [{ id: "t0", slot_index: 1, image_url: "/assets/fallback-think.png" }],
              celebrate: [],
            },
            created_at: "2026-09-01T00:00:00.000Z",
            updated_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      const introHtml = renderProductionMascotHtmlLayer(thinkingOnlyMascot, mascotConfig, {
        phase: "intro",
        clipStartSeconds: 0,
        clipDurationSeconds: 2,
      });
      expect(introHtml).toContain("/assets/fallback-think.png");

      const outroHtml = renderProductionMascotHtmlLayer(thinkingOnlyMascot, mascotConfig, {
        phase: "outro",
        clipStartSeconds: 10,
        clipDurationSeconds: 2,
      });
      expect(outroHtml).toContain("/assets/fallback-think.png");
    });

    it("falls back to master_image_url when no variants exist in active style", () => {
      const masterOnlyMascot: MascotProfile = {
        ...multiVariantMascot,
        actions: {},
        master_image_url: "/assets/concept-master.png",
        styles: [
          {
            id: "empty-style",
            name: "Empty Style",
            keyword: "",
            is_default: true,
            states: {
              thinking: [],
              celebrate: [],
            },
            created_at: "2026-09-01T00:00:00.000Z",
            updated_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      const introHtml = renderProductionMascotHtmlLayer(masterOnlyMascot, mascotConfig, {
        phase: "intro",
        clipStartSeconds: 0,
        clipDurationSeconds: 2,
      });
      expect(introHtml).toContain("/assets/concept-master.png");

      const outroHtml = renderProductionMascotHtmlLayer(masterOnlyMascot, mascotConfig, {
        phase: "outro",
        clipStartSeconds: 10,
        clipDurationSeconds: 2,
      });
      expect(outroHtml).toContain("/assets/concept-master.png");
    });
  });

  describe("sandbox preview parity", () => {
    it("renders the resolved style variant in snapshot preview mode", () => {
      const preview = buildSandboxComposition(
        {
          mascot_id: multiVariantMascot.id,
          mascot_style_id: "core",
          mascot_enabled: true,
          mascot_action: "thinking",
          mascot_phase: "thinking",
          question_number: 2,
        },
        multiVariantMascot,
      );

      expect(preview.html).toMatch(/\/assets\/think-[012]\.png/);
      expect(preview.html).toContain('data-mascot-motion-preset="none"');
    });

    it("renders the resolved style variant in rehearsal preview mode", () => {
      const preview = buildSandboxComposition(
        {
          mode: "rehearsal",
          mascot_id: multiVariantMascot.id,
          mascot_style_id: "core",
          mascot_enabled: true,
          question_number: 3,
        },
        multiVariantMascot,
      );

      expect(preview.html).toMatch(/\/assets\/think-[012]\.png/);
      expect(preview.html).toMatch(/\/assets\/celeb-[01]\.png/);
    });
  });
});
