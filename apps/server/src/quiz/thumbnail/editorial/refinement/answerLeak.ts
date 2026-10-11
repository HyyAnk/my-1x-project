import { containsKeyword } from "../../utils/keywordMatch.js";
import { isVerdictChoicePair } from "../../utils/verdictChoices.js";
import type { EditorialHeadlineContext } from "./headlineTypes.js";

const MIN_ANSWER_CHARS = 3;
const LEADING_ARTICLE = /^(the|a|an)\s+/i;

function revealableAnswers(context: EditorialHeadlineContext): string[] {
  return (context.questions ?? [])
    .filter((question) => question.answer && !isVerdictChoicePair(question.choices))
    .map((question) => question.answer!.trim().replace(LEADING_ARTICLE, ""))
    .filter((answer) => answer.length >= MIN_ANSWER_CHARS);
}

/**
 * Returns the correct answer a headline names outright, or null. Naming an answer on the thumbnail
 * spoils that question (e.g. "WHO CLAIMS EXCALIBUR?" for "What is King Arthur's sword?").
 * Picturing the subject is fine; only the headline text is checked.
 */
export function findRevealedAnswer(headline: string, context: EditorialHeadlineContext): string | null {
  return revealableAnswers(context).find((answer) => containsKeyword(headline, answer)) ?? null;
}

/** Answers the rewrite model must not name, capped to keep the prompt short. */
export function answersToAvoid(context: EditorialHeadlineContext, limit = 12): string[] {
  return revealableAnswers(context).slice(0, limit);
}
