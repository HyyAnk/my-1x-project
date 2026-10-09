import { CANONICAL_DOMAIN_META } from "@studio/shared";

export interface TopicDomainOption {
  id: string;
  title: string;
  description: string;
}

/** Broad kid favorites lead so a planner that falls back to the first domain lands on a safe, popular subject. */
const FALLBACK_DOMAIN_PRIORITY: readonly string[] = ["nature_animals", "space_earth", "pets_farm_animals", "dinosaurs_prehistoric"];

function fallbackPriority(domainId: string): number {
  const rank = FALLBACK_DOMAIN_PRIORITY.indexOf(domainId);
  return rank === -1 ? FALLBACK_DOMAIN_PRIORITY.length : rank;
}

/** Every canonical domain, derived from the shared taxonomy metadata so the two lists never drift apart. */
export const CANONICAL_FALLBACK_DOMAINS: TopicDomainOption[] = Object.values(CANONICAL_DOMAIN_META)
  .map(({ id, title, description }) => ({ id, title, description }))
  .sort((a, b) => fallbackPriority(a.id) - fallbackPriority(b.id));

/** Topic-hint vocabulary per domain, matched against tokenized hints and bank question keywords. */
export const KEYWORD_SYNONYMS: Record<string, string[]> = {
  anime_manga: ["anime", "manga", "anime legends", "animation", "otaku", "shonen", "ghibli", "pokemon", "doraemon"],
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
  daily_objects: ["object", "objects", "household", "home", "kitchen", "tool", "tools", "appliance", "everyday"],
  dinosaurs_prehistoric: ["dinosaur", "dinosaurs", "dino", "dinos", "prehistoric", "fossil", "fossils", "jurassic", "mammoth", "trex"],
  festivals_cultures: [
    "festival",
    "festivals",
    "holiday",
    "holidays",
    "celebration",
    "celebrations",
    "tradition",
    "traditions",
    "culture",
    "cultures",
    "costume",
  ],
  food_gastronomy: ["food", "dish", "dishes", "culinary", "cuisine", "cooking", "pastry", "ingredients", "dessert", "snack"],
  fruits_vegetables_plants: [
    "fruit",
    "fruits",
    "vegetable",
    "vegetables",
    "veggie",
    "veggies",
    "plant",
    "plants",
    "flower",
    "flowers",
    "tree",
    "trees",
    "garden",
  ],
  gaming_esports: ["gaming", "video games", "game", "games", "gamer", "nintendo", "mario", "minecraft"],
  global_brands: ["brand", "brands", "company", "logo", "logos", "iconic"],
  human_body: ["body", "anatomy", "biology", "health", "senses", "organs", "physiology", "bones", "muscles"],
  modern_cinema_tv: ["cinema", "movie", "movies", "film", "films", "superhero", "pixar", "disney"],
  music_instruments_gear: ["music", "musical", "instrument", "instruments", "song", "sound", "band", "orchestra"],
  mythology_creatures: [
    "myth",
    "mythology",
    "creature",
    "creatures",
    "legend",
    "legends",
    "folklore",
    "god",
    "gods",
    "monster",
    "monsters",
  ],
  nature_animals: ["animal", "animals", "wildlife", "nature", "creature", "creatures", "safari", "biodiversity", "ocean", "jungle"],
  pets_farm_animals: ["pet", "pets", "dog", "dogs", "cat", "cats", "puppy", "kitten", "farm", "barnyard"],
  places_facilities: ["place", "places", "building", "buildings", "city", "town", "museum", "park", "station"],
  pop_culture_classics: ["pop", "culture", "classic", "classics", "cartoon", "cartoons", "animation", "fairy", "tales", "art"],
  school_learning: ["school", "classroom", "learning", "stationery", "shapes", "teacher", "student"],
  science_how_things_work: [
    "science",
    "experiment",
    "experiments",
    "physics",
    "inventor",
    "inventors",
    "scientist",
    "scientists",
    "machine",
    "machines",
    "magnet",
  ],
  space_earth: ["space", "earth", "astronomy", "planet", "planets", "cosmic", "cosmos", "galaxy", "universe", "weather"],
  sports_games: ["sport", "sports", "athlete", "olympics", "ball", "board", "puzzle", "puzzles", "arcade"],
  toys_playground: ["toy", "toys", "playground", "play", "playtime", "outdoor"],
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
    "train",
    "rocket",
  ],
};
