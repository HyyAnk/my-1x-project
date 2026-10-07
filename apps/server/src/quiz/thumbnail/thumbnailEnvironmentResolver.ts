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
export function resolveFallbackEnvironment(
  topicLower: string,
  topicTitle: string,
): { environmentAtmosphere: string; lightingPalette: string } {
  // 1. Culinary & Bakery
  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("dessert") ||
    topicLower.includes("culinary") ||
    topicLower.includes("food") ||
    topicLower.includes("cooking") ||
    topicLower.includes("chef")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in soft pastel honey-peach and cream gradient, with a cozy golden center spotlight halo behind subjects, gentle flour sparkle dust orbs, generous clean negative space, and zero background kitchen furniture or clutter",
      lightingPalette:
        "Warm amber and golden honey glow, bright luminous rim light on characters and pastries, soft natural contact shadows, zero background visual noise",
    };
  }

  // 2. Supercars & Racing
  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("racing") ||
    topicLower.includes("racecar") ||
    topicLower.includes("motorsport")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in sleek graphite and electric orange gradient, with a brilliant center spotlight halo, subtle neon light-streak bokeh, generous clean negative space, and zero background garage or pit clutter",
      lightingPalette: "Bright daylight sunbeams, dramatic metallic highlights, and vibrant neon track rim lights",
    };
  }

  // 3. Space & Astronomy
  if (
    topicLower.includes("space") ||
    topicLower.includes("astronomy") ||
    topicLower.includes("universe") ||
    topicLower.includes("cosmos") ||
    topicLower.includes("planet") ||
    topicLower.includes("galaxy") ||
    topicLower.includes("mars") ||
    topicLower.includes("jupiter") ||
    topicLower.includes("saturn") ||
    topicLower.includes("solar system") ||
    topicLower.includes("orbit")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in deep cerulean and cosmic midnight indigo gradient, with a radiant cyan-magenta center spotlight halo, subtle stardust particle bokeh, generous clean negative space, and zero background room clutter",
      lightingPalette: "Luminous cyan and magenta rim lighting, soft glowing ambient starlight, zero muddy darkness",
    };
  }

  // 4. Medical, First Aid & Healthcare
  if (
    topicLower.includes("clinic") ||
    topicLower.includes("first aid") ||
    topicLower.includes("medical") ||
    topicLower.includes("hospital") ||
    topicLower.includes("doctor") ||
    topicLower.includes("nurse") ||
    topicLower.includes("healthcare") ||
    topicLower.includes("ambulance") ||
    topicLower.includes("surgery") ||
    topicLower.includes("救急") ||
    topicLower.includes("医療")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in soft soothing pastel mint-teal gradient, with a gentle warm center spotlight halo behind subjects, ethereal floating light orbs, generous clean negative space, and zero background furniture, shelves, or clutter",
      lightingPalette:
        "Crisp warm daylight with soft clinical fill, luminous turquoise rim light on characters and props, sparkling specular highlights, zero sterile shadows",
    };
  }

  // 5. Gaming, Arcade & Esports
  if (
    topicLower.includes("gaming") ||
    topicLower.includes("arcade") ||
    topicLower.includes("nintendo") ||
    topicLower.includes("playstation") ||
    topicLower.includes("minecraft") ||
    topicLower.includes("roblox") ||
    topicLower.includes("fortnite") ||
    topicLower.includes("esports") ||
    topicLower.includes("game")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in deep indigo and electric purple gradient, with a glowing neon cyan center spotlight halo, subtle floating arcade particle bokeh, generous clean negative space, and zero background cabinets or furniture clutter",
      lightingPalette:
        "Vibrant neon magenta key, electric cyan rim lighting, warm tungsten bounce fill, glossy specular reflections",
    };
  }

  // 6. Prehistoric & Dinosaurs
  if (
    topicLower.includes("dinosaur") ||
    topicLower.includes("dino") ||
    topicLower.includes("fossil") ||
    topicLower.includes("jurassic") ||
    topicLower.includes("t-rex") ||
    topicLower.includes("prehistoric") ||
    topicLower.includes("triceratops")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in warm emerald and earthy amber gradient, with a soft golden sunbeam center spotlight halo, gentle prehistoric amber dust orbs, generous clean negative space, and zero background foliage or landscape clutter",
      lightingPalette:
        "Warm amber sunbeam key, emerald ambient bounce, dramatic golden rim light on characters and fossils",
    };
  }

  // 7. Ocean, Marine & Deep Sea
  if (
    topicLower.includes("ocean") ||
    topicLower.includes("marine") ||
    topicLower.includes("sea") ||
    topicLower.includes("underwater") ||
    topicLower.includes("shark") ||
    topicLower.includes("whale") ||
    topicLower.includes("coral") ||
    topicLower.includes("abyss") ||
    topicLower.includes("deep sea") ||
    topicLower.includes("submarine")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in deep luminous azure and aquamarine gradient, with a soft aqua caustic center spotlight halo, gentle floating bubble bokeh, generous clean negative space, and zero background reef clutter",
      lightingPalette:
        "Shimmering aqua caustic key, deep cobalt fill light, radiant cyan rim lighting on characters and sea life, zero muddy darkness",
    };
  }

  // 8. Fantasy, Mythology & Magic
  if (
    topicLower.includes("mythology") ||
    topicLower.includes("dragon") ||
    topicLower.includes("wizard") ||
    topicLower.includes("magic") ||
    topicLower.includes("fantasy") ||
    topicLower.includes("spell") ||
    topicLower.includes("potion")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in enchanting deep violet and starry amethyst gradient, with a magical golden center spotlight halo, soft floating starlight orbs, generous clean negative space, and zero background room clutter",
      lightingPalette:
        "Mystical amethyst key light, warm gold edge backlight, enchanting ambient luminescence, zero dark shadows",
    };
  }

  // 9. Science & Laboratory
  if (
    topicLower.includes("science") ||
    topicLower.includes("physics") ||
    topicLower.includes("chemistry") ||
    topicLower.includes("biology") ||
    topicLower.includes("laboratory") ||
    topicLower.includes("scientist") ||
    topicLower.includes("experiment") ||
    topicLower.includes("atom") ||
    topicLower.includes("dna") ||
    topicLower.includes("molecule")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in sleek cool slate and cyan gradient, with a crisp volumetric center spotlight halo, subtle floating holographic particle bokeh, generous clean negative space, and zero background lab equipment or furniture clutter",
      lightingPalette:
        "Cool crisp daylight key, electric cyan rim lighting, vibrant volumetric glow through glassware, crisp natural shadows",
    };
  }

  // 10. History, Ancient Civilizations & Architecture
  if (
    topicLower.includes("ancient") ||
    topicLower.includes("empire") ||
    topicLower.includes("civilization") ||
    topicLower.includes("egypt") ||
    topicLower.includes("pharaoh") ||
    topicLower.includes("pyramid") ||
    topicLower.includes("roman") ||
    topicLower.includes("medieval") ||
    topicLower.includes("dynasty") ||
    topicLower.includes("knight") ||
    topicLower.includes("samurai")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in majestic warm ochre and terracotta gradient, with a warm torchlight center spotlight halo, soft floating golden dust orbs, generous clean negative space, and zero background pillar or stone clutter",
      lightingPalette:
        "Dramatic warm torchlight key, deep ochre ambient fill, shimmering golden rim lighting on artifacts and characters",
    };
  }

  // 11. School & Education
  if (
    topicLower.includes("school") ||
    topicLower.includes("classroom") ||
    topicLower.includes("student") ||
    topicLower.includes("teacher") ||
    topicLower.includes("campus") ||
    topicLower.includes("homework") ||
    topicLower.includes("academy")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in cheerful warm pastel yellow and soft cream gradient, with a bright morning sunbeam center spotlight halo, subtle floating colorful bokeh orbs, generous clean negative space, and zero background desks or furniture clutter",
      lightingPalette:
        "Bright sunny morning window key, soft pastel yellow fill, cheerful warm rim light on characters and school props",
    };
  }

  // 12. Wildlife & Animals
  if (
    topicLower.includes("animal") ||
    topicLower.includes("wildlife") ||
    topicLower.includes("safari") ||
    topicLower.includes("creature") ||
    topicLower.includes("mammal") ||
    topicLower.includes("zoo")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in warm golden savannah sunset gradient, with a radiant amber center spotlight halo, soft floating golden dusk bokeh, generous clean negative space, and zero background tree or landscape clutter",
      lightingPalette:
        "Warm golden hour key light, soft savannah grass bounce, dramatic rim light on character silhouettes, zero muddy darkness",
    };
  }

  // 13. Detective & Mystery
  if (
    topicLower.includes("detective") ||
    topicLower.includes("mystery") ||
    topicLower.includes("sleuth") ||
    topicLower.includes("clue") ||
    topicLower.includes("sherlock")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in moody deep emerald and slate gradient, with a warm amber tungsten center spotlight halo, subtle soft mystery haze bokeh, generous clean negative space, and zero background bookshelf or furniture clutter",
      lightingPalette:
        "Warm tungsten desk lamp key, cozy amber fill, crisp mysterious rim light accentuating character outlines",
    };
  }

  // 14. Sports & Athletics
  if (
    topicLower.includes("sport") ||
    topicLower.includes("football") ||
    topicLower.includes("soccer") ||
    topicLower.includes("basketball") ||
    topicLower.includes("champion") ||
    topicLower.includes("tournament") ||
    topicLower.includes("stadium")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in energetic royal blue and vibrant gold gradient, with a bright stadium floodlight center spotlight halo, subtle floating celebratory confetti bokeh, generous clean negative space, and zero background crowd clutter",
      lightingPalette:
        "Bright stadium floodlight key, energetic team color bounce, sparkling rim light on athletic gear and characters",
    };
  }

  // 15. Cinema & Entertainment
  if (
    topicLower.includes("movie") ||
    topicLower.includes("cinema") ||
    topicLower.includes("film") ||
    topicLower.includes("hollywood") ||
    topicLower.includes("director") ||
    topicLower.includes("oscar")
  ) {
    return {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in glamorous deep burgundy and champagne gradient, with a warm golden Hollywood spotlight center halo, soft sparkling awards bokeh, generous clean negative space, and zero background room clutter",
      lightingPalette:
        "Warm golden Hollywood spotlight key, soft champagne fill, sparkling rim light, zero muddy darkness",
    };
  }

  // Universal Fallback
  return {
    environmentAtmosphere: `Clean minimalist curved 3D Pixar studio cyclorama backdrop tailored to ${resolveTopicEnvironmentSubject(topicTitle)} in cheerful warm pastel gradient, with a soft center spotlight halo, gentle ambient light orbs, generous clean negative space, and zero background furniture or structural clutter`,
    lightingPalette:
      "Soft warm three-point cinematic studio lighting, bright luminous rim lighting on subjects, soft natural contact shadows, zero muddy darkness",
  };
}
