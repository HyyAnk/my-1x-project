/**
 * 10 Abstract Emotional & Behavioral Archetypes for Mascot Thumbnail Visuals.
 * Designed with strict zero-example guidelines to prevent LLM semantic anchoring / few-shot bias.
 */

export interface MascotArchetypeDefinition {
  id: number;
  code: string;
  name: string;
  guideline: string;
}

export const MASCOT_ARCHETYPES_CATALOG: readonly MascotArchetypeDefinition[] = [
  {
    id: 1,
    code: "shocked_reactor",
    name: "The Mind-Blown / Shocked Reactor",
    guideline:
      "Overwhelmed with absolute disbelief or mind-blowing revelation; full-body shock, dropped jaw, wide expressive eyes, overwhelmed cognitive reaction.",
  },
  {
    id: 2,
    code: "deep_investigator",
    name: "The Deep Investigator / Deduction Master",
    guideline:
      "Intense intellectual scrutiny; inspecting tiny details closely, deductive analytical posture, narrowed observant gaze, decoding clues.",
  },
  {
    id: 3,
    code: "dilemma_agonizer",
    name: "The Dilemma / Conflicted Agonizer",
    guideline:
      "Humorously paralyzed between competing difficult choices; torn body language, comic uncertainty, scratching head or balancing weighing stance.",
  },
  {
    id: 4,
    code: "cheeky_challenger",
    name: "The Cheeky Challenger / Secret Keeper",
    guideline:
      "Playful fourth-wall break directly engaging the viewer; mischievous knowing wink, conspiratorial hush gesture, bold confident riddle challenge.",
  },
  {
    id: 5,
    code: "thematic_specialist",
    name: "The Immersed Thematic Specialist",
    guideline:
      "Fully absorbed practitioner within the episode's world; actively performing a signature in-universe task or handling a thematic craft with authentic dedication.",
  },
  {
    id: 6,
    code: "comedic_panic",
    name: "The Comedic Panic / Chaos Reactor",
    guideline:
      "Exaggerated cartoon urgency or comedic time pressure; frantic scramble, wide alert pose, high-energy funny stress response.",
  },
  {
    id: 7,
    code: "euphoric_celebrator",
    name: "The Euphoric Celebrator / Victor",
    guideline:
      "Triumphant breakthrough or triumphant mastery; explosive celebratory leap, beaming radiant pride, dynamic victory aura.",
  },
  {
    id: 8,
    code: "skeptical_buster",
    name: "The Skeptical / Myth Buster",
    guideline:
      "Clever doubt or spotting suspicious inconsistencies; raised skeptical eyebrow, quizzical side-eye, challenging an absurd premise.",
  },
  {
    id: 9,
    code: "dreamy_marveler",
    name: "The Spellbound / Dreamy Marveler",
    guideline:
      "Enchanted admiration or awe-struck wonder; sparkling stars in eyes, gentle admiring lean, captivated by extraordinary visual beauty.",
  },
  {
    id: 10,
    code: "sneaky_trickster",
    name: "The Sneaky Trickster / Playful Imposter",
    guideline:
      "Stealthy peek or mischievous surprise; peeking curiously from behind an element, playful ambush stance, cunning playful demeanor.",
  },
] as const;

/**
 * Randomly selects N distinct archetypes from the catalog without replacement.
 */
export function selectRandomArchetypes(
  pool: readonly MascotArchetypeDefinition[] = MASCOT_ARCHETYPES_CATALOG,
  count = 5,
  rng: () => number = Math.random,
): MascotArchetypeDefinition[] {
  const safeCount = Math.max(1, Math.min(count, pool.length));
  const array = [...pool];

  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array.slice(0, safeCount);
}

/**
 * Randomly selects 1 item from an array.
 */
export function selectRandomVariation<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): { selected: T; index: number } | null {
  if (!items || items.length === 0) return null;
  const index = Math.floor(rng() * items.length);
  return { selected: items[index], index };
}
