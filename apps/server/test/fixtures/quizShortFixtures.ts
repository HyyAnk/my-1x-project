import { QuizShortConfigSchema, QuizV2Schema, type QuizShortConfig, type QuizV2 } from "@studio/shared";

export type QuizShortQuestionSpec = {
  format?: "multiple_choice" | "yes_no" | "odd_one_out" | "image_guess";
  choices?: string[];
  correctIndex?: number;
  visual?: string;
  explanation?: string;
};

const DEFAULT_CHOICES = ["Jupiter", "Mars", "Venus"];

export function buildQuizShortQuiz(
  specs: QuizShortQuestionSpec[],
  overrides?: Partial<Pick<QuizV2, "language" | "age_band" | "episode_id">>,
): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: overrides?.episode_id ?? "quiz-short-specimen",
    age_band: overrides?.age_band ?? "7-9",
    language: overrides?.language ?? "English",
    questions: specs.map((spec, index) => {
      const format = spec.format ?? "multiple_choice";
      const choices = spec.choices ?? (format === "yes_no" ? ["Yes", "No"] : DEFAULT_CHOICES);
      return {
        id: `q${index + 1}`,
        number: index + 1,
        format,
        // Two-choice multiple choice is only valid as an explicit Versus gameplay.
        gameplay_id: format === "multiple_choice" && choices.length === 2 ? "versus_faceoff" : undefined,
        difficulty: 1,
        question: `Which planet is the largest in question ${index + 1}?`,
        choices: choices.map((text, choiceIndex) => ({ id: `q${index + 1}-c${choiceIndex}`, text })),
        correct_choice_id: `q${index + 1}-c${spec.correctIndex ?? 0}`,
        explanation: spec.explanation ?? "Jupiter is the largest planet in the solar system.",
        fun_fact: "",
        source_ids: ["C01"],
        visual_opportunity: spec.visual ?? "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      };
    }),
  });
}

/** Five text questions: three-choice multiple choice with yes/no questions in positions 2 and 4. */
export function buildTextQuizShortQuiz(): QuizV2 {
  return buildQuizShortQuiz([
    {},
    { format: "yes_no", visual: "A smiling planet with rings" },
    { correctIndex: 1 },
    { format: "yes_no", correctIndex: 1, visual: "A rocket flying past the moon" },
    { correctIndex: 2 },
  ]);
}

/** Five image questions alternating three and two choices so both media layouts are used. */
export function buildImageQuizShortQuiz(): QuizV2 {
  return buildQuizShortQuiz([
    { visual: "Jupiter with its great red spot" },
    { choices: ["Mars", "Venus"], visual: "Two planets side by side" },
    { visual: "Saturn with bright rings", correctIndex: 1 },
    { choices: ["Mercury", "Neptune"], visual: "A small rocky planet beside a blue giant", correctIndex: 1 },
    { visual: "The sun rising over Earth", correctIndex: 2 },
  ]);
}

export function buildQuizShortConfig(overrides?: Partial<QuizShortConfig>): QuizShortConfig {
  return QuizShortConfigSchema.parse({ ...overrides });
}

/** Realistic measured narration: 2.5 s per question line, one second per reveal, a short kickoff. */
export function quizShortAudioDurations(segmentIds: string[]): Record<string, number> {
  return Object.fromEntries(
    segmentIds.map((segmentId) => [segmentId, segmentId === "kickoff" ? 1.2 : segmentId.endsWith(":question") ? 2.5 : 1.0]),
  );
}
