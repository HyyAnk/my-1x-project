import type { CreativeSeed, IntroOutroClipKind, IntroOutroScriptContent, MascotStyleIdentityProfile } from "@studio/shared";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";

export { compileProductionPrompt } from "./productionPrompt.js";
export const INTRO_OUTRO_TEMPLATE_VERSION = "intro-outro-script-v3";

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
}): string {
  const { clipKind, durationSeconds, context, identity, seeds } = params;
  const beatRoles = clipKind === "intro" ? ["entrance", "brand_interaction", "handoff"] : ["recognition", "invitation", "farewell"];
  const allowedText = [...new Set(seeds.flatMap((seed) => seed.allowed_text))];
  const firstEnd = Number((durationSeconds * 0.3).toFixed(2));
  const secondEnd = Number((durationSeconds * 0.7).toFixed(2));
  const voiceEnd = Number((durationSeconds * 0.58).toFixed(2));
  const logoRule = context.logoReference
    ? "Default logo_mode is post_overlay: reserve a stable upper-right screen-space area, at least 6% from edges. The supplied logo will be composited there in an editor, never generated. Describe the reveal timing as an editorial instruction, not a generated object. No particles obscure this reserved area."
    : "No channel logo is attached. Do not invent, spell, or render a logo.";

  return `Create one structured ${clipKind} script for a family quiz channel. Return one JSON object only, without Markdown.

HARD RULES
- Duration is exactly ${durationSeconds.toFixed(1)} seconds in 16:9.
- Use exactly three contiguous narrative beats: ${beatRoles.join(", ")}.
- Allocate beat times to the actual actions; all beats, camera, voice and sounds share the same clock. Return real positive durations, not placeholder zeros. End exactly at ${durationSeconds} seconds. Times will NOT be rewritten.
- One principal action per beat, no more than one movable prop per beat, and restrained camera motion.
- capability_ids must name every reviewed capability actually used by the action. Any walk, step, bounce, weight shift, entrance, exit or other whole-body travel requires locomotion. A wave requires waving; pointing or presenting with a limb requires pointing. Do not describe a capability that is absent from capability_ids.
- Limit action text to 55 words per beat. Secondary follow-through is allowed, but no chains of separate gestures. Avoid touching facial accessories, crossed limbs, rapid turns and occluding signature details.
- For departure seeds, use one continuous supported walk toward the destination with a static camera, not wave-then-turn-then-run. Complete the walk before the final hold. The settled composition may be an empty stage after the subject exits.
- Camera must remain a single simple shot, preferably locked-off. Its framing must cover the full spatial envelope of every action and agree with the closing state. If the subject departs, describe a static wide stage view that accommodates the departure and final empty-stage hold; never claim the subject remains centered throughout.
- Preserve the attached mascot_subject exactly in its selected style. Never invent anatomy, remove features, change colors, add permanent costume, or imply an unsupported capability.
- Rigid surfaces retain their shape; evidenced articulated joints may rotate without stretching. Flexible does not grant unlimited squash/stretch. Preserve supporting markings and patterns too. Left/right means the character's anatomical side, never screen side.
- Preserve all features, but list visible_feature_ids only for features actually visible at that angle. Occlusion is not deletion; never require front-facing details to remain visible in a rear view.
- Required feature preservation IDs: ${
    identity.features
      .filter((feature) => feature.importance !== "supporting")
      .map((feature) => feature.id)
      .join(", ") || "none"
  }.
- ${logoRule}
- Allowed visible text: ${allowedText.length ? allowedText.join(", ") : "none except text already inside the supplied intact logo"}.
- Spoken language is English. One short voice line is preferred; voiceover may be disabled.
- Default voice_source is narrator (off-screen, no mascot lip-sync). Do not infer speech from a visible mouth. Use 130-160 words/minute with at least 0.3 seconds pause allowance per line; shorten text to fit. Finish speech before the final hold.
- SFX must match the actual action time. Start final chords early enough for their entire decay to finish before clip end. Describe background music ducking under narration.
- Default reference_mode is character_reference: use the mascot as identity reference, not a mandatory first frame. If first_frame is used, the opening pose must match the attached image.
- Do not claim an unknown viewer score or unavailable platform interaction.

PAIR CONTINUITY
${params.companionContent ? JSON.stringify({ style: params.companionContent.style, music_direction: params.companionContent.audio.music_direction, production_directions: params.companionContent.production_directions }) : "Establish a simple reusable stage, lighting and music motif for the pair."}
When a companion is supplied, reuse its style fields and logo placement exactly; keep the music identity but adapt its ending for this clip. Preserve mascot colors from the identity palette; environmental accents must not recolor the character.

CHANNEL AND SELECTED STYLE
${JSON.stringify({
  channel_name: context.channel.display_name,
  target_audience: context.channel.target_audience || "family audience",
  mascot_name: context.mascot.name,
  mascot_style_name: context.style.name,
  mascot_style_keyword: context.style.keyword || null,
  category_id: context.publicContext.style_preset_id,
})}
- Treat these names as production context, not permission to render extra visible text.

MASCOT IDENTITY PROFILE
${JSON.stringify({
  summary: identity.summary,
  morphology: identity.morphology,
  features: identity.features,
  capabilities: identity.capabilities,
  palette: identity.palette,
  motion_constraints: identity.motion_constraints,
  style_description: identity.style_description,
  allowed_accessories: identity.allowed_accessories,
})}

CREATIVE SEEDS
${JSON.stringify(seeds.map((seed) => ({ dimension: seed.dimension, id: seed.id, name: seed.name, intent: seed.narrative_intent, allowed_props: seed.allowed_props })))}

Return exactly this shape:
{
  "production_directions":{"reference_mode":"character_reference","logo_mode":"${context.logoReference ? "post_overlay" : "none"}","voice_source":"narrator","logo_placement":"${context.logoReference ? "Upper-right reserved overlay area, minimum 6% inset" : "No logo"}","opening_state":"...","closing_state":"...","end_hold_seconds":0.75},
  "style":{"description":"...","palette":["..."],"staging":"...","motion_language":"..."},
  "timeline":[
    {"beat":1,"role":"${beatRoles[0]}","start_seconds":0,"end_seconds":${firstEnd},"action":"...","capability_ids":[],"props":[],"visible_feature_ids":[]},
    {"beat":2,"role":"${beatRoles[1]}","start_seconds":${firstEnd},"end_seconds":${secondEnd},"action":"...","capability_ids":[],"props":[],"visible_feature_ids":[]},
    {"beat":3,"role":"${beatRoles[2]}","start_seconds":${secondEnd},"end_seconds":${durationSeconds.toFixed(1)},"action":"...","capability_ids":[],"props":[],"visible_feature_ids":[]}
  ],
  "voiceover":{"enabled":true,"lines":[{"start_seconds":0.5,"end_seconds":${voiceEnd},"text":"...","delivery":"..."}]},
  "audio":{"music_direction":"...","events":[{"at_seconds":0,"direction":"..."}]},
  "camera":[{"start_seconds":0,"end_seconds":${durationSeconds.toFixed(1)},"framing":"...","movement":"..."}],
  "consistency":{"allowed_visible_text":[],"restrictions":["..."]}
}`;
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
