import type { CreativeSeed, IntroOutroClipKind, IntroOutroScriptContent, MascotStyleIdentityProfile } from "@studio/shared";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";

export { compileProductionPrompt } from "./productionPrompt.js";
export const INTRO_OUTRO_TEMPLATE_VERSION = "intro-outro-script-v4";

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
  const { clipKind, durationSeconds, context, identity, seeds } = params;
  const beatRoles = clipKind === "intro" ? ["entrance", "brand_interaction", "handoff"] : ["recognition", "invitation", "farewell"];
  const allowedText = [...new Set(seeds.flatMap((seed) => seed.allowed_text))];
  const firstEnd = Number((durationSeconds * 0.32).toFixed(2));
  const secondEnd = Number((durationSeconds * 0.72).toFixed(2));
  const voiceEnd = Number((durationSeconds * 0.6).toFixed(2));

  const effectiveLogoMode = params.logoMode ?? (context.logoReference ? "supplied_reference" : "none");

  let logoRule: string;
  let defaultLogoPlacement: string;
  if (effectiveLogoMode === "supplied_reference" && context.logoReference) {
    logoRule = `LOGO IN-SCENE 3D REVEAL (supplied_reference):
- The official channel logo image is attached as 'channel_logo'. It is an EXACT in-scene 3D visual element.
- In beat 2 (brand interaction) or transitioning into beat 3, reveal the intact official logo dynamically in the center of the frame (or framed symmetrically/heroically by the mascot), emerging with high energy (e.g. popping out from a burst of stars/confetti/sparkles or an energy pulse, accompanied by a satisfying cartoon bounce/impact).
- CRITICAL BRAND FIDELITY: Do NOT alter, redesign, warp, or respell the logo typography. Recreate the intact logo asset faithfully.
- The ONLY visible text allowed in the entire video is the supplied official logo text. No subtitles, no random letters, no watermark.`;
    defaultLogoPlacement = "Center frame, framed by mascot";
  } else if (effectiveLogoMode === "post_overlay" && context.logoReference) {
    logoRule =
      "Default logo_mode is post_overlay: reserve a stable upper-right screen-space area, at least 6% from edges. The supplied logo will be composited there in an editor, never generated. Describe the reveal timing as an editorial instruction, not a generated object. No particles obscure this reserved area.";
    defaultLogoPlacement = "Upper-right reserved overlay area, minimum 6% inset";
  } else {
    logoRule = "No channel logo is attached. Do not invent, spell, or render a logo.";
    defaultLogoPlacement = "No logo";
  }

  const voiceDefault = identity.capabilities.speech === "supported" ? "mascot" : "narrator";

  return `Create one structured ${clipKind} script for an entertaining family quiz channel. Return one JSON object only, without Markdown.

HARD RULES
- Duration is exactly ${durationSeconds.toFixed(1)} seconds in 16:9 widescreen.
- Use exactly three contiguous narrative beats: ${beatRoles.join(", ")}.
- Allocate beat times to actual kinetic actions sharing the same clock. Return real positive durations, not placeholder zeros. End exactly at ${durationSeconds} seconds.
- capability_ids must name every reviewed capability actually used by the action. Any walk, step, bounce, slide, jump, dash, weight shift, entrance, exit or whole-body travel requires locomotion. A wave requires waving; pointing or presenting with a limb requires pointing; holding an item requires grasping or hold_props. Do not describe a capability that is absent from capability_ids.
- In beat 3, all kinetic movement must settle smoothly into a confident hero pose at least 0.75 seconds before the end, holding a stable hero frame through the final beat for a clean cut into the episode.
- Preserve the attached mascot_subject exactly in its selected style. Never invent anatomy, remove features, change colors, or add permanent costume.
- Rigid surfaces retain their exact shape; evidenced articulated joints may rotate without stretching.
- For flexible/cartoon mascots: use squash-and-stretch, comical slides, and exaggerated reaction physics suited to the style. For cybernetic/robotic mascots: use snappy mechanical articulation and glowing energy cues without deforming rigid plates or accessories.
- Preserve all features, but list visible_feature_ids only for features actually visible at that angle. Left/right means the character's anatomical side, never screen side.
- Required feature preservation IDs: ${
    identity.features
      .filter((feature) => feature.importance !== "supporting")
      .map((feature) => feature.id)
      .join(", ") || "none"
  }.
- ${logoRule}
- Allowed visible text: ${allowedText.length ? allowedText.join(", ") : effectiveLogoMode === "supplied_reference" ? "none except text already inside the supplied intact logo" : "none"}.
- Spoken language is English. Spoken lines must finish before the final hold.
- Default voice_source is ${voiceDefault}. When narrator is used, narration is off-screen without mascot lip-sync. When mascot is used, keep dialogue punchy (e.g. short catchphrases like "Let's Quiz!").
- SFX must match the action timing with rhythmic onomatopoeic cues (e.g. WHOOSH, SKID, POP, BOOM, BOING, CHIME). Start final musical decay early enough to finish before clip end.
- Default reference_mode is character_reference.

CINEMATOGRAPHY & PACING
- Use fast-paced, entertaining, and readable cinematography: quick tracking for dynamic entrances/chases, subtle reaction push-ins on comic beats, and a decisive punch-in on the final mascot + logo hero frame.
- Keep the composition balanced and readable. No disorienting shaky cam, wild spinning, or excessive motion blur.

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
  "production_directions":{"reference_mode":"character_reference","logo_mode":"${effectiveLogoMode}","voice_source":"${voiceDefault}","logo_placement":"${defaultLogoPlacement}","opening_state":"...","closing_state":"...","end_hold_seconds":0.75},
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
