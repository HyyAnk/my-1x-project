import { THUMBNAIL_ENVIRONMENT_PRESETS, type ThumbnailEnvironment } from "./thumbnailEnvironmentPresets.js";
import { sanitizeThumbnailHook, validateThumbnailHook, DEFAULT_FALLBACK_HOOK } from "./thumbnailHookGuardrail.js";

/**
 * Resolves a concise, punchy subject name for background environments,
 * preventing long 8+ word topic titles from polluting thumbnail prompts.
 */
export function resolveTopicEnvironmentSubject(topicTitle: string): string {
  if (!topicTitle) return "the trivia challenge";
  const validation = validateThumbnailHook(topicTitle);
  if (validation.valid) {
    return validation.normalized.toLowerCase();
  }
  const split = topicTitle.split(/[:|—–-]/)[0]?.trim();
  if (split) {
    const splitVal = validateThumbnailHook(split);
    if (splitVal.valid) {
      return splitVal.normalized.toLowerCase();
    }
  }
  const condensed = sanitizeThumbnailHook(topicTitle, "");
  if (condensed && condensed !== DEFAULT_FALLBACK_HOOK) {
    return condensed.toLowerCase();
  }
  return "the quiz subject";
}

/**
 * Resolves minimalist, high-contrast curved 3D Pixar studio cyclorama backdrops
 * and harmonized cinematic lighting palettes tailored to the episode's subject domain.
 * Strictly eliminates background furniture, shelves, and structural clutter to maximize
 * figure-ground separation and make the Hero 3D subject, Mascot, and Typography pop.
 */
export function resolveFallbackEnvironment(topicLower: string, topicTitle: string): ThumbnailEnvironment {
  const preset = THUMBNAIL_ENVIRONMENT_PRESETS.find((candidate) =>
    candidate.keywords.some((keyword) => topicLower.includes(keyword)),
  );
  if (preset) {
    return { ...preset.environment };
  }

  // Universal Fallback
  return {
    environmentAtmosphere: `Clean minimalist curved 3D Pixar studio cyclorama backdrop tailored to ${resolveTopicEnvironmentSubject(topicTitle)} in cheerful warm pastel gradient, with a soft center spotlight halo, gentle ambient light orbs, generous clean negative space, and zero background furniture or structural clutter`,
    lightingPalette:
      "Soft warm three-point cinematic studio lighting, bright luminous rim lighting on subjects, soft natural contact shadows, zero muddy darkness",
  };
}
