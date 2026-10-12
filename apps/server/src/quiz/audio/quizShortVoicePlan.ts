import type { QuizV2, VoicePlan } from "@studio/shared";
import { buildQuizVoicePlan, type BuildQuizVoicePlanOptions } from "./voicePlan.js";

export type BuildQuizShortVoicePlanOptions = Pick<BuildQuizVoicePlanOptions, "director" | "skipIntro" | "kickoffText">;

/**
 * Quiz Short voice plan: kickoff line, question and reveal segments only. The score CTA and the
 * Short outro carry no speech. With a Short intro the kickoff reads the quiz title instead.
 */
export function buildQuizShortVoicePlan(quiz: QuizV2, options?: BuildQuizShortVoicePlanOptions): VoicePlan {
  return buildQuizVoicePlan(quiz, {
    director: options?.director,
    skipIntro: options?.skipIntro,
    kickoffText: options?.kickoffText,
    skipOutro: true,
    skipPreOutro: true,
    includeBridgeSegments: false,
    pacingProfile: "short",
  });
}
