import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Earth's Wonders, Geography & Landscapes with radiant natural daylight.
 */
export const WONDERS_DOMAIN_SEED: EditorialDomainSeed = {
  id: "geography_nature_wonders",
  domainName: "Earth's Wildest Wonders",
  pattern:
    /\b(wonder|wonders|marvel|marvels|landmark|waterfall|geyser|glacier|canyon|volcano|earth|planet earth|mountain|summit|abyss|lake baikal)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Spectacular natural daylight landscape with golden morning sunbeams piercing roaring mist, brilliant rainbow arc, and lush emerald cliffs; radiant, breathtaking, and bright.",
  subjects: [
    {
      label: "Giant Cascading Waterfall",
      keywords: ["waterfall", "wonders", "earth", "landmark", "nature marvel", "cascade"],
      hook: "WHERE ON EARTH?",
      background: "bright",
      backgroundAtmosphere:
        "Spectacular natural daylight landscape with golden morning sunbeams piercing roaring mist, brilliant rainbow arc, and lush emerald cliffs; radiant, breathtaking, and bright.",
      spatialComposition:
        "MAJESTIC LANDMARK STAGING: Mascot on the left (~35% width) with outstretched paws in awe; colossal mountain waterfall plunging on the right (~65% width) with misty rainbow spray; headline block top-left.",
      visualPrompt:
        "spectacular low-angle wide shot of a colossal thunderous mountain waterfall plunging into a turquoise mist-filled gorge, vibrant rainbow arching across roaring spray under crisp golden morning sun, rugged emerald moss cliffs",
      mascotPose: {
        prop: "none",
        expression: "Panoramic scenic awe, eyes wide and sparkling",
        poseDescription:
          "Standing with paws outstretched in majestic appreciation of the giant natural landmark, taking in the panoramic grandeur, zero handheld tools",
      },
    },
    {
      label: "Crystalline Glacier Ice Cave",
      keywords: ["glacier", "ice cave", "frozen", "ice sheet", "arctic"],
      hook: "HOW OLD IS THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Luminous translucent cobalt-blue subglacial ice cavern lit by crystalline daylight refractions and ancient volcanic ash striations; vibrant and surreal.",
      spatialComposition:
        "ICE CAVE STAGING: Mascot on the left (~35% width) touching ice wall in delight; towering translucent cobalt blue cathedral ice ceiling on the right (~65% width); headline block top-left.",
      visualPrompt:
        "breathtaking photograph from within an ancient sub-glacial ice cave, translucent deep cobalt blue cathedral ceiling carved by meltwater, crystalline light refractions illuminating dark volcanic ash layers",
      mascotPose: {
        prop: "none",
        expression: "Shivering adventurous delight",
        poseDescription: "One paw gently touching the glowing translucent blue ice wall with a wide grin of pure discovery",
      },
    },
  ],
};

/**
 * Domain: School Clinic, First Aid & Healthcare Tools with clean bright lighting.
 */
export const CLINIC_DOMAIN_SEED: EditorialDomainSeed = {
  id: "medicine_firstaid",
  domainName: "First Aid & Clinic Secrets",
  pattern: /\b(clinic|first aid|nurse|doctor|hospital|medical|ice pack|stethoscope|bandage|saline|medicine|health heroes)\b/i,
  preferredLayout: "yes_no",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Bright cheerful clinical studio with soft daylight-white and clean mint-teal tones, polished stainless steel medical dish reflections, sparkling clean and sterile.",
  subjects: [
    {
      label: "Instant Chilling Ice Pack",
      keywords: ["clinic", "first aid", "nurse", "ice pack", "saline", "bandage"],
      hook: "YES OR NO?",
      background: "bright",
      backgroundAtmosphere:
        "Bright cheerful clinical studio with soft daylight-white and clean mint-teal tones, polished stainless steel medical dish reflections, sparkling clean and sterile.",
      spatialComposition:
        "CLINIC HERO STAGING: Mascot on the left (~35% width) in caring helper pose; activating instant ice pack pouch on clean clinic tray on the right (~65% width); headline block top-left.",
      visualPrompt:
        "crisp medical macro studio photograph of an activated clinical instant ice compress pack, transparent pouch showing reacting white urea crystals and chilling water droplets, resting beside a gleaming stainless steel medical kidney dish on a clean teal clinic surface",
      mascotPose: {
        prop: "none",
        expression: "Reassuring, caring, and curious medical-helper expression",
        poseDescription: "Hands placed gently over heart or in an attentive helpful posture, curious tilt of the head, zero handheld tools",
      },
    },
  ],
};

/**
 * Domain: Gaming, Retro Arcade & Speedruns
 */
export const GAMING_DOMAIN_SEED: EditorialDomainSeed = {
  id: "gaming_arcade",
  domainName: "Gaming & Arcade",
  pattern: /\b(game|gaming|arcade|retro|joystick|nintendo|playstation|speedrun|esports|glitch|secret code|cheat|pacman|mario)\b/i,
  preferredLayout: "yes_no",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Moody retro arcade ambient glow with vivid neon cherry-red and emerald-green LED button lights reflecting off polished gloss cabinet panel.",
  subjects: [
    {
      label: "Arcade Secret",
      keywords: ["arcade", "button", "switch", "micro-switch", "cabinet"],
      hook: "YES OR NO?",
      background: "bright",
      backgroundAtmosphere:
        "Moody retro arcade ambient glow with vivid neon cherry-red and emerald-green LED button lights reflecting off polished gloss cabinet panel.",
      spatialComposition:
        "ARCADE RETRO STAGING: Mascot on the left (~35% width) in ready gaming stance; illuminated vintage arcade push-button switch box on the right (~65% width); headline block top-left.",
      visualPrompt:
        "tactile macro photograph of an illuminated vintage arcade push-button switch box with vibrant cherry red and emerald green convex buttons, glowing interior LED micro-switches and authentic retro cabinet wiring in deep moody neon ambient glow",
      mascotPose: {
        prop: "none",
        expression: "Hyped esports champion smirk",
        poseDescription: "Ready gaming stance with energetic fists clenched at chest, determined competitive grin",
      },
    },
    {
      label: "Controller Riddle",
      keywords: ["controller", "d-pad", "cheat", "code", "secret"],
      hook: "ONLY 1% KNOWS!",
      background: "bright",
      backgroundAtmosphere: "Clean dark glass studio reflection with crisp golden spotlight highlighting secret button inputs.",
      spatialComposition:
        "CONTROLLER PUZZLE STAGING: Mascot on the left (~35% width) in playful secret wink; classic retro d-pad controller on reflective dark glass on the right (~65% width); headline block top-left.",
      visualPrompt:
        "pristine macro studio shot of a classic retro d-pad controller resting on reflective dark glass, an authentic golden secret code combination subtly highlighted by a soft spotlight",
      mascotPose: {
        prop: "none",
        expression: "Cheeky secret keeper wink",
        poseDescription: "Mischievous knowing wink with index paw touching lips in a playful hush secret gesture",
      },
    },
  ],
};

/**
 * Domain: Mystery Brand Silhouette & Pop Icons
 */
export const BRAND_DOMAIN_SEED: EditorialDomainSeed = {
  id: "mystery_brand_silhouette",
  domainName: "Mystery Brands & Icons",
  pattern:
    /\b(brand|brands|sneaker|sneakers|shoe brand|fashion brand|apparel|footwear|famous logo|commercial logo|trademark|iconic label)\b/i,
  preferredLayout: "mystery_silhouette",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Warm golden-amber geometric studio rim lighting creating razor-sharp silhouette contrast against glowing backlight; striking and clean.",
  subjects: [
    {
      label: "Mystery Sneaker Silhouette",
      keywords: ["sneaker", "brand", "shoe", "footwear", "logo"],
      hook: "UNMASK THE BRAND!",
      background: "bright",
      backgroundAtmosphere:
        "Warm golden-amber geometric studio rim lighting creating razor-sharp silhouette contrast against glowing backlight; striking and clean.",
      spatialComposition:
        "SILHOUETTE UNMASK STAGING: Mascot on the left (~35% width) in keen deduction pose; dramatic mystery silhouette of the subject on the right (~65% width); headline block top-left.",
      visualPrompt:
        "high-contrast moody studio silhouette of an iconic high-top basketball sneaker against a bright warm amber geometric backlight, subtle textural hints of premium leather perforations and stitching barely visible along the rim",
      mascotPose: {
        prop: "none",
        expression: "Intense squint of confident unmasking excitement",
        poseDescription: "One paw tapping chin in sharp detective concentration, leaning forward to unmask the silhouette",
      },
    },
  ],
};
