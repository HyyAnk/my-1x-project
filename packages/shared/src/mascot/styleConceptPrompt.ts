import { z } from "zod";

export const MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH = 1000;

export const MascotStyleConceptPromptSchema = z
  .string({
    required_error: "Style generation prompt is required",
    invalid_type_error: "Style generation prompt must be text",
  })
  .trim()
  .min(1, "Style generation prompt is required")
  .max(
    MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH,
    `Style generation prompt must be at most ${MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH} characters`,
  );

export type MascotStyleConceptPrompt = z.infer<typeof MascotStyleConceptPromptSchema>;
