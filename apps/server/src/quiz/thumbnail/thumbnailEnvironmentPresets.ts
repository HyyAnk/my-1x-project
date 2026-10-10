export interface ThumbnailEnvironment {
  environmentAtmosphere: string;
  lightingPalette: string;
}

export interface ThumbnailEnvironmentPreset {
  keywords: readonly string[];
  environment: ThumbnailEnvironment;
}

/**
 * Minimalist, high-contrast curved 3D Pixar studio cyclorama backdrops and harmonized cinematic
 * lighting palettes, checked in order against the lower-cased topic text.
 */
export const THUMBNAIL_ENVIRONMENT_PRESETS: readonly ThumbnailEnvironmentPreset[] = [
  // 1. Culinary & Bakery
  {
    keywords: ["bake", "cookie", "biscuit", "pastry", "dessert", "culinary", "food", "cooking", "chef"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in soft pastel honey-peach and cream gradient, with a cozy golden center spotlight halo behind subjects, gentle flour sparkle dust orbs, generous clean negative space, and zero background kitchen furniture or clutter",
      lightingPalette:
        "Warm amber and golden honey glow, bright luminous rim light on characters and pastries, soft natural contact shadows, zero background visual noise",
    },
  },
  // 2. Supercars & Racing
  {
    keywords: ["supercar", "hypercar", "racing", "racecar", "motorsport"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in sleek graphite and electric orange gradient, with a brilliant center spotlight halo, subtle neon light-streak bokeh, generous clean negative space, and zero background garage or pit clutter",
      lightingPalette: "Bright daylight sunbeams, dramatic metallic highlights, and vibrant neon track rim lights",
    },
  },
  // 3. Space & Astronomy
  {
    keywords: ["space", "astronomy", "universe", "cosmos", "planet", "galaxy", "mars", "jupiter", "saturn", "solar system", "orbit"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in deep cerulean and cosmic midnight indigo gradient, with a radiant cyan-magenta center spotlight halo, subtle stardust particle bokeh, generous clean negative space, and zero background room clutter",
      lightingPalette: "Luminous cyan and magenta rim lighting, soft glowing ambient starlight, zero muddy darkness",
    },
  },
  // 4. Medical, First Aid & Healthcare
  {
    keywords: ["clinic", "first aid", "medical", "hospital", "doctor", "nurse", "healthcare", "ambulance", "surgery", "救急", "医療"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in soft soothing pastel mint-teal gradient, with a gentle warm center spotlight halo behind subjects, ethereal floating light orbs, generous clean negative space, and zero background furniture, shelves, or clutter",
      lightingPalette:
        "Crisp warm daylight with soft clinical fill, luminous turquoise rim light on characters and props, sparkling specular highlights, zero sterile shadows",
    },
  },
  // 5. Gaming, Arcade & Esports
  {
    keywords: ["gaming", "arcade", "nintendo", "playstation", "minecraft", "roblox", "fortnite", "esports", "game"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in deep indigo and electric purple gradient, with a glowing neon cyan center spotlight halo, subtle floating arcade particle bokeh, generous clean negative space, and zero background cabinets or furniture clutter",
      lightingPalette:
        "Vibrant neon magenta key, electric cyan rim lighting, warm tungsten bounce fill, glossy specular reflections",
    },
  },
  // 6. Prehistoric & Dinosaurs
  {
    keywords: ["dinosaur", "dino", "fossil", "jurassic", "t-rex", "prehistoric", "triceratops"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in warm emerald and earthy amber gradient, with a soft golden sunbeam center spotlight halo, gentle prehistoric amber dust orbs, generous clean negative space, and zero background foliage or landscape clutter",
      lightingPalette:
        "Warm amber sunbeam key, emerald ambient bounce, dramatic golden rim light on characters and fossils",
    },
  },
  // 7. Ocean, Marine & Deep Sea
  {
    keywords: ["ocean", "marine", "sea", "underwater", "shark", "whale", "coral", "abyss", "deep sea", "submarine"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in deep luminous azure and aquamarine gradient, with a soft aqua caustic center spotlight halo, gentle floating bubble bokeh, generous clean negative space, and zero background reef clutter",
      lightingPalette:
        "Shimmering aqua caustic key, deep cobalt fill light, radiant cyan rim lighting on characters and sea life, zero muddy darkness",
    },
  },
  // 8. Fantasy, Mythology & Magic
  {
    keywords: ["mythology", "dragon", "wizard", "magic", "fantasy", "spell", "potion"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in enchanting deep violet and starry amethyst gradient, with a magical golden center spotlight halo, soft floating starlight orbs, generous clean negative space, and zero background room clutter",
      lightingPalette:
        "Mystical amethyst key light, warm gold edge backlight, enchanting ambient luminescence, zero dark shadows",
    },
  },
  // 9. Science & Laboratory
  {
    keywords: ["science", "physics", "chemistry", "biology", "laboratory", "scientist", "experiment", "atom", "dna", "molecule"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in sleek cool slate and cyan gradient, with a crisp volumetric center spotlight halo, subtle floating holographic particle bokeh, generous clean negative space, and zero background lab equipment or furniture clutter",
      lightingPalette:
        "Cool crisp daylight key, electric cyan rim lighting, vibrant volumetric glow through glassware, crisp natural shadows",
    },
  },
  // 10. History, Ancient Civilizations & Architecture
  {
    keywords: ["ancient", "empire", "civilization", "egypt", "pharaoh", "pyramid", "roman", "medieval", "dynasty", "knight", "samurai"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in majestic warm ochre and terracotta gradient, with a warm torchlight center spotlight halo, soft floating golden dust orbs, generous clean negative space, and zero background pillar or stone clutter",
      lightingPalette:
        "Dramatic warm torchlight key, deep ochre ambient fill, shimmering golden rim lighting on artifacts and characters",
    },
  },
  // 11. School & Education
  {
    keywords: ["school", "classroom", "student", "teacher", "campus", "homework", "academy"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in cheerful warm pastel yellow and soft cream gradient, with a bright morning sunbeam center spotlight halo, subtle floating colorful bokeh orbs, generous clean negative space, and zero background desks or furniture clutter",
      lightingPalette:
        "Bright sunny morning window key, soft pastel yellow fill, cheerful warm rim light on characters and school props",
    },
  },
  // 12. Wildlife & Animals
  {
    keywords: ["animal", "wildlife", "safari", "creature", "mammal", "zoo"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in warm golden savannah sunset gradient, with a radiant amber center spotlight halo, soft floating golden dusk bokeh, generous clean negative space, and zero background tree or landscape clutter",
      lightingPalette:
        "Warm golden hour key light, soft savannah grass bounce, dramatic rim light on character silhouettes, zero muddy darkness",
    },
  },
  // 13. Detective & Mystery
  {
    keywords: ["detective", "mystery", "sleuth", "clue", "sherlock"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in moody deep emerald and slate gradient, with a warm amber tungsten center spotlight halo, subtle soft mystery haze bokeh, generous clean negative space, and zero background bookshelf or furniture clutter",
      lightingPalette:
        "Warm tungsten desk lamp key, cozy amber fill, crisp mysterious rim light accentuating character outlines",
    },
  },
  // 14. Sports & Athletics
  {
    keywords: ["sport", "football", "soccer", "basketball", "champion", "tournament", "stadium"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in energetic royal blue and vibrant gold gradient, with a bright stadium floodlight center spotlight halo, subtle floating celebratory confetti bokeh, generous clean negative space, and zero background crowd clutter",
      lightingPalette:
        "Bright stadium floodlight key, energetic team color bounce, sparkling rim light on athletic gear and characters",
    },
  },
  // 15. Cinema & Entertainment
  {
    keywords: ["movie", "cinema", "film", "hollywood", "director", "oscar"],
    environment: {
      environmentAtmosphere:
        "Clean minimalist curved 3D Pixar studio cyclorama backdrop in glamorous deep burgundy and champagne gradient, with a warm golden Hollywood spotlight center halo, soft sparkling awards bokeh, generous clean negative space, and zero background room clutter",
      lightingPalette:
        "Warm golden Hollywood spotlight key, soft champagne fill, sparkling rim light, zero muddy darkness",
    },
  },
];
