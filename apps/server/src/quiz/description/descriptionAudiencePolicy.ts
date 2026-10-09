import type { VideoDescriptionScoringCta } from "@studio/shared";
import type { DescriptionAudiencePolicy } from "./description.types.js";
import { getDescriptionSectionLocale } from "./descriptionSectionLocales.js";

/** Age bands that target children under 13, which COPPA treats as "Made for Kids". */
const CHILD_DIRECTED_AGE_BANDS = new Set(["4-6", "7-9", "10-12"]);

/**
 * Recommends the YouTube audience setting from the episode age band.
 * Made for Kids videos have comments disabled, so comment CTAs become dead ends.
 */
export function resolveAudiencePolicy(ageBand?: string | null): DescriptionAudiencePolicy {
  const madeForKids = Boolean(ageBand && CHILD_DIRECTED_AGE_BANDS.has(ageBand));
  return { madeForKids, commentsEnabled: !madeForKids };
}

/**
 * Replaces comment-seeking CTAs with a play-along CTA when comments are unavailable.
 */
export function enforceAudienceCta(
  scoringCta: VideoDescriptionScoringCta,
  policy: DescriptionAudiencePolicy,
  language?: string,
): VideoDescriptionScoringCta {
  if (policy.commentsEnabled) return scoringCta;
  const locale = getDescriptionSectionLocale(language);
  if (!locale.commentRequestPattern.test(scoringCta.cta_text)) return scoringCta;
  return { ...scoringCta, cta_text: locale.kidsCtaText };
}

export function describeAudienceCtaRule(policy: DescriptionAudiencePolicy): string {
  return policy.commentsEnabled
    ? "Invite viewers to share their score in the comments."
    : "This video is Made for Kids, so YouTube disables comments. NEVER ask viewers to comment. Invite them to keep score, pause and guess, or challenge their family instead.";
}
