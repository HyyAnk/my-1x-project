import type { ThumbnailAspectRatio, ThumbnailLayoutType } from "../schemas/thumbnail.js";

export type ThumbnailDimensionSpec = {
  width: number;
  height: number;
  aspectRatio: ThumbnailAspectRatio;
  label: string;
  safeZone: {
    topRatio: number;
    bottomRatio: number;
    leftRatio: number;
    rightRatio: number;
  };
};

export const THUMBNAIL_DIMENSION_SPECS: Record<ThumbnailAspectRatio, ThumbnailDimensionSpec> = {
  "16:9": {
    width: 1280,
    height: 720,
    aspectRatio: "16:9",
    label: "YouTube Long-form Video (16:9)",
    safeZone: {
      topRatio: 0.05,
      bottomRatio: 0.12, // Avoid bottom-right YouTube timestamp badge
      leftRatio: 0.05,
      rightRatio: 0.12,
    },
  },
  "9:16": {
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    label: "YouTube Shorts / TikTok Cover (9:16)",
    safeZone: {
      topRatio: 0.12, // Avoid search/camera icons
      bottomRatio: 0.25, // Avoid channel avatar, title, sound metadata
      leftRatio: 0.05,
      rightRatio: 0.15, // Avoid Like/Comment/Share buttons
    },
  },
};

export type ThumbnailLayoutMetadata = {
  id: ThumbnailLayoutType;
  name: string;
  description: string;
  psychologicalTrigger: string;
  mascotPersona: {
    role: string;
    defaultCostume: string;
    defaultProp: string;
    defaultExpression: string;
  };
  hookTextTemplate: string;
  badgeTemplate: string;
};

export const THUMBNAIL_LAYOUT_CATALOG: Record<ThumbnailLayoutType, ThumbnailLayoutMetadata> = {
  mega_grid: {
    id: "mega_grid",
    name: "Mega Topic Grid (2x2 / 3x3)",
    description: "High-volume general knowledge layout with giant question number and multi-subject cards.",
    psychologicalTrigger: "High perceived value and topic variety (General knowledge / Variety).",
    mascotPersona: {
      role: "Explorer / Guide",
      defaultCostume: "Explorer safari hat and scout vest",
      defaultProp: "Glowing gold star or explorer compass",
      defaultExpression: "Cheerful, welcoming, and proud",
    },
    hookTextTemplate: "GENERAL KNOWLEDGE",
    badgeTemplate: "100 QUESTIONS",
  },
  split_vs: {
    id: "split_vs",
    name: "Split Screen VS (Would You Rather)",
    description: "High-contrast split screen with fiery VS emblem and conflicting choices.",
    psychologicalTrigger: "Immediate cognitive dilemma and forced choice.",
    mascotPersona: {
      role: "Referee / Confused Judge",
      defaultCostume: "Black-and-white striped referee shirt with a whistle",
      defaultProp: "Holding referee penalty card or scratching head",
      defaultExpression: "Hilariously conflicted and indecisive",
    },
    hookTextTemplate: "WHICH WOULD YOU CHOOSE?",
    badgeTemplate: "PICK ONE! ⚡",
  },
  mystery_silhouette: {
    id: "mystery_silhouette",
    name: "Mystery Silhouette (Guess Who / Zoom-in)",
    description: "Darkened mystery character with neon question mark and detective investigation.",
    psychologicalTrigger: "Extreme curiosity gap and identity puzzle.",
    mascotPersona: {
      role: "Master Detective",
      defaultCostume: "Sherlock Holmes trench coat and deerstalker hat",
      defaultProp: "Tactical flashlight beaming light or giant magnifying glass",
      defaultExpression: "Shocked, wide-eyed, and jaw dropped",
    },
    hookTextTemplate: "WHO IS THIS?",
    badgeTemplate: "ONLY 1% KNOW! 🔥",
  },
  odd_one_out: {
    id: "odd_one_out",
    name: "Odd One Out / Matrix (Spot Difference)",
    description: "Grid of matching objects with one anomalous item highlighted.",
    psychologicalTrigger: "Pattern recognition and spot-the-error itch.",
    mascotPersona: {
      role: "Sharp Investigator",
      defaultCostume: "Round nerdy glasses and investigator waistcoat",
      defaultProp: "Oversized magnifying glass pointing at the odd object",
      defaultExpression: "Clever smirk, excited, and pointing directly",
    },
    hookTextTemplate: "FIND THE ODD ONE!",
    badgeTemplate: "10 SECONDS! ⏱️",
  },
  difficulty_tier: {
    id: "difficulty_tier",
    name: "Difficulty Progression (4 Levels)",
    description: "Tiered colored columns advancing from Easy to Impossible with mind-blown reaction.",
    psychologicalTrigger: "Ego challenge and mastery progression.",
    mascotPersona: {
      role: "Overloaded Genius",
      defaultCostume: "Lab coat or glowing cybernetic suit",
      defaultProp: "Steam puffing from ears and glowing brain aura",
      defaultExpression: "Comically overwhelmed with dizzy spiral eyes",
    },
    hookTextTemplate: "CAN YOU BEAT LEVEL 4?",
    badgeTemplate: "IQ 140+ TEST 🧠",
  },
  true_false: {
    id: "true_false",
    name: "True or False (Fact vs Myth)",
    description: "Controversial claim with tactile 3D True and False arcade buttons.",
    psychologicalTrigger: "Belief challenge and myth-busting urge.",
    mascotPersona: {
      role: "Truth Checker / Quizmaster",
      defaultCostume: "Show host bowtie and glowing cybernetic earpiece",
      defaultProp: "Green 'TRUE' paddle in one hand, red 'FALSE' paddle in the other",
      defaultExpression: "Winking with raised eyebrow, challenging the viewer",
    },
    hookTextTemplate: "TRUE OR FALSE?",
    badgeTemplate: "10 BIGGEST MYTHS ❌",
  },
};
