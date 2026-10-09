import type { BankQuestion, QuizQuestion } from "@studio/shared";
import { hasFixedChoiceOrder, placeCorrectChoiceAt, stableHash, swapContenderNamesInStem } from "./choiceOrderUtils.js";

function hasFixedQuizChoiceOrder(question: QuizQuestion): boolean {
  return (
    question.format === "yes_no" ||
    question.answer_mode === "single_reveal" ||
    hasFixedChoiceOrder(question.gameplay_id, question.choices.length)
  );
}

function choiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function swapVersusStemIfReordered(
  archetypeId: string | undefined,
  questionText: string,
  original: ReadonlyArray<{ id: string; text: string }>,
  reordered: ReadonlyArray<{ id: string }>,
): string {
  if (archetypeId !== "versus_faceoff" || original.length !== 2 || reordered[0]?.id === original[0]?.id) return questionText;
  return swapContenderNamesInStem(questionText, original[0].text, original[1].text);
}

function relocateBankCorrectChoice(question: BankQuestion, targetIndex: number): BankQuestion {
  const reordered = placeCorrectChoiceAt(question.choices, question.correct_choice_id, targetIndex);
  const choices = reordered.map((choice, index) => ({
    ...choice,
    id: choiceLetter(index),
    is_correct: choice.id === question.correct_choice_id,
  }));
  return {
    ...question,
    question: swapVersusStemIfReordered(question.archetype_id, question.question, question.choices, reordered),
    choices,
    correct_choice_id: choiceLetter(targetIndex),
  };
}

/**
 * Generation-time balancing: LLMs overwhelmingly put the correct answer first, so freshly parsed
 * questions are rotated round-robin through every answer position and relabelled A/B/C by position.
 */
export function balanceGeneratedChoicePositions(questions: readonly BankQuestion[]): BankQuestion[] {
  const offset = stableHash(questions.map((question) => question.question).join("\n"));
  return questions.map((question, index) => {
    const choiceCount = question.choices.length;
    if (question.format === "yes_no" || hasFixedChoiceOrder(question.archetype_id, choiceCount)) return question;
    if (!question.choices.some((choice) => choice.id === question.correct_choice_id)) return question;
    return relocateBankCorrectChoice(question, (offset + index) % choiceCount);
  });
}

function relocateQuizCorrectChoice(question: QuizQuestion, targetIndex: number): QuizQuestion {
  const currentIndex = question.choices.findIndex((choice) => choice.id === question.correct_choice_id);
  if (currentIndex < 0 || currentIndex === targetIndex) return question;
  const reordered = placeCorrectChoiceAt(question.choices, question.correct_choice_id, targetIndex);
  return {
    ...question,
    question: swapVersusStemIfReordered(question.gameplay_id, question.question, question.choices, reordered),
    choices: reordered,
  };
}

/**
 * Render-time ordering for bank questions: places the correct answer at a position derived from the
 * question id and text, so legacy bank data with answer-position bias still renders balanced and replays identically.
 * Choice ids are preserved, keeping translations and the canonical answer mapping intact.
 */
export function applyStableChoiceOrder(question: QuizQuestion): QuizQuestion {
  if (hasFixedQuizChoiceOrder(question)) return question;
  // The question text is part of the seed so generic ids ("question-01") still vary between episodes.
  const seed = `${question.id}|${question.question}`;
  return relocateQuizCorrectChoice(question, stableHash(seed) % question.choices.length);
}

function leastUsedPosition(counts: readonly number[], excluded: number): number {
  let best = -1;
  counts.forEach((count, index) => {
    if (index !== excluded && (best < 0 || count < counts[best])) best = index;
  });
  return best;
}

/**
 * Episode-level spreading: prevents the correct answer from sitting in the same position on consecutive
 * questions (3-choice layouts) or three times in a row (2-choice layouts).
 */
export function spreadCorrectChoicePositions(questions: readonly QuizQuestion[]): QuizQuestion[] {
  const usageByChoiceCount = new Map<number, number[]>();
  let previous: { choiceCount: number; position: number; run: number } | null = null;

  return questions.map((question) => {
    const choiceCount = question.choices.length;
    if (hasFixedQuizChoiceOrder(question)) {
      previous = null;
      return question;
    }
    const counts = usageByChoiceCount.get(choiceCount) ?? new Array<number>(choiceCount).fill(0);
    let position = question.choices.findIndex((choice) => choice.id === question.correct_choice_id);
    if (position < 0) return question;

    const maxRun = choiceCount >= 3 ? 1 : 2;
    const continuesRun = previous?.choiceCount === choiceCount && previous.position === position;
    let result = question;
    if (continuesRun && previous!.run >= maxRun) {
      position = leastUsedPosition(counts, position);
      result = relocateQuizCorrectChoice(question, position);
    }

    counts[position] += 1;
    usageByChoiceCount.set(choiceCount, counts);
    const run = previous?.choiceCount === choiceCount && previous.position === position ? previous.run + 1 : 1;
    previous = { choiceCount, position, run };
    return result;
  });
}
