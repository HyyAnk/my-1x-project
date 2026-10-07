import type { QuizThumbnailPlan, ResolveThumbnailInput } from "../thumbnailTypes.js";
import { sanitizeThumbnailHook } from "../thumbnailHookGuardrail.js";
import {
  EDITORIAL_CHALLENGE_ARCHETYPES,
  EDITORIAL_DOMAIN_SEEDS,
  resolveEditorialSeed,
  type EditorialChallengeArchetype,
  type EditorialDomainSeed,
  type EditorialMascotPose,
  type EditorialSubjectSeed,
} from "./editorialSeedCatalog.js";

export {
  EDITORIAL_CHALLENGE_ARCHETYPES,
  EDITORIAL_DOMAIN_SEEDS,
  resolveEditorialSeed,
  type EditorialChallengeArchetype,
  type EditorialDomainSeed,
  type EditorialMascotPose,
  type EditorialSubjectSeed,
};

/**
 * Applies editorial design principles and diversified domain/archetype seeds to a thumbnail plan.
 */
export function applyEditorialDesign(plan: QuizThumbnailPlan, input: ResolveThumbnailInput): QuizThumbnailPlan {
  const seed = resolveEditorialSeed(input);
  const isComparison = seed.design.template === "comparison" && seed.design.candidateCount === 2;
  const isOdd = seed.design.template === "comparison" && seed.design.candidateCount === 4;

  const defaultHook = input.customHookText || (input.editorialFallback ? seed.hookText : plan.hookText);
  const subjectsToUse = input.editorialFallback && seed.subjectAnchors.length > 0 ? seed.subjectAnchors : plan.subjectAnchors;

  let resolvedProp = plan.mascotPersona?.prop;
  let resolvedExpression = plan.mascotPersona?.expression;
  let resolvedPose = plan.mascotPersona?.poseDescription;

  // If in fallback mode or if mascot is missing/defaulting, use diversified pose
  if (input.editorialFallback || !resolvedPose) {
    resolvedProp = seed.mascotPose.prop;
    resolvedExpression = seed.mascotPose.expression;
    resolvedPose = seed.mascotPose.poseDescription;
  }

  // Preserve AI planner's custom subjects and layout by clearing seed-specific spatial composition when not in fallback
  const editorialDesign = input.editorialFallback
    ? seed.design
    : {
        ...seed.design,
        spatialComposition: undefined,
      };

  return {
    ...plan,
    layout: input.layoutOverride || (isOdd ? "odd_one_out" : isComparison ? "split_vs" : plan.layout),
    hookText: sanitizeThumbnailHook(defaultHook),
    badgeText: input.badgeOverride && input.badgeOverride !== "auto" ? plan.badgeText : "",
    subjectAnchors: subjectsToUse.slice(0, isComparison ? 2 : 1).map(({ label, visualPrompt }) => ({ label, visualPrompt })),
    mascotPersona: {
      ...plan.mascotPersona,
      prop: resolvedProp || "none",
      expression: resolvedExpression || "curious",
      poseDescription: resolvedPose || "looking toward the puzzle",
    },
    editorial: editorialDesign,
  };
}
