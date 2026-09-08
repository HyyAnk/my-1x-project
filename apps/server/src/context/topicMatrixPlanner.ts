import type { BankIndex, BankTaxonomy } from "@studio/shared";

export const CANONICAL_FALLBACK_DOMAINS: Array<{ id: string; title: string; description: string }> = [
  { id: "nature_animals", title: "Nature & Animals", description: "Wildlife, animal superpowers, marine ecosystems, and biodiversity." },
  {
    id: "careers_occupations",
    title: "Careers & Occupations",
    description: "Professions, skilled trades, emergency services, and extreme careers.",
  },
  {
    id: "countries_nations",
    title: "Countries & Nations",
    description: "World geography, iconic landmarks, flags, and cultural heritage.",
  },
  { id: "human_body", title: "Human Body & Biology", description: "Anatomy, biological systems, senses, organs, and physiology." },
  { id: "space_earth", title: "Space & Earth", description: "Cosmic wonders, astronomy, planetary science, and natural phenomena." },
  { id: "food_gastronomy", title: "Food & Gastronomy", description: "Culinary traditions, global cuisine, ingredients, and street food." },
  {
    id: "mythology_creatures",
    title: "Mythology & Creatures",
    description: "Mythological pantheons, legendary beasts, folklore, and epic lore.",
  },
  {
    id: "vehicles_technology",
    title: "Vehicles & Technology",
    description: "Aviation, automotive, robotics, computing breakthroughs, and transport.",
  },
  {
    id: "pop_culture_classics",
    title: "Pop Culture & Classics",
    description: "Cinema legends, animation, gaming icons, classic literature, and art.",
  },
];

export const ARCHETYPE_SLOT_DEFINITIONS = [
  {
    slot: 1,
    name: "Deep Trivia (Episode)",
    archetype: "deep_trivia" as const,
    suggestedLayout: "media_left_choices_right" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "episode" as const,
    description: "Knowledge/story quiz with a single hero subject scene",
  },
  {
    slot: 2,
    name: "Silhouette / Mystery Reveal (Episode)",
    archetype: "mystery_reveal" as const,
    suggestedLayout: "mystery_reveal" as const,
    quizFormat: "image_guess" as const,
    contentKind: "episode" as const,
    description: "Guess animal/object/food through shadow/silhouette or pixelated mosaic, revealed with laser scanner wipe",
  },
  {
    slot: 3,
    name: "True or False (Episode)",
    archetype: "verdict_true_false" as const,
    suggestedLayout: "verdict_true_false" as const,
    quizFormat: "true_false" as const,
    contentKind: "episode" as const,
    description: "Surprising truths and misconceptions with True/False verdict",
  },
  {
    slot: 4,
    name: "Versus Face-off (Short-Reel)",
    archetype: "versus_faceoff" as const,
    suggestedLayout: "split_versus_two" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
  {
    slot: 5,
    name: "Deep Trivia (Short-Reel)",
    archetype: "deep_trivia" as const,
    suggestedLayout: "media_left_choices_right" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "Deep Trivia Short-Reel (9:16 vertical, 1 question)",
  },
] as const;

export type TopicMatrixSlotArchetype = (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["archetype"];

export type TopicMatrixSuggestedLayout = (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["suggestedLayout"];

export type TopicMatrixQuizFormat = (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["quizFormat"];

export interface TopicMatrixSlotPlan {
  slot: number;
  name: string;
  domainId: string;
  domainTitle: string;
  archetype: TopicMatrixSlotArchetype;
  suggestedLayout: TopicMatrixSuggestedLayout;
  quizFormat: TopicMatrixQuizFormat;
  description: string;
  isKeySteered: boolean;
  contentKind: "episode" | "short_reel";
}

export interface TopicMatrixPlan {
  slots: TopicMatrixSlotPlan[];
  steeredKeyword?: string;
  aspectRatio?: "16:9";
}

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  careers_occupations: [
    "career",
    "careers",
    "job",
    "jobs",
    "profession",
    "professions",
    "occupation",
    "occupations",
    "work",
    "worker",
    "emergency",
    "doctor",
    "police",
  ],
  countries_nations: [
    "country",
    "countries",
    "nation",
    "nations",
    "geography",
    "world",
    "landmark",
    "landmarks",
    "flag",
    "flags",
    "capital",
  ],
  food_gastronomy: ["food", "dish", "dishes", "culinary", "cuisine", "cooking", "pastry", "ingredients"],
  human_body: ["body", "anatomy", "biology", "health", "senses", "organs", "physiology"],
  mythology_creatures: ["myth", "mythology", "creature", "creatures", "legend", "folklore", "god", "gods", "monster", "monsters"],
  nature_animals: ["animal", "animals", "wildlife", "nature", "creature", "creatures", "pet", "pets", "safari", "biodiversity"],
  pop_culture_classics: ["pop", "culture", "cinema", "movie", "movies", "animation", "anime", "gaming", "game", "games", "art"],
  space_earth: ["space", "earth", "astronomy", "planet", "planets", "cosmic", "cosmos", "galaxy", "universe"],
  vehicles_technology: [
    "vehicle",
    "vehicles",
    "car",
    "cars",
    "plane",
    "aviation",
    "robot",
    "robotics",
    "tech",
    "technology",
    "computing",
    "ai",
  ],
};

function normalizeString(val: string): string {
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function calculateDomainKeywordRelevance(domain: { id: string; title: string; description?: string }, hintTokens: string[]): number {
  if (hintTokens.length === 0) return 0;
  let score = 0;
  const normalizedId = normalizeString(domain.id);
  const normalizedTitle = normalizeString(domain.title);
  const normalizedDesc = normalizeString(domain.description || "");
  const synonyms = KEYWORD_SYNONYMS[domain.id] || [];

  for (const token of hintTokens) {
    if (token.length < 2) continue;
    if (normalizedId.includes(token)) score += 10;
    if (normalizedTitle.includes(token)) score += 8;
    if (normalizedDesc.includes(token)) score += 4;
    for (const syn of synonyms) {
      if (syn.includes(token) || token.includes(syn)) {
        score += 6;
      }
    }
  }

  return score;
}

export function extractNormalizedDomains(
  taxonomy?: BankTaxonomy | null,
  index?: BankIndex | null,
): Array<{ id: string; title: string; description: string; score: number }> {
  const domainMap = new Map<string, { id: string; title: string; description: string; score: number }>();

  if (taxonomy?.domains && Array.isArray(taxonomy.domains)) {
    for (const d of taxonomy.domains) {
      if (!d.id) continue;
      const questionCount = index?.by_domain?.[d.id] ?? 0;
      const subtopicCount = d.subtopics?.length ?? 0;
      const activityScore = questionCount * 10 + subtopicCount;
      domainMap.set(d.id, {
        id: d.id,
        title: d.title || d.id,
        description: d.description || "",
        score: activityScore,
      });
    }
  }

  for (const fallback of CANONICAL_FALLBACK_DOMAINS) {
    if (!domainMap.has(fallback.id)) {
      const questionCount = index?.by_domain?.[fallback.id] ?? 0;
      domainMap.set(fallback.id, {
        id: fallback.id,
        title: fallback.title,
        description: fallback.description,
        score: questionCount * 10,
      });
    }
  }

  return Array.from(domainMap.values());
}

export function planTopicSuggestionMatrix(options: {
  taxonomy?: BankTaxonomy | null;
  index?: BankIndex | null;
  topicHint?: string;
  aspectRatio?: "16:9";
}): TopicMatrixPlan {
  const { taxonomy, index, topicHint, aspectRatio: _aspectRatio } = options;
  const slotDefinitions = ARCHETYPE_SLOT_DEFINITIONS;
  const availableDomains = extractNormalizedDomains(taxonomy, index);
  const trimmedHint = topicHint?.trim();

  let selectedFive: Array<{ id: string; title: string; description: string }> = [];

  if (trimmedHint) {
    const hintTokens = normalizeString(trimmedHint).split(/\s+/).filter(Boolean);
    const scoredDomains = availableDomains.map((domain) => ({
      domain,
      relevance: calculateDomainKeywordRelevance(domain, hintTokens),
    }));

    scoredDomains.sort((a, b) => b.relevance - a.relevance || b.domain.score - a.domain.score);

    const steeredDomains = [scoredDomains[0].domain, scoredDomains[1].domain];
    const steeredIds = new Set(steeredDomains.map((d) => d.id));

    const remainingDomains = scoredDomains
      .filter((sd) => !steeredIds.has(sd.domain.id))
      .map((sd) => sd.domain)
      .sort((a, b) => b.score - a.score);

    // Slot 1 (idx 0): Episode, keyword-directed
    // Slot 2 (idx 1): Episode, discovery
    // Slot 3 (idx 2): Episode, discovery
    // Slot 4 (idx 3): Short-Reel, keyword-directed
    // Slot 5 (idx 4): Short-Reel, discovery
    selectedFive = [steeredDomains[0], remainingDomains[0], remainingDomains[1], steeredDomains[1], remainingDomains[2]];
  } else {
    const sorted = [...availableDomains].sort((a, b) => b.score - a.score);
    selectedFive = sorted.slice(0, 5);
  }

  const slots: TopicMatrixSlotPlan[] = slotDefinitions.map((def, idx) => {
    const assignedDomain = selectedFive[idx] || CANONICAL_FALLBACK_DOMAINS[idx];
    const isKeySteered = Boolean(trimmedHint && (idx === 0 || idx === 3));
    const contentKind: "episode" | "short_reel" = idx >= 3 ? "short_reel" : "episode";
    return {
      slot: def.slot,
      name: def.name,
      domainId: assignedDomain.id,
      domainTitle: assignedDomain.title,
      archetype: def.archetype,
      suggestedLayout: def.suggestedLayout,
      quizFormat: def.quizFormat,
      description: def.description,
      isKeySteered,
      contentKind,
    };
  });

  return {
    slots,
    steeredKeyword: trimmedHint || undefined,
    aspectRatio: "16:9",
  };
}

export function formatTopicMatrixPrompt(
  plan: TopicMatrixPlan,
  topicHint?: string,
  aspectRatio?: "16:9",
): {
  hintGuidance: string;
  blueprintGuidance: string;
  outputContract: string;
} {
  void aspectRatio;
  const trimmedHint = topicHint?.trim();
  const [slot1, slot2, slot3, slot4, slot5] = plan.slots;

  let hintGuidance = "";
  if (trimmedHint) {
    hintGuidance = `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${trimmedHint}". Exactly 2 candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${trimmedHint}" (include "theme_hint": "${trimmedHint}" in those 2 JSON objects). Slot 1 (Episode) is steered to domain "${slot1.domainId}" (${slot1.domainTitle}) and Slot 4 (Short-Reel) is steered to domain "${slot4.domainId}" (${slot4.domainTitle}). The remaining 3 candidates should be diverse, creative discovery topics aligned with the overall channel DNA, sourced from 3 different domains ("${slot2.domainId}", "${slot3.domainId}", "${slot5.domainId}"), and MUST NOT reuse the keyword.`;
  }

  const blueprintGuidance = `\nGAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY:
- Slot 1 (Episode - Deep Trivia): ${slot1.description} (domain_id: "${slot1.domainId}", content_kind: "episode", quiz_format: "multiple_choice", archetype: "deep_trivia", suggested_layout: "media_left_choices_right").
- Slot 2 (Episode - Mystery Reveal): ${slot2.description} (domain_id: "${slot2.domainId}", content_kind: "episode", quiz_format: "image_guess", archetype: "mystery_reveal", suggested_layout: "mystery_reveal").
- Slot 3 (Episode - True or False): ${slot3.description} (domain_id: "${slot3.domainId}", content_kind: "episode", quiz_format: "true_false", archetype: "verdict_true_false", suggested_layout: "verdict_true_false").
- Slot 4 (Short-Reel - Versus Face-off): ${slot4.description} (domain_id: "${slot4.domainId}", content_kind: "short_reel", archetype: "versus_faceoff", question_count: 1, aspect_ratio: "9:16").
- Slot 5 (Short-Reel - Deep Trivia): ${slot5.description} (domain_id: "${slot5.domainId}", content_kind: "short_reel", archetype: "deep_trivia", question_count: 1, aspect_ratio: "9:16").`;

  const outputContract = `Return exactly 5 JSON candidates: Slots 1-3 are Episode concepts (content_kind: "episode", 3-10 questions, landscape layout), Slots 4-5 are Short-Reel concepts (content_kind: "short_reel", question_count: 1, 9:16 vertical, archetype "versus_faceoff" or "deep_trivia"). Each candidate must have title, premise, why_it_fits, hook, estimated_potential, domain_id, and content_kind.${blueprintGuidance}${hintGuidance} Do not research or develop them further.`;

  return {
    hintGuidance,
    blueprintGuidance,
    outputContract,
  };
}
