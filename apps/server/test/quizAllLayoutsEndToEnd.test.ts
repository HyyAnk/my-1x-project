import { describe, expect, it } from "vitest";
import {
  QUIZ_GAMEPLAY_ARCHETYPES,
  QUIZ_LAYOUTS,
  QuizV2Schema,
  resolveQuizLayout,
  type DirectorArchetype,
  type MascotRenderAspectRatio,
  type QuizPreviewLayoutId,
  type QuizQuestionFormat,
  type QuizV2,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

function createTestQuiz(layoutId: string, format: QuizQuestionFormat, choices: string[]): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: `ep-${layoutId}`,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: `q-${layoutId}`,
        number: 1,
        format,
        difficulty: 1,
        question: `Test question for ${layoutId}?`,
        choices: choices.map((text, idx) => ({ id: `c-${idx + 1}`, text })),
        correct_choice_id: "c-1",
        explanation: "Correct answer explanation.",
        fun_fact: "Interesting fact.",
        source_ids: ["test"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

describe("Quiz All 6 Layouts End-to-End Integration", () => {
  describe("1. Topic Suggestion & Archetype Blueprint Registry", () => {
    it("exports 6 production gameplay archetypes with concrete format and layout mappings", () => {
      expect(QUIZ_GAMEPLAY_ARCHETYPES).toHaveLength(6);

      const archetypesById = new Map(QUIZ_GAMEPLAY_ARCHETYPES.map((a) => [a.id, a]));

      expect(archetypesById.get("deep_trivia")).toMatchObject({
        defaultFormat: "multiple_choice",
        targetLayout: "media_left_choices_right",
      });

      expect(archetypesById.get("visual_spotting")).toMatchObject({
        defaultFormat: "odd_one_out",
        targetLayout: "visual_choices_three_pure",
      });

      expect(archetypesById.get("verdict_fact_myth")).toMatchObject({
        defaultFormat: "true_false",
        targetLayout: "verdict_true_false",
      });

      expect(archetypesById.get("versus_faceoff")).toMatchObject({
        defaultFormat: "multiple_choice",
        targetLayout: "split_versus_two",
      });

      expect(archetypesById.get("visual_identification")).toMatchObject({
        defaultFormat: "multiple_choice",
        targetLayout: "visual_choices_three",
      });

      expect(archetypesById.get("speed_blitz")).toMatchObject({
        defaultFormat: "multiple_choice",
        targetLayout: "full_stack_list",
      });
    });
  });

  describe("2. Topic Confirmation & Director Layout Auto-Resolution", () => {
    const testCases: Array<{
      name: string;
      archetype: "text_multiple_choice" | "visual_multiple_choice" | "true_false";
      questionFormat: "multiple_choice" | "odd_one_out" | "true_false";
      choiceCount: number;
      expectedLayout: QuizPreviewLayoutId;
    }> = [
      {
        name: "True/False format routes to verdict_true_false",
        archetype: "true_false",
        questionFormat: "true_false",
        choiceCount: 2,
        expectedLayout: "verdict_true_false",
      },
      {
        name: "Odd One Out format routes to visual_choices_three_pure",
        archetype: "visual_multiple_choice",
        questionFormat: "odd_one_out",
        choiceCount: 3,
        expectedLayout: "visual_choices_three_pure",
      },
      {
        name: "Visual Multiple Choice routes to visual_choices_three",
        archetype: "visual_multiple_choice",
        questionFormat: "multiple_choice",
        choiceCount: 3,
        expectedLayout: "visual_choices_three",
      },
      {
        name: "Standard Text Multiple Choice routes to media_left_choices_right",
        archetype: "text_multiple_choice",
        questionFormat: "multiple_choice",
        choiceCount: 3,
        expectedLayout: "media_left_choices_right",
      },
    ];

    for (const tc of testCases) {
      it(tc.name, () => {
        const resolution = resolveQuizLayout({
          requestedLayout: "auto",
          archetype: tc.archetype,
          questionFormat: tc.questionFormat,
          choiceCount: tc.choiceCount,
        });
        expect(resolution.ok).toBe(true);
        if (resolution.ok) {
          expect(resolution.layoutId).toBe(tc.expectedLayout);
        }
      });
    }

    it("creates director beats with auto-resolved layouts for all question formats", () => {
      const mockQuiz: QuizV2 = QuizV2Schema.parse({
        schema_version: 2,
        episode_id: "ep-diverse",
        age_band: "7-9",
        language: "English",
        questions: [
          {
            id: "q-tf",
            number: 1,
            format: "true_false",
            difficulty: 1,
            question: "Is Pluto a planet?",
            choices: [
              { id: "c-1", text: "True" },
              { id: "c-2", text: "False" },
            ],
            correct_choice_id: "c-2",
            explanation: "Pluto is classified as a dwarf planet.",
            fun_fact: "Discovered in 1930.",
            source_ids: ["test"],
            visual_opportunity: "",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
          {
            id: "q-odd",
            number: 2,
            format: "odd_one_out",
            difficulty: 1,
            question: "Which one is not a mammal?",
            choices: [
              { id: "c-1", text: "Dolphin" },
              { id: "c-2", text: "Crocodile" },
              { id: "c-3", text: "Bat" },
            ],
            correct_choice_id: "c-2",
            explanation: "Crocodile is a reptile.",
            fun_fact: "Reptiles are cold-blooded.",
            source_ids: ["test"],
            visual_opportunity: "",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
          {
            id: "q-mc",
            number: 3,
            format: "multiple_choice",
            difficulty: 1,
            question: "What is the capital of Japan?",
            choices: [
              { id: "c-1", text: "Kyoto" },
              { id: "c-2", text: "Tokyo" },
              { id: "c-3", text: "Osaka" },
            ],
            correct_choice_id: "c-2",
            explanation: "Tokyo is the capital.",
            fun_fact: "Largest metropolitan area.",
            source_ids: ["test"],
            visual_opportunity: "",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
          {
            id: "q-final",
            number: 4,
            format: "multiple_choice",
            difficulty: 3,
            question: "Final Boss Question?",
            choices: [
              { id: "c-1", text: "A" },
              { id: "c-2", text: "B" },
              { id: "c-3", text: "C" },
            ],
            correct_choice_id: "c-1",
            explanation: "End.",
            fun_fact: "End.",
            source_ids: ["test"],
            visual_opportunity: "",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
        ],
      });

      const director = createDefaultDirectorPlan(mockQuiz, "candy_arcade", "sunny");
      expect(director.beats).toHaveLength(4);

      // Verify each beat has smart archetype
      expect(director.beats[0].archetype).toBe("true_false");
      expect(director.beats[1].archetype).toBe("visual_multiple_choice");
      expect(director.beats[2].archetype).toBe("text_multiple_choice");
      expect(director.beats[3].archetype).toBe("final_challenge");
    });
  });

  describe("3. Scene Pipeline HTML/CSS Rendering for All 6 Layouts (16:9 & 9:16)", () => {
    const layoutScenarios: Array<{
      layoutId: QuizPreviewLayoutId;
      archetype: DirectorArchetype;
      format: QuizQuestionFormat;
      choices: string[];
      assetIntents: ("choice_illustration" | "question_illustration")[];
      aspectRatios: MascotRenderAspectRatio[];
    }> = [
      {
        layoutId: "media_left_choices_right",
        archetype: "text_multiple_choice",
        format: "multiple_choice",
        choices: ["Mars", "Saturn", "Jupiter"],
        assetIntents: ["question_illustration"],
        aspectRatios: ["16:9", "9:16"],
      },
      {
        layoutId: "visual_choices_three",
        archetype: "visual_multiple_choice",
        format: "multiple_choice",
        choices: ["Cardinal", "Blue Jay", "Sparrow"],
        assetIntents: ["choice_illustration"],
        aspectRatios: ["16:9", "9:16"],
      },
      {
        layoutId: "visual_choices_three_pure",
        archetype: "visual_multiple_choice",
        format: "odd_one_out",
        choices: ["Real Cat", "AI Fake Cat", "Real Dog"],
        assetIntents: ["choice_illustration"],
        aspectRatios: ["16:9", "9:16"],
      },
      {
        layoutId: "split_versus_two",
        archetype: "true_false",
        format: "true_false",
        choices: ["Cheetah", "Falcon"],
        assetIntents: ["question_illustration"],
        aspectRatios: ["16:9", "9:16"],
      },
      {
        layoutId: "verdict_true_false",
        archetype: "true_false",
        format: "true_false",
        choices: ["True", "False"],
        assetIntents: ["question_illustration"],
        aspectRatios: ["16:9", "9:16"],
      },
      {
        layoutId: "full_stack_list",
        archetype: "text_multiple_choice",
        format: "multiple_choice",
        choices: ["Piano", "Map", "Clock"],
        assetIntents: [],
        aspectRatios: ["16:9", "9:16"],
      },
    ];

    for (const scenario of layoutScenarios) {
      for (const ar of scenario.aspectRatios) {
        it(`renders production composition bundle for ${scenario.layoutId} in ${ar}`, () => {
          const quiz = createTestQuiz(scenario.layoutId, scenario.format, scenario.choices);

          const director = createDefaultDirectorPlan(quiz, "candy_arcade", "sunny");
          director.beats[0].archetype = scenario.archetype;
          director.beats[0].layout_id = scenario.layoutId;
          director.beats[0].asset_intents = scenario.assetIntents;

          const timeline = compileQuizTimeline({
            quiz,
            director,
            voicePlan: buildQuizVoicePlan(quiz),
          });
          const bundle = buildCandyArcadeCompositionBundle({
            quiz,
            director,
            timeline,
            styleContext: { theme: "candy_arcade" },
            audioPath: "./narration.wav",
            narrationDurationSeconds: timeline.duration_seconds,
            aspectRatio: ar,
          });

          const fullHtml = [bundle.html, ...Object.values(bundle.files)].join("\n");
          expect(fullHtml).toContain("<!doctype html>");
          expect(fullHtml).toContain(`layout-${scenario.layoutId}`);
          expect(fullHtml).toContain(`Test question for ${scenario.layoutId}?`);
          expect(bundle.html).toContain("<style>");
        });
      }
    }
  });

  describe("4. Sandbox Preview Composition for All 6 Layouts", () => {
    const sandboxCases: Array<{
      layoutId: QuizPreviewLayoutId;
      choices: string[];
      question_format: "multiple_choice" | "odd_one_out" | "true_false";
    }> = [
      {
        layoutId: "media_left_choices_right",
        choices: ["Option A", "Option B", "Option C"],
        question_format: "multiple_choice",
      },
      {
        layoutId: "visual_choices_three",
        choices: ["Choice A", "Choice B", "Choice C"],
        question_format: "multiple_choice",
      },
      {
        layoutId: "visual_choices_three_pure",
        choices: ["Detail 1", "Detail 2", "Detail 3"],
        question_format: "odd_one_out",
      },
      {
        layoutId: "split_versus_two",
        choices: ["Lion", "Tiger"],
        question_format: "multiple_choice",
      },
      {
        layoutId: "verdict_true_false",
        choices: ["True", "False"],
        question_format: "true_false",
      },
      {
        layoutId: "full_stack_list",
        choices: ["Answer A", "Answer B", "Answer C"],
        question_format: "multiple_choice",
      },
    ];

    for (const sc of sandboxCases) {
      it(`builds valid sandbox preview for ${sc.layoutId} across all phases`, () => {
        for (const phase of ["question", "thinking", "reveal", "explain"] as const) {
          const res = buildSandboxComposition({
            layout_id: sc.layoutId,
            phase,
            choices: sc.choices,
            correct_choice_index: 0,
            question_format: sc.question_format,
            question_text: `Test question for ${sc.layoutId}?`,
            fact_card_title: "DID YOU KNOW?",
            fact_card_text: "Fascinating explanation facts!",
          });

          expect(res.html).toContain("<!doctype html>");
          expect(res.html).toContain(`layout-${sc.layoutId}`);
          expect(res.css).toBeTruthy();
          expect(res.contrast_report.ok).toBe(true);

          if (phase === "reveal") {
            expect(res.html).toContain("answer-correct");
          }
          if (phase === "explain") {
            expect(res.html).toContain("sandbox-explain-card");
            expect(res.html).toContain("Fascinating explanation facts!");
          }
        }
      });
    }

    it("verifies QUIZ_LAYOUTS contains all 6 production layouts", () => {
      expect(QUIZ_LAYOUTS).toHaveLength(6);
      expect(QUIZ_LAYOUTS.map((l) => l.id)).toEqual([
        "media_left_choices_right",
        "visual_choices_three",
        "visual_choices_three_pure",
        "split_versus_two",
        "verdict_true_false",
        "full_stack_list",
      ]);
    });
  });
});
