import { QuizV2Schema, type QuizV2, type BankQuestion } from "@studio/shared";

export function makeAuthorizedQuiz(subject: string): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "authorized-content-fixture",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "question-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: `Which subject is shown: ${subject}?`,
        choices: [
          { id: "choice-a", text: subject },
          { id: "choice-b", text: "A mountain" },
          { id: "choice-c", text: "An ocean" },
        ],
        correct_choice_id: "choice-a",
        explanation: `The reference image depicts ${subject}.`,
        fun_fact: `This exercise identifies ${subject}.`,
        source_ids: ["C01"],
        visual_opportunity: `${subject} centered on a bright studio background`,
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

export function makeAuthorizedBankQuestion(subject: string): BankQuestion {
  return {
    id: "AUTHORIZED-001",
    archetype_id: "speed_blitz",
    domain_id: "logic_puzzles",
    subtopic_id: "tricky_riddles",
    language: "en",
    format: "multiple_choice",
    question: `Which subject is shown: ${subject}?`,
    choices: [
      { id: "A", text: subject, is_correct: true },
      { id: "B", text: "A mountain", is_correct: false },
      { id: "C", text: "An ocean", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: `The reference image depicts ${subject}.`,
    fun_fact: `This exercise identifies ${subject}.`,
    visual_spec: { intent: "none", aspect_ratio: "16:9" },
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 4,
    tags: ["identity-fixture"],
    status: "approved",
  };
}
