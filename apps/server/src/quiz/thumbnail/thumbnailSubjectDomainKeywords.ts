import type { SubjectDomainCategory } from "./thumbnailSubjectDomain.types.js";

/** Ordered keyword rules; the first rule whose keyword appears in the topic text wins. */
export const SUBJECT_DOMAIN_KEYWORD_RULES: ReadonlyArray<{ domain: SubjectDomainCategory; keywords: readonly string[] }> = [
  {
    domain: "medical",
    keywords: ["clinic", "first aid", "medical", "hospital", "doctor", "nurse", "healthcare", "ambulance", "surgery", "救急", "医療", "병원", "의료", "急救", "医疗"],
  },
  {
    domain: "space",
    keywords: ["solar system", "planet", "space", "astronomy", "mars", "jupiter", "saturn", "cosmos", "galaxy", "宇宙", "太空"],
  },
  {
    domain: "gaming",
    keywords: ["game", "gaming", "arcade", "nintendo", "playstation", "minecraft", "roblox", "fortnite", "esports", "ゲーム", "게임", "游戏"],
  },
  {
    domain: "science",
    keywords: ["science lab", "physics", "chemistry", "biology", "laboratory", "scientist", "experiment", "atom", "dna", "molecule"],
  },
  {
    domain: "norse",
    keywords: ["norse", "viking", "valhalla", "thor", "odin", "loki", "ragnarok", "asgard", "runes", "midgard", "jotunheim", "valkyrie"],
  },
  {
    domain: "greek",
    keywords: ["greek myth", "greek god", "olympus", "zeus", "poseidon", "hades", "athena", "hercules"],
  },
  {
    domain: "history",
    keywords: ["ancient", "empire", "civilization", "roman", "medieval", "dynasty", "knight", "samurai", "egypt", "pharaoh", "pyramid", "anubis", "sphinx", "hieroglyph"],
  },
  {
    domain: "ocean",
    keywords: ["ocean", "marine", "sea", "underwater", "shark", "whale", "coral", "abyss", "deep sea", "submarine"],
  },
  {
    domain: "food",
    keywords: ["bake", "cookie", "biscuit", "pastry", "dessert", "culinary", "food", "cooking", "chef", "restaurant", "pizza", "burger"],
  },
  {
    domain: "animals",
    keywords: ["animal", "wildlife", "safari", "creature", "mammal", "zoo"],
  },
  {
    domain: "school",
    keywords: ["school", "classroom", "student", "teacher", "campus", "homework", "academy"],
  },
  {
    domain: "supercars",
    keywords: ["supercar", "hypercar", "racing", "racecar", "motorsport"],
  },
  {
    domain: "fantasy",
    keywords: ["mythology", "dragon", "wizard", "magic", "fantasy"],
  },
];
