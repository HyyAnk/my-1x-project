import { z } from "zod";

export const QuizAnswerModeSchema = z.enum(["choice_selection", "single_reveal"]);
export type QuizAnswerMode = z.infer<typeof QuizAnswerModeSchema>;

export const DEFAULT_QUIZ_ANSWER_MODE: QuizAnswerMode = "choice_selection";

export function isSingleRevealMode(mode?: string | null): boolean {
  return mode === "single_reveal";
}
