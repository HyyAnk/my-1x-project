import type { QuizSubjectAnchor } from "../../thumbnailTypes.js";
import { GENERIC_HEADLINE_WORDS } from "./headlineLexicon.js";
import { tokenizeHeadlineText } from "./headlineTokens.js";
import type { EditorialHeadlineContext, HeadlineIssue } from "./headlineTypes.js";

function questionTokens(context: EditorialHeadlineContext): Set<string> {
  const text = (context.questions ?? []).flatMap((question) => [question.question, ...(question.choices ?? [])]).join(" ");
  return new Set(tokenizeHeadlineText(text));
}

/**
 * A pictured subject is grounded when its label shares a specific word with at least one question
 * or answer choice. This catches planner-invented subjects such as an X-ray hand on an episode
 * that never mentions X-rays.
 */
export function isSubjectGrounded(subject: QuizSubjectAnchor, groundingTokens: ReadonlySet<string>): boolean {
  return tokenizeHeadlineText(subject.label).some((token) => !GENERIC_HEADLINE_WORDS.has(token) && groundingTokens.has(token));
}

/**
 * Returns an issue when any pictured subject is not grounded in the episode questions.
 * Runs for English episodes with questions only, matching the headline lexicon's scope.
 */
export function findUngroundedSubjectIssue(subjects: readonly QuizSubjectAnchor[], context: EditorialHeadlineContext): HeadlineIssue | null {
  if (context.languageCode !== "en" || !context.questions?.length || subjects.length === 0) return null;
  const groundingTokens = questionTokens(context);
  const ungrounded = subjects.filter((subject) => !isSubjectGrounded(subject, groundingTokens));
  if (ungrounded.length === 0) return null;
  return {
    code: "ungrounded_subject",
    severity: "hard",
    detail: `The pictured subject (${ungrounded.map((subject) => subject.label).join(", ")}) does not appear in any episode question or answer choice.`,
  };
}
