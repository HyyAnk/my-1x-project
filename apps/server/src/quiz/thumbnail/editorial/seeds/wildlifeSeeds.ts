import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Animals, Wildlife & Nature with vibrant authentic natural lighting and clear blocks.
 */
export const WILDLIFE_DOMAIN_SEED: EditorialDomainSeed = {
  id: "animals_wildlife",
  domainName: "Animals & Wildlife",
  pattern: /\b(animal|animals|wildlife|creature|creatures|predator|predators|beast|mammal|mammals|bird|birds|reptile|reptiles|snake|lizard|ocean|shark|safari|jungle|dinosaur|dinosaurs|butterfly|butterflies|insect|insects|chameleon|fox|wolf|owl|tiger|lion|bear)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Lush vibrant natural habitat with crisp directional sunlight, rich organic textures, and clean subject separation.",
  subjects: [
    {
      label: "Apex Predator",
      keywords: ["predator", "tiger", "lion", "wolf", "bear", "shark", "dangerous", "hunter"],
      hook: "WHICH IS DEADLIEST?",
      background: "bright",
      backgroundAtmosphere:
        "Crisp atmospheric winter taiga with soft morning mist, bright rim lighting reflecting off sparkling fresh snow crystals and frosty amber keylight.",
      spatialComposition:
        "PREDATOR ENCOUNTER STAGING: Mascot on the left (~35% width) stepping back in comic awe; towering Siberian tiger face filling the right half (~65% width) with glowing amber eyes; headline block top-left.",
      visualPrompt:
        "intense cinematic macro portrait of an apex Siberian tiger in midnight mist, piercing golden-amber eyes glowing under focused rim lighting, glistening whiskers, and authentic wet snow dusting its thick fur coat",
      mascotPose: {
        prop: "none",
        expression: "Thrilled, wide-eyed respectful awe",
        poseDescription: "Stepping back slightly with paws raised in comic respectful awe, staring directly into the tiger's gaze",
      },
    },
    {
      label: "Camouflage Spotting",
      keywords: ["camouflage", "chameleon", "hidden", "spot it", "lizard", "leaves"],
      hook: "CAN YOU SPOT IT?",
      background: "bright",
      backgroundAtmosphere:
        "Lush tropical rainforest canopy with bright natural sunbeams piercing misty foliage, rich glistening emerald and golden daylight accents.",
      spatialComposition:
        "CAMOUFLAGE SPOTTING STAGING: Mascot in field-scout stance on the lower-left (~35% width) with magnifying lens; camouflaged chameleon on rain-soaked leaves on the right (~65% width); headline block top-left.",
      visualPrompt:
        "hyper-realistic macro wildlife photography of a living chameleon seamlessly camouflaged amidst dew-coated tropical jungle leaves, displaying glistening emerald scales and a single intensely focused revolving eye locked onto a tiny dewdrop",
      mascotPose: {
        prop: "magnifying glass",
        expression: "Whispering excitement, eyes widened in breathless discovery",
        poseDescription: "Crouched in low field-scout stance, holding a magnifying glass with two paws to spot the camouflaged creature",
      },
    },
    {
      label: "Odd Butterfly",
      keywords: ["butterfly", "butterflies", "wing", "wings", "morpho", "insect", "odd"],
      hook: "FIND THE ODD ONE",
      background: "cream",
      backgroundAtmosphere:
        "Pristine high-key bright cream/white studio cyclorama surface with pure diffused daylight illumination, soft contact drop shadows under each subject, zero dark clutter.",
      spatialComposition:
        "HORIZONTAL PATTERN SCAN: 4 candidates (A, B, C, D) aligned evenly across the bottom half (y=50% to 95%); reserved headline block in top-left; mascot staged in upper-right (~35% width) leaning downward with keen scrutiny.",
      visualPrompt:
        "four magnificent living iridescent blue Morpho butterflies (A, B, C, D) resting horizontally in a neat row against a clean bright studio background, where butterfly C displays a subtle warm amber gradient pattern along its inner wing margin",
      mascotPose: {
        prop: "magnifying glass",
        expression: "Playful detective wink with intense curiosity",
        poseDescription: "Peering playfully through a small monocle lens with one eye winking, comparing the butterfly wings",
      },
    },
    {
      label: "Deep Sea Creature",
      keywords: ["deep sea", "ocean", "jellyfish", "abyss", "bioluminescent", "glow"],
      hook: "DOES THIS EXIST?",
      background: "navy",
      backgroundAtmosphere:
        "Dark abyssal marine deep lit by brilliant electric cyan and violet bioluminescent pulses casting soft luminous glows over the mascot and creature.",
      spatialComposition:
        "BIOLUMINESCENT STAGING: Mascot on the left (~35% width) in floating enchantment; pulsing crown jellyfish on the right (~65% width); headline block top-left.",
      visualPrompt:
        "mesmerizing macro underwater photograph of a translucent deep-sea crown jellyfish pulsing with bioluminescent electric cyan and violet phosphorescence against inky abyssal waters, delicate crystalline tentacles trailing gracefully",
      mascotPose: {
        prop: "none",
        expression: "Enchanted underwater wonder, wide eyes glowing with reflections",
        poseDescription: "Paws pressed together in gentle floating enchantment, gazing in awe at the bioluminescent glow, zero handheld tools",
      },
    },
  ],
};
