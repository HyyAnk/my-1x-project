import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Food, Gastronomy & Culinary Puzzles with bright appetizing atmospheres.
 */
export const FOOD_DOMAIN_SEED: EditorialDomainSeed = {
  id: "food_gastronomy",
  domainName: "Food & Gastronomy",
  pattern: /\b(food|fruit|fruits|apple|snack|cooking|baking|bakery|dessert|dish|culinary|chef|chocolate|cake|spicy|pepper|pizza|burger|candy|sweets)\b/i,
  preferredLayout: "split_vs",
  preferredTemplate: "comparison",
  background: "cream",
  backgroundAtmosphere:
    "Bright sunlit contemporary kitchen studio, clean light natural wooden cutting board surface, soft airy warm cream background with natural daylight window glow; fresh, inviting, and clean.",
  subjects: [
    {
      label: "Real vs Cake Apple",
      keywords: ["cake", "apple", "real vs cake", "fondant", "illusion", "fake"],
      hook: "WHICH IS REAL?",
      background: "cream",
      backgroundAtmosphere:
        "Bright sunlit contemporary studio interior, clean light natural wooden tabletop, soft warm off-white background with diffused morning window daylight; welcoming, airy, and pristine.",
      spatialComposition:
        "SIDE-BY-SIDE COMPARISON: Two candidates (A & B) resting side by side on the clean illuminated wooden surface occupying the left half (~60% width); headline block top-left; mascot staged on the far right (~35% width) in skeptical thinker pose gazing left at the choices.",
      visualPrompt:
        "two pristine bright red gala apples (labeled A and B) sitting side by side on a clean wooden cutting board; one is a real crisp juicy orchard apple with natural dew drops and green leaf, the other is an impossibly convincing hyper-realistic illusion fondant cake",
      mascotPose: {
        prop: "none",
        expression: "Intensely skeptical and deeply analytical with one eyebrow arched",
        poseDescription: "One paw resting thoughtfully under chin in thinker stance, eyes shifting skeptically between apple A and B",
      },
    },
    {
      label: "Extreme Spice",
      keywords: ["spicy", "spice", "pepper", "chili", "hot", "reaper", "heat"],
      hook: "CAN YOU HANDLE THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Vibrant warm ember studio ambiance with focused golden keylight illuminating wisps of rising spice heat, rich saturated fiery tones with zero muddy darkness.",
      spatialComposition:
        "SPICY SHOWDOWN STAGING: Mascot on the left (~35% width) fanning mouth in comic shock; blistered Carolina Reaper pepper on the right (~65% width) filling frame with micro-oil droplets; headline block top-left.",
      visualPrompt:
        "hyper-realistic mouthwatering macro photograph of a glistening blistered fiery red Carolina Reaper pepper, micro-droplets of spicy oil glistening on its bumpy textured skin with a gentle wisp of heat rising in dramatic dark studio lighting",
      mascotPose: {
        prop: "none",
        expression: "Comic shock, mouth open in breathless heat anticipation",
        poseDescription: "Both paws fanning open mouth with a hilarious wide-eyed spicy gasp, leaning away from the chili",
      },
    },
    {
      label: "Mystery Fruit",
      keywords: ["fruit", "dragonfruit", "mystery fruit", "exotic", "slice", "cross-section"],
      hook: "CAN YOU GUESS IT?",
      background: "bright",
      backgroundAtmosphere:
        "Crisp bright morning daylight studio with soft pastel tabletop reflections and fresh sparkling water droplets; vivid, cheerful, and sunny.",
      spatialComposition:
        "EXOTIC MACRO STAGING: Mascot on the left (~35% width) leaning forward with hungry glee; sliced dragonfruit cross-section on the right (~65% width); headline block top-left.",
      visualPrompt:
        "mouthwatering macro cross-section of an exotic sliced dragonfruit displaying vivid magenta skin, pure snow-white flesh peppered with tiny crisp black seeds and crystalline moisture glistening in directional daylight",
      mascotPose: {
        prop: "none",
        expression: "Hungry joyful grin, eyes shining with delight",
        poseDescription: "Leaning excitedly over the fruit with hands clasped in eager foodie anticipation, zero handheld tools",
      },
    },
  ],
};
