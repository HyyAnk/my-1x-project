import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Human Body, Senses & Anatomy with vibrant contextual backgrounds and clear block staging.
 */
export const BIOLOGY_DOMAIN_SEED: EditorialDomainSeed = {
  id: "human_senses_biology",
  domainName: "Human Senses & Biology",
  pattern: /\b(5 senses|five senses|human senses?|body senses?|sensory|cornea|pupil|iris|retina|vision|sight|cochlea|eardrum|soundwaves?|hearing|taste buds?|sour|tongue|olfactory|scent|aroma|smell|fingertip texture|tactile feel|body parts?|human anatomy)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "bright",
  backgroundAtmosphere:
    "Luminous bright studio environment with cheerful ambient lighting, vibrant natural colors, and zero gloomy dark backdrops.",
  subjects: [
    {
      label: "Vision",
      keywords: ["vision", "eye", "eyes", "cornea", "pupil", "iris", "sight"],
      hook: "CAN YOU SEE IT?",
      background: "bright",
      backgroundAtmosphere:
        "Luminous bright cinematic studio environment with soft natural depth of field and warm daylight rim lighting; clean, bright, and vibrant, never dark, dull, or muddy.",
      spatialComposition:
        "CLEAR TWO-BLOCK STAGING: Reserved headline block top-left; expressive mascot block on middle-to-lower left (~30-35% width); giant living human eye filling the right half (~65% width) in full-bleed vertical scale.",
      visualPrompt:
        "hyper-realistic macro photography of a REAL living human eye with wet glistening cornea, intricate colorful iris textures, sharp eyelashes, and a bright red indicator arrow pointing into the pupil; STRICT: real living human eye, NOT a wooden toy or desk model, NOT on a pedestal stand",
      mascotPose: {
        prop: "magnifying glass",
        expression: "Laser-focused squint of fascinated wonder, eyes locked directly on the pupil",
        poseDescription:
          "Holding an oversized brass magnifying glass close to face with wide astonished eyes, peering keenly through the lens toward the hero subject",
      },
    },
    {
      label: "Hearing",
      keywords: ["hearing", "sound", "ear", "ears", "soundwave", "audio", "listen"],
      hook: "CAN YOU HEAR THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Atmospheric soundstage with vibrant glowing electric blue soundwaves illuminating the air between mascot and ear, warm natural skin tones with crisp rim lighting.",
      spatialComposition:
        "ACOUSTIC BRIDGE STAGING: Mascot with headphones on the left (~35% width); neon soundwaves pulsing across the center; macro human ear on the right (~55% width); headline block top-left.",
      visualPrompt:
        "hyper-realistic macro photography of a REAL natural human ear in clean side profile with sharp organic skin details, accompanied by clean vibrant neon electric blue audio soundwaves entering the ear; STRICT: real living human ear, NOT a plastic or wooden model, NOT on a stand",
      mascotPose: {
        prop: "headphones",
        expression: "Deeply immersed and focused with eyes gently closed in concentration",
        poseDescription: "Wearing stylish over-ear headphones with eyes closed, nodding along and listening intently to the acoustic waves",
      },
    },
    {
      label: "Taste",
      keywords: ["taste", "tongue", "lemon", "sour", "flavor", "sweet", "spicy"],
      hook: "CAN YOU TASTE IT?",
      background: "bright",
      backgroundAtmosphere:
        "Vibrant energetic citrus golden-yellow sunburst background with flying fresh micro-droplets, luminous morning sunlight rays, saturated cheerful yellow-orange warmth; NEVER dark or dull.",
      spatialComposition:
        "APPETIZING TWO-BLOCK STAGING: Mascot on the left (~35% width) leaning eagerly forward; glistening sliced lemon wedge and tasting tongue on the right (~65% width); headline block top-left.",
      visualPrompt:
        "hyper-realistic appetizing macro photography of a vibrant fresh juicy sliced yellow lemon wedge with flying citrus droplets and an authentic pink human tongue tasting the lemon; vivid mouthwatering tactile detail",
      mascotPose: {
        prop: "none",
        expression: "Delighted, eager, and wide-eyed with mouthwatering anticipation",
        poseDescription:
          "Leaning excitedly into the frame with an enthusiastic happy open-mouthed grin, one paw open in eager anticipation toward the fresh droplet, zero handheld tools",
      },
    },
    {
      label: "Smell",
      keywords: ["smell", "scent", "aroma", "flower", "nose", "fragrant", "perfume"],
      hook: "WHAT DO YOU SMELL?",
      background: "bright",
      backgroundAtmosphere:
        "Bright outdoor spring garden daylight background with soft lush pink and emerald green bokeh, drifting flower petals, warm natural sunlight filtering through leaves; airy, fresh, vibrant, and luminous.",
      spatialComposition:
        "FRAGRANT TWO-BLOCK STAGING: Mascot on the left (~35% width) taking a deep breath with closed eyes; magnificent dew-coated pink plumeria flower on the right (~65% width); headline block top-left.",
      visualPrompt:
        "stunning macro close-up photography of real fragrant tropical pink plumeria flowers covered in fresh crystalline dew drops with soft drifting petals and subtle pink scent aroma wisps; rich natural vibrant floral colors",
      mascotPose: {
        prop: "none",
        expression: "Blissful, contented, with eyes softly closed in delight",
        poseDescription:
          "Head tilted back with eyes closed, taking a deep appreciative breath of the drifting floral aroma, paws clasped gently at chest with zero handheld tools",
      },
    },
    {
      label: "Touch",
      keywords: ["touch", "skin", "texture", "feel", "fur", "fingertip"],
      hook: "WHAT DO YOU FEEL?",
      background: "bright",
      backgroundAtmosphere:
        "Clean modern neutral warm-gray studio backdrop with bright directional side-raking keylight accentuating rich tactile textures of soft white fluff and bumpy reptilian skin with luminous clarity.",
      spatialComposition:
        "TACTILE TWO-BLOCK STAGING: Mascot on the left (~35% width) reacting in comic wonder; fingertip touching contrasting textures on the right (~65% width); headline block top-left.",
      visualPrompt:
        "ultra-detailed macro photography of a real human fingertip directly touching two contrasting tactile textures side by side (luxurious fluffy white fur next to bumpy textured reptilian skin); extreme tactile fidelity",
      mascotPose: {
        prop: "none",
        expression: "Wide-eyed astonishment and intrigue, mouth slightly open in awe",
        poseDescription:
          "Both paws raised near cheeks in humorous dramatic amazement, leaning back slightly in awe at the strange contrasting textures with zero handheld tools",
      },
    },
    {
      label: "Doors",
      keywords: ["door", "doors", "choose", "portal"],
      hook: "ONLY 1 IS CORRECT!",
      background: "navy",
      backgroundAtmosphere:
        "Richly lit atmospheric studio corridor with reflective warm golden-amber floor tiles and 4 intensely glowing neon doors (cyan, red, green, amber) casting vibrant colorful reflections.",
      spatialComposition:
        "PERSPECTIVE SELECTION: 4 glowing puzzle doors receding evenly across the background; headline block top-left; mascot in foreground center-right seen from 3/4 back-angle debating which door to choose.",
      visualPrompt:
        "four dramatic closed mystery puzzle doors side by side in a dimly lit studio, each door glowing with a distinct vibrant neon sign above it: Door 1 (cyan Eye), Door 2 (red Ear), Door 3 (green Nose), Door 4 (amber Hand); mysterious atmospheric spotlighting",
      mascotPose: {
        prop: "none",
        expression: "Curious and contemplative",
        poseDescription:
          "Seen from three-quarter back-angle observing the glowing sensory doors, one paw raised in suspenseful choice deliberation",
      },
    },
  ],
};
