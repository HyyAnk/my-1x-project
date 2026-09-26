import type { PairGenerationAnchor, ScriptGenerationInput } from "./generation.types.js";

export function pairGenerationAnchor(
  input: Pick<ScriptGenerationInput, "context" | "identity" | "companionContent">,
): PairGenerationAnchor {
  const companion = input.companionContent;
  if (companion?.production_directions)
    return {
      style: companion.style,
      music_direction: companion.audio.music_direction,
      logo_placement: companion.production_directions.logo_placement,
    };
  return {
    style: {
      description:
        input.identity.style_description.length <= 180
          ? input.identity.style_description
          : "Match the supplied mascot reference style, surface materials and rendering treatment",
      palette: input.identity.palette,
      staging: "A clean branded stage with soft frontal lighting, mascot centered and clear negative space",
      motion_language: "Playful, readable single actions with gentle follow-through and a settled final pose",
    },
    music_direction: "A bright playful quiz motif, quiet beneath the same cheerful mascot voice",
    logo_placement: input.context.logoReference ? "Official logo beside the mascot, fully readable with 6% edge clearance" : "No logo",
  };
}
