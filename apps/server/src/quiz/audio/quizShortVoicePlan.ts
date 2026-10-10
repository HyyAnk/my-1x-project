import type { QuizV2, VoicePlan } from "@studio/shared";
import { buildQuizVoicePlan, type BuildQuizVoicePlanOptions } from "./voicePlan.js";

export type BuildQuizShortVoicePlanOptions = Pick<BuildQuizVoicePlanOptions, "director" | "skipIntro">;

/**
 * Quiz Short voice plan: kickoff line, question and reveal segments only. The score CTA
 * is on-screen copy, so there is no spoken closing line.
 */
export function buildQuizShortVoicePlan(quiz: QuizV2, options?: BuildQuizShortVoicePlanOptions): VoicePlan {
  return buildQuizVoicePlan(quiz, {
    director: options?.director,
    skipIntro: options?.skipIntro,
    skipOutro: true,
    skipPreOutro: true,
    includeBridgeSegments: false,
    pacingProfile: "short",
  });
}
