import { z } from "zod";

export const QuizGameplayIdSchema = z.enum([
  "deep_trivia",
  "visual_spotting",
  "verdict_true_false",
  "verdict_fact_myth",
  "versus_faceoff",
  "visual_identification",
  "speed_blitz",
  "mystery_reveal",
]);
