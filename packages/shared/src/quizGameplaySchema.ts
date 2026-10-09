import { z } from "zod";
import { acceptLegacyVerdictAliases } from "./enums/quiz/legacyVerdictAliases.js";

export const QUIZ_GAMEPLAY_IDS = [
  "deep_trivia",
  "visual_spotting",
  "verdict_yes_no",
  "versus_faceoff",
  "visual_identification",
  "speed_blitz",
  "mystery_reveal",
] as const;

export const QuizGameplayIdSchema = acceptLegacyVerdictAliases(z.enum(QUIZ_GAMEPLAY_IDS));
