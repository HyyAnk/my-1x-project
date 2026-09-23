import type { QuizGameplayArchetypeId, QuizQuestionFormat, ResolvedQuizLayoutId } from "@studio/shared";

export interface TopicSlotArchetypeDefinition {
  name: string;
  archetype: QuizGameplayArchetypeId;
  suggestedLayout: ResolvedQuizLayoutId;
  quizFormat: QuizQuestionFormat;
  contentKind: "episode" | "short_reel";
  description: string;
}

export const EPISODE_ARCHETYPE_DEFINITIONS: readonly TopicSlotArchetypeDefinition[] = [
  {
    name: "Deep Trivia (Episode)",
    archetype: "deep_trivia",
    suggestedLayout: "media_left_choices_right",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Knowledge/story quiz with a single hero subject scene",
  },
  {
    name: "Silhouette / Mystery Reveal (Episode)",
    archetype: "mystery_reveal",
    suggestedLayout: "mystery_reveal",
    quizFormat: "image_guess",
    contentKind: "episode",
    description: "Guess animal/object/food through shadow/silhouette or pixelated mosaic, revealed with laser scanner wipe",
  },
  {
    name: "True or False (Episode)",
    archetype: "verdict_true_false",
    suggestedLayout: "verdict_true_false",
    quizFormat: "true_false",
    contentKind: "episode",
    description: "Surprising truths and misconceptions with True/False verdict",
  },
  {
    name: "Visual Spotting (Episode)",
    archetype: "visual_spotting",
    suggestedLayout: "visual_choices_three_pure",
    quizFormat: "odd_one_out",
    contentKind: "episode",
    description: "Spot the anomaly, intruder, or odd one out across 3 visual choices",
  },
  {
    name: "Visual Identification (Episode)",
    archetype: "visual_identification",
    suggestedLayout: "visual_choices_three",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Visual recognition challenge across 3 labeled visual clue cards",
  },
  {
    name: "Speed Blitz (Episode)",
    archetype: "speed_blitz",
    suggestedLayout: "full_stack_list",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Fast-paced rapid reflex riddles or tricky wordplay in clean stacked layout",
  },
  {
    name: "Versus Face-off (Episode)",
    archetype: "versus_faceoff",
    suggestedLayout: "split_versus_two",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Head-to-head comparison and 1v1 showdown across balanced split screen",
  },
] as const;

export const SHORT_REEL_ARCHETYPE_DEFINITIONS: readonly TopicSlotArchetypeDefinition[] = [
  {
    name: "Versus Face-off (Short-Reel)",
    archetype: "versus_faceoff",
    suggestedLayout: "split_versus_two",
    quizFormat: "multiple_choice",
    contentKind: "short_reel",
    description: "1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
  {
    name: "Deep Trivia (Short-Reel)",
    archetype: "deep_trivia",
    suggestedLayout: "media_left_choices_right",
    quizFormat: "multiple_choice",
    contentKind: "short_reel",
    description: "Deep Trivia Short-Reel (9:16 vertical, 1 question)",
  },
  {
    name: "True or False (Short-Reel)",
    archetype: "verdict_true_false",
    suggestedLayout: "verdict_true_false",
    quizFormat: "true_false",
    contentKind: "short_reel",
    description: "True or False Short-Reel verdict showdown (9:16 vertical, 1 question)",
  },
] as const;

export function shuffleArray<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRandomSlotDefinitions(): Array<TopicSlotArchetypeDefinition & { slot: number }> {
  const shuffledEpisodes = shuffleArray(EPISODE_ARCHETYPE_DEFINITIONS).slice(0, 4);
  const shuffledShorts = shuffleArray(SHORT_REEL_ARCHETYPE_DEFINITIONS);
  const extraShort = shuffledShorts[Math.floor(Math.random() * shuffledShorts.length)];
  const fourShorts = [...shuffledShorts, extraShort];

  return [
    { ...shuffledEpisodes[0], slot: 1 },
    { ...shuffledEpisodes[1], slot: 2 },
    { ...shuffledEpisodes[2], slot: 3 },
    { ...shuffledEpisodes[3], slot: 4 },
    { ...fourShorts[0], slot: 5 },
    { ...fourShorts[1], slot: 6 },
    { ...fourShorts[2], slot: 7 },
    { ...fourShorts[3], slot: 8 },
  ];
}

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
  {
    id: "global_brands",
    title: "Global Brands & Icons",
    description: "World-famous corporate brands, iconic logos, tech giants, automotive legends, and consumer empires.",
  },
  {
    id: "anime_manga",
    title: "Anime & Manga Universe",
    description: "Iconic anime series, legendary shonen heroes, psychological thrillers, mecha epics, and Studio Ghibli masterpieces.",
  },
  {
    id: "gaming_esports",
    title: "Video Games & Esports",
    description: "Legendary video game franchises, esports titles, gaming icons, sandbox worlds, and RPG lore.",
  },
  {
    id: "modern_cinema_tv",
    title: "Modern Pop Franchises & Cinema",
    description: "Iconic movie franchises, superhero universes, sci-fi space sagas, fantasy epics, and binge-worthy TV series.",
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
    name: "Visual Identification (Episode)",
    archetype: "visual_identification" as const,
    suggestedLayout: "visual_choices_three" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "episode" as const,
    description: "Visual recognition challenge across 3 labeled visual clue cards",
  },
  {
    slot: 5,
    name: "Versus Face-off (Short-Reel)",
    archetype: "versus_faceoff" as const,
    suggestedLayout: "split_versus_two" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
  {
    slot: 6,
    name: "Deep Trivia (Short-Reel)",
    archetype: "deep_trivia" as const,
    suggestedLayout: "media_left_choices_right" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "Deep Trivia Short-Reel (9:16 vertical, 1 question)",
  },
  {
    slot: 7,
    name: "True or False (Short-Reel)",
    archetype: "verdict_true_false" as const,
    suggestedLayout: "verdict_true_false" as const,
    quizFormat: "true_false" as const,
    contentKind: "short_reel" as const,
    description: "True or False Short-Reel verdict showdown (9:16 vertical, 1 question)",
  },
  {
    slot: 8,
    name: "Versus Clash (Short-Reel)",
    archetype: "versus_faceoff" as const,
    suggestedLayout: "split_versus_two" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "High-stakes 1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
] as const;

export const KEYWORD_SYNONYMS: Record<string, string[]> = {
  anime_manga: ["anime", "manga", "anime legends", "animation", "otaku", "shonen", "ghibli"],
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
  gaming_esports: ["gaming", "esports", "video games", "game", "games", "gamer", "rpg", "nintendo", "playstation"],
  global_brands: ["brand", "brands", "company", "logo", "corporate", "tech giant", "iconic"],
  human_body: ["body", "anatomy", "biology", "health", "senses", "organs", "physiology"],
  modern_cinema_tv: ["cinema", "movie", "movies", "tv", "series", "hollywood", "superhero", "film"],
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
