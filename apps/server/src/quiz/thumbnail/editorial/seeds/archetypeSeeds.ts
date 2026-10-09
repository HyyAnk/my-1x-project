import type { EditorialChallengeArchetype } from "./seedTypes.js";

/**
 * 6 Core Challenge Archetypes matching high-CTR YouTube thumbnail formulas with distinct blocks and vibrant lighting.
 */
export const EDITORIAL_CHALLENGE_ARCHETYPES: Record<string, EditorialChallengeArchetype> = {
  extreme_macro: {
    id: "extreme_macro",
    name: "Extreme Macro Mystery",
    layout: "mega_grid",
    template: "big_object",
    background: "bright",
    backgroundAtmosphere:
      "Luminous bright cinematic studio environment with soft natural depth of field and warm rim lighting; clean, bright, and vibrant, never dark, dull, or muddy.",
    spatialComposition:
      "CLEAR TWO-BLOCK STAGING: Reserved headline block in top-left; expressive mascot block on middle-to-lower left (occupying ~30-35% width); massive hero macro subject filling the entire right half (~60-65% width) in crisp full-bleed vertical scale.",
    candidateCount: 0,
    defaultHook: "CAN YOU SEE IT?",
    hookFormulas: ["CAN YOU SEE IT?", "LOOK CLOSER!", "WHAT IS THIS?", "CAN YOU GUESS?"],
    mascotPose: {
      prop: "magnifying glass",
      expression: "Laser-focused squint of fascinated wonder, eyes locked directly on the clue",
      poseDescription:
        "Holding an oversized brass magnifying glass close to face with wide astonished eyes, peering keenly through the lens toward the hero subject",
    },
  },

  real_vs_fake: {
    id: "real_vs_fake",
    name: "Real vs Fake Comparison",
    layout: "split_vs",
    template: "comparison",
    background: "cream",
    backgroundAtmosphere:
      "Bright sunlit contemporary studio interior, clean light natural wooden tabletop, soft warm off-white background with diffused morning window daylight; welcoming, airy, and pristine.",
    spatialComposition:
      "SIDE-BY-SIDE COMPARISON: Two candidates (A & B) resting side by side on the clean illuminated surface occupying the left half (~60% width); headline block top-left; mascot staged on the far right (~35% width) in skeptical thinker pose gazing left at the choices.",
    candidateCount: 2,
    defaultHook: "WHICH IS REAL?",
    hookFormulas: ["WHICH IS REAL?", "SPOT THE FAKE!", "REAL OR FAKE?", "CAN YOU TELL?"],
    mascotPose: {
      prop: "none",
      expression: "Deep skepticism and pondering with one eyebrow raised",
      poseDescription:
        "One paw resting thoughtfully under chin in thinker stance, eyes shifting skeptically between options, zero handheld tools",
    },
  },

  odd_one_out: {
    id: "odd_one_out",
    name: "Odd One Out Spotting",
    layout: "odd_one_out",
    template: "comparison",
    background: "cream",
    backgroundAtmosphere:
      "Pristine high-key bright cream/white studio cyclorama surface with pure diffused daylight illumination, soft contact drop shadows under each subject, zero dark clutter.",
    spatialComposition:
      "HORIZONTAL PATTERN SCAN: 4 candidates (A, B, C, D) aligned evenly across the bottom half (y=50% to 95%); reserved headline block in top-left; mascot staged in upper-right (~35% width) leaning downward with keen scrutiny.",
    candidateCount: 4,
    defaultHook: "FIND THE ODD ONE",
    hookFormulas: ["FIND THE ODD ONE", "WHICH IS DIFFERENT?", "ONLY 1 IS WRONG", "SPOT THE ODD ONE"],
    mascotPose: {
      prop: "magnifying glass",
      expression: "Playful detective wink with intense scrutiny",
      poseDescription: "Holding a small magnifying lens up to one eye with a knowing wink, scanning the options",
    },
  },

  decision_doors: {
    id: "decision_doors",
    name: "Multi-Choice Door Escape",
    layout: "mega_grid",
    template: "big_object",
    background: "navy",
    backgroundAtmosphere:
      "Richly lit atmospheric studio corridor with reflective warm golden-amber floor tiles and 4 intensely glowing neon doors (cyan, red, green, amber) casting vibrant colorful reflections.",
    spatialComposition:
      "PERSPECTIVE SELECTION: 4 glowing puzzle doors receding evenly across the background; headline block top-left; mascot in foreground center-right seen from 3/4 back-angle debating which door to choose.",
    candidateCount: 0,
    defaultHook: "ONLY 1 IS CORRECT!",
    hookFormulas: ["ONLY 1 IS CORRECT!", "PICK THE RIGHT DOOR!", "WHICH DOOR IS SAFE?", "CHOOSE WISELY!"],
    mascotPose: {
      prop: "none",
      expression: "Comic uncertainty and intense curiosity",
      poseDescription:
        "Seen from three-quarter back-angle facing the mysterious choices, one paw scratching head in funny suspenseful deliberation, zero handheld tools",
    },
  },

  yes_no_verdict: {
    id: "yes_no_verdict",
    name: "Yes or No Verdict",
    layout: "yes_no",
    template: "big_object",
    background: "bright",
    backgroundAtmosphere:
      "Vibrant modern tech studio with crisp directional key light, warm amber ambient accents, and crystal-clear contrast; bright and punchy.",
    spatialComposition:
      "DYNAMIC SHOWDOWN: Hero subject prominently displayed on the right (~60% width); headline block top-left; mascot on the left (~35% width) in confident debate posture.",
    candidateCount: 0,
    defaultHook: "YES OR NO?",
    hookFormulas: ["YES OR NO?", "REAL OR NOT?", "CAN YOU GUESS?", "CAN YOU BUST THIS?"],
    mascotPose: {
      prop: "none",
      expression: "Sharp analytical focus with a knowing smirk",
      poseDescription: "Hands on hips with an energetic inquisitive smirk, leaning slightly forward in active debate posture",
    },
  },

  grand_challenge: {
    id: "grand_challenge",
    name: "Grand Quiz Host Showcase",
    layout: "mega_grid",
    template: "big_object",
    background: "bright",
    backgroundAtmosphere:
      "Vibrant energetic stage arena with colorful floating neon icon halos (cyan, red, green, yellow, purple) and dynamic studio rim lighting.",
    spatialComposition:
      "HOST SHOWCASE: Charismatic mascot centered slightly left (~40% width) reaching out toward the viewer; glowing quiz badges and challenge symbols floating dynamically on the right.",
    candidateCount: 0,
    defaultHook: "TEST ALL 5 SENSES!",
    hookFormulas: ["TEST ALL 5 SENSES!", "CAN YOU BEAT THIS?", "ONLY GENIUSES PASS!", "LEVEL 10 CHALLENGE!"],
    mascotPose: {
      prop: "none",
      expression: "Charismatic, enthusiastic, and welcoming",
      poseDescription:
        "Extending one paw forward toward the viewer with an energetic dynamic greeting smile, engaging the audience into the grand showdown",
    },
  },
};
