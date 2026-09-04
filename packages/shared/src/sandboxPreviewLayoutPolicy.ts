import { z } from "zod";
import type { DirectorArchetype, QuizQuestionFormat } from "./enums.js";
import type { MascotRenderAspectRatio } from "./mascot/renderTypes.js";
import {
  evaluateQuizLayoutCompatibility,
  getQuizLayoutCapability,
  quizChoicePresentationFor,
  quizMediaForPresentation,
  QUIZ_LAYOUT_INCOMPATIBILITY_CODES,
  type QuizLayoutIncompatibility,
  type QuizPreviewLayoutId,
} from "./quizLayouts.js";

export type SandboxPreviewLayoutContext = {
  layout_id: QuizPreviewLayoutId;
  choices: readonly string[];
  question_format?: QuizQuestionFormat;
  archetype?: DirectorArchetype;
  aspect_ratio: MascotRenderAspectRatio;
};

export function sandboxPreviewLayoutIssues(input: SandboxPreviewLayoutContext): readonly QuizLayoutIncompatibility[] {
  if (input.layout_id === "baseline") return [];
  const capability = getQuizLayoutCapability(input.layout_id);
  const questionFormat = input.question_format ?? (input.choices.length === 2 ? "true_false" : "multiple_choice");
  const hasSemanticContext = Boolean(input.question_format || input.archetype);
  const defaultPresentation = capability.supportedPresentations[0];
  const archetype = resolveSandboxArchetype(input.archetype, questionFormat, defaultPresentation);
  const choicePresentation = hasSemanticContext ? quizChoicePresentationFor(archetype, questionFormat) : defaultPresentation;
  const media = hasSemanticContext
    ? quizMediaForPresentation(choicePresentation).filter((m) => capability.media.supported.includes(m))
    : capability.media.required;
  const result = evaluateQuizLayoutCompatibility({
    layoutId: input.layout_id,
    choicePresentation,
    choiceCount: input.choices.length,
    questionFormat,
    aspectRatio: input.aspect_ratio,
    media,
  });
  return result.compatible ? [] : result.issues;
}

export type SandboxPreviewIncompatibilityResponse = {
  error: string;
  code: "QUIZ_LAYOUT_INCOMPATIBLE";
  issues: readonly QuizLayoutIncompatibility[];
};

export const SandboxPreviewIncompatibilityResponseSchema = z.object({
  error: z.string(),
  code: z.literal("QUIZ_LAYOUT_INCOMPATIBLE"),
  issues: z.array(
    z.object({
      code: z.enum(QUIZ_LAYOUT_INCOMPATIBILITY_CODES),
      capability: z.enum(["choicePresentation", "choiceCount", "questionFormat", "aspectRatio", "media", "layout"]),
      actual: z.union([z.string(), z.number(), z.array(z.string())]),
      supported: z.array(z.union([z.string(), z.number()])),
      message: z.string(),
      nextAction: z.string(),
    }),
  ),
});

function resolveSandboxArchetype(
  archetype: DirectorArchetype | undefined,
  questionFormat: QuizQuestionFormat,
  defaultPresentation: "text" | "visual",
): DirectorArchetype {
  if (archetype) return archetype;
  if (questionFormat === "odd_one_out") return "visual_multiple_choice";
  if (questionFormat === "true_false") return "true_false";
  return defaultPresentation === "visual" ? "visual_multiple_choice" : "text_multiple_choice";
}
