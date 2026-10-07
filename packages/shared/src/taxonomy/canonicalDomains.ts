/**
 * Canonical domain metadata, titles, and formatting helpers across the studio taxonomy.
 */

export interface CanonicalDomainInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const CANONICAL_DOMAIN_META: Record<string, CanonicalDomainInfo> = {
  anime_manga: {
    id: "anime_manga",
    title: "Anime & Manga Universe",
    description: "Iconic anime series, legendary shonen heroes, psychological thrillers, mecha epics, and Studio Ghibli masterpieces.",
    icon: "Tv",
  },
  careers_occupations: {
    id: "careers_occupations",
    title: "Careers & Occupations",
    description: "Professions, skilled trades, emergency services, and extreme careers.",
    icon: "Briefcase",
  },
  countries_nations: {
    id: "countries_nations",
    title: "Countries & Nations",
    description: "World geography, iconic landmarks, flags, and cultural heritage.",
    icon: "Globe",
  },
  daily_objects: {
    id: "daily_objects",
    title: "Daily Objects & Household Essentials",
    description: "Everyday personal items, home living objects, tools, and kitchenware.",
    icon: "House",
  },
  food_gastronomy: {
    id: "food_gastronomy",
    title: "Food & Gastronomy",
    description: "Culinary traditions, global cuisine, pastries, ingredients, and street food.",
    icon: "Utensils",
  },
  gaming_esports: {
    id: "gaming_esports",
    title: "Video Games & Esports",
    description: "Legendary video game franchises, esports titles, gaming icons, sandbox worlds, and RPG lore.",
    icon: "Gamepad2",
  },
  global_brands: {
    id: "global_brands",
    title: "Global Brands & Icons",
    description: "World-famous corporate brands, iconic logos, tech giants, automotive legends, and consumer empires.",
    icon: "Award",
  },
  human_body: {
    id: "human_body",
    title: "Human Body & Biology",
    description: "Anatomy, biological systems, senses, organs, and physiology.",
    icon: "Heart",
  },
  modern_cinema_tv: {
    id: "modern_cinema_tv",
    title: "Modern Pop Franchises & Cinema",
    description: "Iconic movie franchises, superhero universes, sci-fi space sagas, fantasy epics, and binge-worthy TV series.",
    icon: "Film",
  },
  music_instruments_gear: {
    id: "music_instruments_gear",
    title: "Music Instruments & Audio Gear",
    description: "Acoustic and electric instruments, studio hardware, sound engineering, and gear.",
    icon: "Music",
  },
  mythology_creatures: {
    id: "mythology_creatures",
    title: "Mythology & Creatures",
    description: "Mythological pantheons, legendary beasts, folklore, and epic lore.",
    icon: "Flame",
  },
  nature_animals: {
    id: "nature_animals",
    title: "Nature & Animals",
    description: "Wildlife, animal superpowers, marine ecosystems, and biodiversity.",
    icon: "PawPrint",
  },
  places_facilities: {
    id: "places_facilities",
    title: "Places & Facilities",
    description: "Urban infrastructure, historic sites, architectural wonders, and civic spaces.",
    icon: "Building",
  },
  pop_culture_classics: {
    id: "pop_culture_classics",
    title: "Pop Culture & Classics",
    description: "Cinema legends, animation, gaming icons, classic literature, and art.",
    icon: "Film",
  },
  school_learning: {
    id: "school_learning",
    title: "School & Learning",
    description: "Classroom tools, educational science, foundational learning, and academic concepts.",
    icon: "GraduationCap",
  },
  space_earth: {
    id: "space_earth",
    title: "Space & Earth",
    description: "Cosmic wonders, astronomy, planetary science, and natural phenomena.",
    icon: "Compass",
  },
  sports_games: {
    id: "sports_games",
    title: "Sports & Games",
    description: "Athletic sports, board games, tabletop challenges, and competitive play.",
    icon: "Trophy",
  },
  vehicles_technology: {
    id: "vehicles_technology",
    title: "Vehicles & Technology",
    description: "Aviation, automotive, robotics, computing breakthroughs, and transport.",
    icon: "Cpu",
  },
};

const CANONICAL_DOMAIN_KEYWORD_RULES: Record<string, string[]> = {
  anime_manga: ["anime", "manga", "otaku", "shonen", "ghibli", "naruto", "one piece", "dragon ball"],
  careers_occupations: ["career", "careers", "profession", "professions", "occupation", "occupations", "doctor", "police", "firefighter"],
  countries_nations: ["country", "countries", "nation", "nations", "geography", "flag", "flags", "capital", "landmark", "landmarks"],
  daily_objects: ["daily object", "household", "kitchen", "furniture", "tool", "appliance", "gadget"],
  food_gastronomy: ["food", "dish", "dishes", "culinary", "cuisine", "cooking", "pastry", "ingredient", "ingredients", "chef", "recipe"],
  gaming_esports: ["gaming", "esports", "video game", "video games", "nintendo", "playstation", "xbox", "rpg", "gamer"],
  global_brands: ["brand", "brands", "company", "logo", "corporate", "iconic logo", "apple", "nike", "google"],
  human_body: ["body", "anatomy", "biology", "organ", "organs", "physiology", "human body", "health"],
  modern_cinema_tv: ["cinema", "movie", "movies", "film", "hollywood", "superhero", "marvel", "star wars"],
  music_instruments_gear: ["music", "instrument", "instruments", "guitar", "piano", "drums", "audio", "gear"],
  mythology_creatures: ["myth", "mythology", "creature", "creatures", "legend", "folklore", "god", "gods", "monster", "dragon"],
  nature_animals: ["animal", "animals", "wildlife", "nature", "mammal", "bird", "fish", "ocean", "predator", "safari", "forest", "dinosaur"],
  places_facilities: ["place", "places", "facility", "facilities", "airport", "stadium", "hospital", "museum", "architecture"],
  pop_culture_classics: ["pop culture", "classic", "classics", "literature", "fairy tale", "retro"],
  school_learning: ["school", "learning", "classroom", "student", "teacher", "academy", "education", "math", "science"],
  space_earth: ["space", "earth", "planet", "planets", "astronomy", "cosmic", "cosmos", "solar system", "galaxy", "universe", "star", "stars"],
  sports_games: ["sport", "sports", "football", "soccer", "basketball", "tennis", "olympics", "board game", "chess"],
  vehicles_technology: ["vehicle", "vehicles", "car", "cars", "plane", "airplane", "aviation", "robot", "robotics", "tech", "technology", "ai"],
};

/**
 * Returns the human-readable canonical domain title for a given domain identifier.
 * Falls back to title-casing the domainId, or empty string if absent.
 */
export function formatCanonicalDomainName(domainId?: string | null): string {
  if (!domainId) return "";
  const canonical = CANONICAL_DOMAIN_META[domainId];
  if (canonical) return canonical.title;
  return domainId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Infers a canonical domain ID from contextual text (such as topic title or premise).
 */
export function inferCanonicalDomainFromText(text?: string | null): string | undefined {
  if (!text) return undefined;
  const normalized = text.toLowerCase();
  for (const [domainId, keywords] of Object.entries(CANONICAL_DOMAIN_KEYWORD_RULES)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return domainId;
    }
  }
  return undefined;
}
