import type { BankChoice, BankGameplayArchetypeId, BankQuestion, QuizAgeBand, QuizQuestionFormat } from "@studio/shared";

export interface BuildBankQuestionParams {
  initialId?: string;
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  questionText: string;
  format: QuizQuestionFormat;
  choices: BankChoice[];
  explanation: string;
  funFact: string;
  visualPrompt: string;
  difficulty: number;
  thinkingSeconds: number;
  ageBand: QuizAgeBand;
}

/** Builds a fully-formed BankQuestion from the manual form state. */
export function buildBankQuestion(params: BuildBankQuestionParams): BankQuestion {
  const correct = params.choices.find((c) => c.is_correct);
  return {
    id: params.initialId || `Q-${Date.now()}`,
    archetype_id: params.archetypeId,
    domain_id: params.domainId,
    subtopic_id: params.subtopicId,
    question: params.questionText.trim(),
    format: params.format,
    choices: params.choices,
    correct_choice_id: correct ? correct.id : "",
    explanation: params.explanation.trim(),
    fun_fact: params.funFact.trim(),
    visual_spec: {
      intent: params.visualPrompt.trim() ? "question_illustration" : "none",
      prompt: params.visualPrompt.trim() || undefined,
      aspect_ratio: "16:9",
    },
    difficulty: params.difficulty,
    thinking_seconds: params.thinkingSeconds,
    age_band: params.ageBand,
    tags: [params.domainId, params.subtopicId],
    status: "approved",
  };
}

const NEXT_CHOICE_LETTERS = ["A", "B", "C", "D", "E"];

/** Appends the next unused lettered choice (A-E, then OPT-N fallback). */
export function appendNextChoice(currentChoices: BankChoice[]): BankChoice[] {
  const usedIds = new Set(currentChoices.map((c) => c.id));
  const nextId = NEXT_CHOICE_LETTERS.find((l) => !usedIds.has(l)) || `OPT-${currentChoices.length + 1}`;
  return [...currentChoices, { id: nextId, text: `Option ${nextId}`, is_correct: false }];
}

/** Removes a choice; reassigns correct answer to the first remaining choice if needed. */
export function removeChoiceItem(currentChoices: BankChoice[], id: string): BankChoice[] {
  const filtered = currentChoices.filter((c) => c.id !== id);
  if (!filtered.some((c) => c.is_correct) && filtered.length > 0) {
    filtered[0].is_correct = true;
  }
  return filtered;
}
