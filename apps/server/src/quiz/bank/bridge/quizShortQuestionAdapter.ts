import { QuizQuestionSchema, type BankQuestion, type QuizChoice, type QuizQuestion, type QuizShortLayoutPair } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import { assignedPortraitLayout } from "../../director/quizShortDirectorPlan.js";

export const QUIZ_SHORT_VERSUS_CHOICE_COUNT = 2;

export interface QuizShortQuestionAdaptationContext {
  /** Portrait layout the beat assignment rule gives this question. */
  assignedLayout: QuizShortLayoutPair["primary"];
  /** The bound bank question asks for one illustration per choice. */
  choiceImageIntent: boolean;
}

function overlapTokens(text: string): Set<string> {
  return new Set(
    text
      .toLocaleLowerCase()
      .normalize("NFKC")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 0),
  );
}

/** Jaccard overlap of the word tokens of two choice texts, 0 when they share nothing. */
export function choiceTextOverlap(left: string, right: string): number {
  const leftTokens = overlapTokens(left);
  const rightTokens = overlapTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1;
  return shared / (leftTokens.size + rightTokens.size - shared);
}

/**
 * Dropping rule: the distractor that shares the fewest words with the correct answer goes,
 * because the remaining pair reads as a sharper head-to-head on a portrait versus layout.
 * Ties keep the earlier distractor, so the result is deterministic for a given choice order.
 */
export function selectDistractorToDrop(question: Pick<QuizQuestion, "choices" | "correct_choice_id">): QuizChoice {
  const correct = question.choices.find((choice) => choice.id === question.correct_choice_id);
  if (!correct) throw new RepositoryError(`Question has no correct choice "${question.correct_choice_id}"`, "QUIZ_SHORT_ADAPT_FAILED");
  const distractors = question.choices.filter((choice) => choice.id !== correct.id);
  let lowest = distractors[0];
  let lowestOverlap = Number.POSITIVE_INFINITY;
  for (const distractor of distractors) {
    const overlap = choiceTextOverlap(distractor.text, correct.text);
    // "<=" lets a later distractor win ties, so the earlier one stays on screen.
    if (overlap <= lowestOverlap) {
      lowest = distractor;
      lowestOverlap = overlap;
    }
  }
  return lowest;
}

/**
 * A three-choice question needs adapting when its beat lands on the two-up versus layout, or when
 * it would need one image per choice (three portrait images never fit). Text-only three-choice
 * questions stay as they are because `short_stack_list` renders three rows.
 */
export function needsQuizShortAdaptation(question: QuizQuestion, context: QuizShortQuestionAdaptationContext): boolean {
  if (question.choices.length <= QUIZ_SHORT_VERSUS_CHOICE_COUNT) return false;
  if (question.answer_mode === "single_reveal") return false;
  return context.assignedLayout === "short_versus_two" || context.choiceImageIntent;
}

/**
 * Returns a new question with one distractor removed and `adapted_from_choice_ids` recorded.
 * The input (and the bank record behind it) is never mutated.
 */
export function adaptQuizShortQuestion(question: QuizQuestion, context: QuizShortQuestionAdaptationContext): QuizQuestion {
  if (!needsQuizShortAdaptation(question, context)) return question;
  const dropped = selectDistractorToDrop(question);
  const choices = question.choices.filter((choice) => choice.id !== dropped.id);
  if (choices.length < QUIZ_SHORT_VERSUS_CHOICE_COUNT) {
    throw new RepositoryError(
      `QUIZ_SHORT_ADAPT_FAILED: Question "${question.id}" would keep fewer than two choices after adaptation.`,
      "QUIZ_SHORT_ADAPT_FAILED",
    );
  }
  return QuizQuestionSchema.parse({
    ...question,
    choices,
    // Two-choice multiple choice is only valid as the Versus gameplay; Yes/No keeps its own.
    gameplay_id: question.format === "yes_no" ? question.gameplay_id : "versus_faceoff",
    adapted_from_choice_ids: [...(question.adapted_from_choice_ids ?? []), dropped.id],
  });
}

export function hasChoiceImageIntent(bankQuestion: Pick<BankQuestion, "visual_spec"> | undefined): boolean {
  return bankQuestion?.visual_spec?.intent === "choice_illustration";
}

/**
 * Adapts a whole question list using the beat assignment rule: question one sits on the primary
 * layout and the rest alternate. `bankQuestions` is matched by index to read the image intent.
 */
export function adaptQuizShortQuestions(
  questions: readonly QuizQuestion[],
  pair: QuizShortLayoutPair,
  bankQuestions: readonly Pick<BankQuestion, "visual_spec">[] = [],
): QuizQuestion[] {
  return questions.map((question, index) =>
    adaptQuizShortQuestion(question, {
      assignedLayout: assignedPortraitLayout(pair, index),
      choiceImageIntent: hasChoiceImageIntent(bankQuestions[index]),
    }),
  );
}
