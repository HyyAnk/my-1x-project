import type { QuizTimeline } from "@studio/shared";
import type { ResolvedCandyArcadeQuestion } from "./candyArcadeQuestionResolution.js";

type QuestionPalette = ResolvedCandyArcadeQuestion["visual"]["palette"];

/** Palette of the first question that enters at or after `atSeconds`, used to color a bridge stinger into it. */
export function resolveQuestionPaletteAfter(
  events: QuizTimeline["events"],
  resolvedQuestions: readonly ResolvedCandyArcadeQuestion[],
  atSeconds: number,
): QuestionPalette | undefined {
  const nextQuestionEnter = events
    .filter((event) => event.type === "question.enter" && event.at_seconds >= atSeconds)
    .sort((left, right) => left.at_seconds - right.at_seconds)[0];
  if (!nextQuestionEnter) return undefined;
  return resolvedQuestions.find(({ question }) => question.id === nextQuestionEnter.question_id)?.visual.palette;
}
