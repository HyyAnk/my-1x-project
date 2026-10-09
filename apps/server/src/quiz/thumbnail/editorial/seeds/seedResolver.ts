import type { QuizSubjectAnchor, ResolveThumbnailInput } from "../../thumbnailTypes.js";
import type { EditorialThumbnailDesign } from "../editorialTypes.js";
import { EDITORIAL_CHALLENGE_ARCHETYPES } from "./archetypeSeeds.js";
import { EDITORIAL_DOMAIN_SEEDS } from "./index.js";
import type { EditorialMascotPose, EditorialSubjectSeed } from "./seedTypes.js";
import { containsAnyKeyword, containsKeyword } from "../../utils/keywordMatch.js";
import { isVerdictChoicePair, isVerdictFormat } from "../../utils/verdictChoices.js";

/** A comparison thumbnail needs two real candidates, not a True/False or Yes/No answer pair. */
function hasTwoPicturedCandidates(input: ResolveThumbnailInput): boolean {
  const choices = input.questions?.[0]?.choices;
  return choices?.length === 2 && !isVerdictFormat(input.questionFormat) && !isVerdictChoicePair(choices);
}

/**
 * Resolves the optimal editorial seed based on the episode topic, questions, and layout constraints.
 */
export function resolveEditorialSeed(input: ResolveThumbnailInput): {
  design: EditorialThumbnailDesign;
  hookText: string;
  subjectAnchors: QuizSubjectAnchor[];
  mascotPose: EditorialMascotPose;
} {
  const comparison = input.layoutOverride === "split_vs" || (!input.layoutOverride && hasTwoPicturedCandidates(input));
  const odd = input.layoutOverride === "odd_one_out";
  const mystery = input.layoutOverride === "mystery_silhouette";

  const context = `${input.topicTitle} ${input.topicSummary || ""} ${input.questions?.map((q) => q.question).join(" ") || ""}`.toLowerCase();
  const matchedDomain = resolveHighestScoringDomain(input.topicTitle, input.topicSummary || "", context);

  // 1. Comparison layout (split_vs / Real vs Fake)
  if (comparison) {
    const archetype = EDITORIAL_CHALLENGE_ARCHETYPES.real_vs_fake!;
    const foodOrFruit = matchedDomain?.id === "food_gastronomy" ? matchedDomain.subjects[0] : undefined;
    const subject = foodOrFruit || {
      label: "Comparison",
      hook: archetype.defaultHook,
      visualPrompt:
        "two nearly identical real-world objects labeled A and B placed side by side on a clean studio table under crisp directional keylight; exactly one possesses an authentic natural flaw revealing the genuine original",
      mascotPose: archetype.mascotPose,
      background: archetype.background,
      backgroundAtmosphere: archetype.backgroundAtmosphere,
      spatialComposition: archetype.spatialComposition,
    };
    return {
      design: {
        version: 1,
        template: "comparison",
        background: subject.background || archetype.background,
        candidateCount: 2,
        backgroundAtmosphere: subject.backgroundAtmosphere || archetype.backgroundAtmosphere,
        spatialComposition: subject.spatialComposition || archetype.spatialComposition,
      },
      hookText: input.customHookText || subject.hook || archetype.defaultHook,
      subjectAnchors: [
        { label: "Option A", visualPrompt: subject.visualPrompt },
        { label: "Option B", visualPrompt: subject.visualPrompt },
      ],
      mascotPose: subject.mascotPose || archetype.mascotPose,
    };
  }

  // 2. Odd-one-out layout
  if (odd) {
    const archetype = EDITORIAL_CHALLENGE_ARCHETYPES.odd_one_out!;
    const wildlifeOdd = matchedDomain?.subjects.find((s) => s.label.includes("Odd"));
    const subject = wildlifeOdd || {
      label: "Odd Item",
      hook: archetype.defaultHook,
      visualPrompt:
        "four nearly identical vibrant organic subjects labeled A, B, C, D arranged cleanly in a row on a bright studio surface; subject C displays a subtle natural pattern variation",
      mascotPose: archetype.mascotPose,
      background: archetype.background,
      backgroundAtmosphere: archetype.backgroundAtmosphere,
      spatialComposition: archetype.spatialComposition,
    };
    return {
      design: {
        version: 1,
        template: "comparison",
        background: subject.background || archetype.background,
        candidateCount: 4,
        backgroundAtmosphere: subject.backgroundAtmosphere || archetype.backgroundAtmosphere,
        spatialComposition: subject.spatialComposition || archetype.spatialComposition,
      },
      hookText: input.customHookText || subject.hook || archetype.defaultHook,
      subjectAnchors: [{ label: subject.label, visualPrompt: subject.visualPrompt }],
      mascotPose: subject.mascotPose || archetype.mascotPose,
    };
  }

  // 3. Matched domain
  if (matchedDomain) {
    const specificSubject = findBestMatchingSubject(matchedDomain.subjects, context);
    return {
      design: {
        version: 1,
        template: matchedDomain.preferredTemplate,
        background: specificSubject.background || matchedDomain.background,
        candidateCount: matchedDomain.preferredTemplate === "comparison" ? 2 : 0,
        backgroundAtmosphere: specificSubject.backgroundAtmosphere || matchedDomain.backgroundAtmosphere,
        spatialComposition: specificSubject.spatialComposition,
      },
      hookText: input.customHookText || specificSubject.hook,
      subjectAnchors: [{ label: specificSubject.label, visualPrompt: specificSubject.visualPrompt }],
      mascotPose: specificSubject.mascotPose,
    };
  }

  // 4. Default fallback: Extreme Macro Mystery
  const defaultArchetype = EDITORIAL_CHALLENGE_ARCHETYPES.extreme_macro!;
  return {
    design: {
      version: 1,
      template: defaultArchetype.template,
      background: defaultArchetype.background,
      candidateCount: defaultArchetype.candidateCount,
      backgroundAtmosphere: defaultArchetype.backgroundAtmosphere,
      spatialComposition: defaultArchetype.spatialComposition,
    },
    hookText: input.customHookText || defaultArchetype.defaultHook,
    subjectAnchors: [
      {
        label: "Mystery Subject",
        visualPrompt:
          "hyper-realistic macro photography of a tactile authentic real-world artifact with intricate organic textures, crisp directional key lighting and deep midnight blue studio background",
      },
    ],
    mascotPose: defaultArchetype.mascotPose,
  };
}

/**
 * Finds the highest-scoring domain based on weighted matches across title, summary, and context.
 */
function resolveHighestScoringDomain(title: string, summary: string, context: string) {
  let bestDomain = undefined;
  let highestScore = 0;

  for (const domain of EDITORIAL_DOMAIN_SEEDS) {
    let score = 0;
    const globalPattern = new RegExp(domain.pattern.source, "gi");
    const titleMatches = title.match(globalPattern);
    if (titleMatches) {
      score += titleMatches.length * 5;
    }
    const summaryMatches = summary.match(globalPattern);
    if (summaryMatches) {
      score += summaryMatches.length * 2;
    }
    const contextMatches = context.match(globalPattern);
    if (contextMatches) {
      score += contextMatches.length;
    }

    if (score > highestScore) {
      highestScore = score;
      bestDomain = domain;
    }
  }

  return highestScore > 0 ? bestDomain : undefined;
}

/**
 * Finds the most relevant subject in a domain by checking keyword intersections or label matches.
 */
function findBestMatchingSubject(subjects: EditorialSubjectSeed[], context: string): EditorialSubjectSeed {
  for (const subject of subjects) {
    if (subject.keywords && containsAnyKeyword(context, subject.keywords)) {
      return subject;
    }
  }
  for (const subject of subjects) {
    if (containsKeyword(context, subject.label)) {
      return subject;
    }
  }
  return subjects[0]!;
}

