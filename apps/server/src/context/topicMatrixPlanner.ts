import type { BankDomainMeta, BankIndex, BankTaxonomy } from "@studio/shared";
import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";

export const CANONICAL_FALLBACK_DOMAINS: Array<{ id: string; title: string; description: string }> = [
  { id: "nature_animals", title: "Nature & Animals", description: "Wildlife, animal superpowers, marine ecosystems, and biodiversity." },
  { id: "careers_occupations", title: "Careers & Occupations", description: "Professions, skilled trades, emergency services, and extreme careers." },
  { id: "countries_nations", title: "Countries & Nations", description: "World geography, iconic landmarks, flags, and cultural heritage." },
  { id: "human_body", title: "Human Body & Biology", description: "Anatomy, biological systems, senses, organs, and physiology." },
  { id: "space_earth", title: "Space & Earth", description: "Cosmic wonders, astronomy, planetary science, and natural phenomena." },
  { id: "food_gastronomy", title: "Food & Gastronomy", description: "Culinary traditions, global cuisine, ingredients, and street food." },
  { id: "mythology_creatures", title: "Mythology & Creatures", description: "Mythological pantheons, legendary beasts, folklore, and epic lore." },
  { id: "vehicles_technology", title: "Vehicles & Technology", description: "Aviation, automotive, robotics, computing breakthroughs, and transport." },
  { id: "pop_culture_classics", title: "Pop Culture & Classics", description: "Cinema legends, animation, gaming icons, classic literature, and art." },
];

export const ARCHETYPE_SLOT_DEFINITIONS = [
  {
    slot: 1,
    name: "Deep Trivia",
    archetype: "deep_trivia" as const,
    suggestedLayout: "media_left_choices_right" as const,
    quizFormat: "multiple_choice" as const,
    description: "Knowledge/story quiz with a single hero subject scene",
  },
  {
    slot: 2,
    name: "Silhouette / Mystery Reveal",
    archetype: "mystery_reveal" as const,
    suggestedLayout: "mystery_reveal" as const,
    quizFormat: "image_guess" as const,
    description: "Guess animal/object/food through shadow/silhouette or pixelated mosaic, revealed with laser scanner wipe",
  },
  {
    slot: 3,
    name: "True or False",
    archetype: "verdict_true_false" as const,
    suggestedLayout: "verdict_true_false" as const,
    quizFormat: "true_false" as const,
    description: "Surprising truths and misconceptions with True/False verdict",
  },
  {
    slot: 4,
    name: "Clue Deduction A -> B",
    archetype: "clue_deduction" as const,
    suggestedLayout: "clue_deduction" as const,
    quizFormat: "image_guess" as const,
    description: "Guess profession from tool, country from dish/landmark, animal from habitat with 100% crisp clue image A",
  },
  {
    slot: 5,
    name: "Wildcard Discovery / Face-off",
    archetype: "versus_faceoff" as const,
    suggestedLayout: "split_versus_two" as const,
    quizFormat: "multiple_choice" as const,
    description: "1v1 Face-off, odd-one-out visual spotting, or fast text trivia",
  },
] as const;

export interface TopicMatrixSlotPlan {
  slot: number;
  name: string;
  domainId: string;
  domainTitle: string;
  archetype: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["archetype"];
  suggestedLayout: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["suggestedLayout"];
  quizFormat: (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["quizFormat"];
  description: string;
  isKeySteered: boolean;
}

export interface TopicMatrixPlan {
  slots: TopicMatrixSlotPlan[];
  steeredKeyword?: string;
}

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  careers_occupations: ["career", "careers", "job", "jobs", "profession", "professions", "occupation", "occupations", "work", "worker", "emergency", "doctor", "police", "nghe", "nghiep", "cong viec"],
  countries_nations: ["country", "countries", "nation", "nations", "geography", "world", "landmark", "landmarks", "flag", "flags", "capital", "quoc gia", "dat nuoc", "dia ly"],
  food_gastronomy: ["food", "dish", "dishes", "culinary", "cuisine", "cooking", "pastry", "ingredients", "am thuc", "mon an", "nau an", "an uong"],
  human_body: ["body", "anatomy", "biology", "health", "senses", "organs", "physiology", "co the", "sinh hoc", "suc khoe"],
  mythology_creatures: ["myth", "mythology", "creature", "creatures", "legend", "folklore", "god", "gods", "monster", "monsters", "than thoai", "quai vat", "truyen thuyet"],
  nature_animals: ["animal", "animals", "wildlife", "nature", "creature", "creatures", "pet", "pets", "safari", "biodiversity", "dong vat", "thu", "con vat"],
  pop_culture_classics: ["pop", "culture", "cinema", "movie", "movies", "animation", "anime", "gaming", "game", "games", "art", "phim", "hoat hinh"],
  space_earth: ["space", "earth", "astronomy", "planet", "planets", "cosmic", "cosmos", "galaxy", "universe", "vu tru", "hanh tinh", "trai dat"],
  vehicles_technology: ["vehicle", "vehicles", "car", "cars", "plane", "aviation", "robot", "robotics", "tech", "technology", "computing", "ai", "xe", "may bay", "cong nghe"],
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

export function extractNormalizedDomains(taxonomy?: BankTaxonomy | null, index?: BankIndex | null): Array<{ id: string; title: string; description: string; score: number }> {
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
}): TopicMatrixPlan {
  const { taxonomy, index, topicHint } = options;
  const availableDomains = extractNormalizedDomains(taxonomy, index);
  const trimmedHint = topicHint?.trim();

  let steeredDomains: Array<{ id: string; title: string; description: string }> = [];
  let remainingDomains: Array<{ id: string; title: string; description: string }> = [];

  if (trimmedHint) {
    const hintTokens = normalizeString(trimmedHint).split(/\s+/).filter(Boolean);
    const scoredDomains = availableDomains.map((domain) => ({
      domain,
      relevance: calculateDomainKeywordRelevance(domain, hintTokens),
    }));

    scoredDomains.sort((a, b) => b.relevance - a.relevance || b.domain.score - a.domain.score);

    steeredDomains = [scoredDomains[0].domain, scoredDomains[1].domain];
    const steeredIds = new Set(steeredDomains.map((d) => d.id));

    remainingDomains = scoredDomains
      .filter((sd) => !steeredIds.has(sd.domain.id))
      .map((sd) => sd.domain)
      .sort((a, b) => b.score - a.score);
  } else {
    const sorted = [...availableDomains].sort((a, b) => b.score - a.score);
    steeredDomains = [sorted[0], sorted[1]];
    remainingDomains = sorted.slice(2);
  }

  const selectedFive = [
    steeredDomains[0],
    steeredDomains[1],
    remainingDomains[0],
    remainingDomains[1],
    remainingDomains[2],
  ];

  const slots: TopicMatrixSlotPlan[] = ARCHETYPE_SLOT_DEFINITIONS.map((def, idx) => {
    const assignedDomain = selectedFive[idx] || CANONICAL_FALLBACK_DOMAINS[idx];
    return {
      slot: def.slot,
      name: def.name,
      domainId: assignedDomain.id,
      domainTitle: assignedDomain.title,
      archetype: def.archetype,
      suggestedLayout: def.suggestedLayout,
      quizFormat: def.quizFormat,
      description: def.description,
      isKeySteered: Boolean(trimmedHint && idx < 2),
    };
  });

  return {
    slots,
    steeredKeyword: trimmedHint || undefined,
  };
}

export function formatTopicMatrixPrompt(plan: TopicMatrixPlan, topicHint?: string): {
  hintGuidance: string;
  blueprintGuidance: string;
  outputContract: string;
} {
  const trimmedHint = topicHint?.trim();
  const [slot1, slot2, slot3, slot4, slot5] = plan.slots;

  let hintGuidance = "";
  if (trimmedHint) {
    hintGuidance = `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${trimmedHint}". Exactly 2 candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${trimmedHint}" (include "theme_hint": "${trimmedHint}" in those 2 JSON objects). Slot 1 is steered to domain "${slot1.domainId}" (${slot1.domainTitle}) and Slot 2 is steered to domain "${slot2.domainId}" (${slot2.domainTitle}). The remaining 3 candidates should be diverse, creative topics aligned with the overall channel DNA, sourced from 3 different domains ("${slot3.domainId}", "${slot4.domainId}", "${slot5.domainId}"), and MUST NOT reuse the keyword.`;
  }

  const blueprintGuidance = `\nGAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY:
- Slot 1 (Deep Trivia): ${slot1.description} (domain_id: "${slot1.domainId}", quiz_format: "multiple_choice", archetype: "deep_trivia", suggested_layout: "media_left_choices_right").
- Slot 2 (Silhouette / Mystery Reveal): ${slot2.description} (domain_id: "${slot2.domainId}", quiz_format: "image_guess", archetype: "mystery_reveal", suggested_layout: "mystery_reveal").
- Slot 3 (True or False): ${slot3.description} (domain_id: "${slot3.domainId}", quiz_format: "true_false", archetype: "verdict_true_false", suggested_layout: "verdict_true_false").
- Slot 4 (Clue Deduction A -> B): ${slot4.description} (domain_id: "${slot4.domainId}", quiz_format: "image_guess", archetype: "clue_deduction", suggested_layout: "clue_deduction").
- Slot 5 (Wildcard Discovery): ${slot5.description} (domain_id: "${slot5.domainId}", quiz_format: "multiple_choice" or "odd_one_out", archetype: "versus_faceoff" | "visual_spotting" | "speed_blitz", suggested_layout: "split_versus_two" | "visual_choices_three_pure" | "full_stack_list").`;

  const outputContract = `Return exactly 5 JSON candidates with title, premise, why_it_fits, hook, estimated_potential, domain_id, quiz_format (knowledge|image_guess|multiple_choice|true_false|odd_one_out), archetype (deep_trivia|mystery_reveal|verdict_true_false|clue_deduction|versus_faceoff|visual_spotting|speed_blitz), suggested_layout (media_left_choices_right|mystery_reveal|verdict_true_false|clue_deduction|split_versus_two|visual_choices_three_pure|full_stack_list), question_count (${QUIZ_MIN_QUESTION_COUNT}-${QUIZ_MAX_QUESTION_COUNT}), and age_band (4-6|7-9|10-12|family). Use five different formats where possible.${blueprintGuidance}${hintGuidance} Do not research or develop them further.`;

  return {
    hintGuidance,
    blueprintGuidance,
    outputContract,
  };
}
