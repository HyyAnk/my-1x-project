import { QuizV2Schema, type MascotProfile } from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";

/**
 * Shared canonical two-question quiz fixture used across the Candy Arcade
 * thematic test suites.
 */
export const candyArcadeQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "candy-demo",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "question-01",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which ocean is the largest on Earth?",
      choices: [
        { id: "choice-a", text: "Pacific Ocean" },
        { id: "choice-b", text: "Atlantic Ocean" },
        { id: "choice-c", text: "Arctic Ocean" },
      ],
      correct_choice_id: "choice-b",
      explanation: "The Pacific Ocean covers the largest area.",
      fun_fact: "",
      source_ids: ["C01"],
      visual_opportunity: "A bright globe with the Pacific Ocean",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "question-02",
      number: 2,
      format: "odd_one_out",
      difficulty: 2,
      question: "Which animal can sprint the fastest?",
      choices: [
        { id: "choice-a", text: "Cheetah" },
        { id: "choice-b", text: "Turtle" },
        { id: "choice-c", text: "Elephant" },
      ],
      correct_choice_id: "choice-a",
      explanation: "Cheetahs sprint very quickly for short distances.",
      fun_fact: "",
      source_ids: ["C02"],
      visual_opportunity: "A friendly cheetah",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

/**
 * Shared dummy mascot profile used across the Candy Arcade thematic test suites.
 */
export const dummyMascot: MascotProfile = {
  id: "mascot-1",
  name: "Buddy",
  description: "Friendly mascot",
  visual_style: "pixar_3d",
  master_prompt: "",
  master_image_url: null,
  color_theme: "#06b6d4",
  assigned_channel_ids: ["ch-1"],
  actions: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Builds the quiz, director, and timeline trio shared by composition tests.
 */
export function buildQuizDirectorTimeline() {
  const director = createDefaultDirectorPlan(candyArcadeQuiz);
  const timeline = compileQuizTimeline({
    quiz: candyArcadeQuiz,
    director,
    voicePlan: buildQuizVoicePlan(candyArcadeQuiz),
  });
  return { quiz: candyArcadeQuiz, director, timeline };
}

/**
 * Joins the production bundle html and all composition files into one source
 * string for containment assertions.
 */
export function compositionSources(input: Parameters<typeof buildCandyArcadeCompositionBundle>[0]): string {
  const bundle = buildCandyArcadeCompositionBundle(input);
  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}

/**
 * Extracts the quiz question composition file html bodies from a bundle.
 */
export function questionCompositionFiles(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([path]) => path.startsWith("compositions/quiz-q"))
    .map(([, html]) => html);
}

/**
 * Extracts the choice card opening tag for a given choice id.
 */
export function choiceCardTag(html: string, choiceId: string): string {
  return html.match(new RegExp(`<div[^>]*data-choice-id="${choiceId}"[^>]*>`))?.[0] ?? "";
}
