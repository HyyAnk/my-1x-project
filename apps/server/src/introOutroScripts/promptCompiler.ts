import type { CreativeSeed, IntroOutroClipKind, IntroOutroScriptContent, MascotStyleIdentityProfile } from "@studio/shared";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";

import { buildPairGenerationPrompt } from "./pairGenerationPrompt.js";

export { compileProductionPrompt } from "./productionPrompt.js";
export const INTRO_OUTRO_TEMPLATE_VERSION = "intro-outro-script-v8";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function buildScriptGenerationPrompt(params: {
  clipKind: IntroOutroClipKind;
  durationSeconds: number;
  context: ResolvedIntroOutroContext;
  identity: MascotStyleIdentityProfile;
  seeds: readonly CreativeSeed[];
  companionContent?: IntroOutroScriptContent;
  logoMode?: "post_overlay" | "supplied_reference" | "none";
}): string {
  return buildPairGenerationPrompt({
    context: params.context,
    identity: params.identity,
    companionContent: params.companionContent,
    clips: [params],
  });
}

export function mergeGeneratedContent(params: {
  raw: Record<string, unknown>;
  clipKind: IntroOutroClipKind;
  durationSeconds: number;
  identity: MascotStyleIdentityProfile;
}): Record<string, unknown> {
  const { raw, clipKind, durationSeconds, identity } = params;
  const rawConsistency = raw.consistency && typeof raw.consistency === "object" ? (raw.consistency as Record<string, unknown>) : {};
  const requiredFeatures = identity.features.map((feature) => feature.id);
  return {
    ...raw,
    production: { clip_kind: clipKind, language: "English", aspect_ratio: "16:9", target_duration_seconds: durationSeconds },
    identity: {
      profile_id: identity.profile_id,
      mascot_id: identity.mascot_id,
      mascot_style_id: identity.mascot_style_id,
      required_feature_ids: requiredFeatures,
    },
    consistency: {
      ...rawConsistency,
      preserve_feature_ids: requiredFeatures,
      allowed_visible_text: stringArray(rawConsistency.allowed_visible_text),
      restrictions: stringArray(rawConsistency.restrictions).length
        ? stringArray(rawConsistency.restrictions)
        : identity.motion_constraints,
    },
  } satisfies Partial<IntroOutroScriptContent>;
}
