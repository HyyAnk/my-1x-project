import type { IntroOutroScriptContent, IntroOutroValidationIssue, MascotStyleIdentityProfile } from "@studio/shared";

const ACTION_REQUIREMENTS = {
  wave: "waving",
  point: "pointing",
  smile: "facial_expression",
  slide: "locomotion",
  dive: "locomotion",
  bounce: "locomotion",
  chase: "locomotion",
  superhero_land: "locomotion",
} as const;

/** Structured capability contradictions are blockers; prose heuristics are not choreography rules. */
export function validateCreativeChoreography(
  content: IntroOutroScriptContent,
  identity: MascotStyleIdentityProfile,
): IntroOutroValidationIssue[] {
  return content.timeline.flatMap((beat, index): IntroOutroValidationIssue[] => {
    const action = beat.choreography?.primary_action;
    const capability = ACTION_REQUIREMENTS[action as keyof typeof ACTION_REQUIREMENTS];
    if (!capability || identity.capabilities[capability] === "supported") return [];
    const unsupported = identity.capabilities[capability] === "unsupported";
    return [
      {
        code: unsupported ? "CAPABILITY_REFERENCE_UNSUPPORTED" : "CAPABILITY_REVIEW",
        severity: unsupported ? "error" : "warning",
        path: `timeline.${index}.choreography`,
        message: unsupported
          ? `The selected action requires unsupported ${capability}.`
          : `Confirm ${capability} against the reference for this action.`,
      },
    ];
  });
}
