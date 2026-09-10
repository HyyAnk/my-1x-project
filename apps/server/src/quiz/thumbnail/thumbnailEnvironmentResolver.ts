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
 * Resolves fallback vibrant environment and lighting palette for family/kids Pixar aesthetic.
 */
export function resolveFallbackEnvironment(
  topicLower: string,
  topicTitle: string,
): { environmentAtmosphere: string; lightingPalette: string } {
  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("dessert") ||
    topicLower.includes("culinary")
  ) {
    return {
      environmentAtmosphere:
        "Warm cozy bakery kitchen with soft warm golden oven glow and gentle flour dust sparkles in soft depth of field",
      lightingPalette:
        "Warm amber and golden honey glow, bright luminous rim light on characters and pastries, soft natural contact shadows",
    };
  }
  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("racing") ||
    topicLower.includes("racecar")
  ) {
    return {
      environmentAtmosphere:
        "Vibrant high-tech racing paddock and sunny speedway stadium with celebratory confetti and soft depth of field",
      lightingPalette: "Bright daylight sunbeams, dramatic metallic highlights, and vibrant neon track rim lights",
    };
  }
  if (
    topicLower.includes("space") ||
    topicLower.includes("astronomy") ||
    topicLower.includes("universe") ||
    topicLower.includes("cosmos") ||
    topicLower.includes("planet")
  ) {
    return {
      environmentAtmosphere:
        "Magical deep cerulean and indigo cosmic nebula with glowing stardust particles and colorful crescent moons in soft depth of field",
      lightingPalette: "Luminous cyan and magenta rim lighting, soft glowing ambient starlight, zero muddy darkness",
    };
  }
  return {
    environmentAtmosphere: `Vibrant, colorful, family-friendly Pixar 3D studio environment tailored to ${resolveTopicEnvironmentSubject(topicTitle)} with soft atmospheric depth of field and cheerful bright colors`,
    lightingPalette:
      "Soft warm three-point cinematic studio lighting, bright luminous rim lighting on subjects, soft natural contact shadows, zero muddy darkness",
  };
}
