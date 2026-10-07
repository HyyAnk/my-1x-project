import type { ThumbnailLayoutType } from "@studio/shared";
import type { MascotThemedPersona } from "./thumbnailTypes.js";

const MEDICAL_KEYWORDS = [
  "clinic",
  "first aid",
  "medical",
  "hospital",
  "doctor",
  "nurse",
  "healthcare",
  "ambulance",
  "surgery",
  "paramedic",
  "stethoscope",
  "救急",
  "医療",
  "病院",
  "医学",
  "응급",
  "의료",
  "병원",
  "医疗",
  "急救",
  "医院",
];
const SCHOOL_KEYWORDS = [
  "school",
  "classroom",
  "student",
  "teacher",
  "campus",
  "homework",
  "academy",
  "学校",
  "教室",
  "学生",
  "先生",
  "학교",
  "교실",
  "학생",
  "课堂",
];
const GAMING_KEYWORDS = [
  "game",
  "gaming",
  "arcade",
  "nintendo",
  "playstation",
  "minecraft",
  "roblox",
  "fortnite",
  "esports",
  "videogame",
  "ゲーム",
  "ゲーマー",
  "게임",
  "游戏",
  "电竞",
];
const NORSE_KEYWORDS = [
  "norse",
  "viking",
  "valhalla",
  "thor",
  "odin",
  "loki",
  "ragnarok",
  "asgard",
  "runes",
  "nordic",
  "midgard",
  "jotunheim",
  "valkyrie",
  "北欧",
  "ヴァイキング",
  "바이킹",
  "维京",
];
const GREEK_KEYWORDS = [
  "greek myth",
  "greek god",
  "olympus",
  "zeus",
  "poseidon",
  "hades",
  "athena",
  "hercules",
  "spartan",
  "olympian",
  "ギリシャ神話",
  "그리스 신화",
  "希腊神话",
];
const EGYPT_KEYWORDS = [
  "egypt",
  "pharaoh",
  "pyramid",
  "anubis",
  "horus",
  "cleopatra",
  "mummy",
  "sphinx",
  "hieroglyph",
  "エジプト",
  "이집트",
  "埃及",
];
const SAMURAI_KEYWORDS = [
  "samurai",
  "ninja",
  "shogun",
  "yokai",
  "katana",
  "shinobi",
  "edo",
  "bushido",
  "侍",
  "忍者",
  "武士",
];
const KNIGHT_KEYWORDS = [
  "knight",
  "excalibur",
  "king arthur",
  "crusade",
  "paladin",
  "round table",
  "騎士",
  "기사",
  "骑士",
];
const FANTASY_KEYWORDS = [
  "mythology",
  "greek gods",
  "fantasy realm",
  "dragon",
  "wizard",
  "magic spells",
  "fairy tale",
  "神話",
  "ファンタジー",
  "魔法",
  "ドラゴン",
  "신화",
  "판타지",
  "마법",
  "神话",
  "奇幻",
];
const TECH_KEYWORDS = [
  "future tech",
  "artificial intelligence",
  "cyberpunk",
  "quantum",
  "robotics lab",
  "coding quiz",
  "nanotech",
  "programming",
  "人工知能",
  "미래기술",
  "科技",
];
const MOVIE_KEYWORDS = [
  "blockbuster movie",
  "cinema",
  "hollywood",
  "oscar",
  "films",
  "director",
  "actor",
  "映画",
  "シネマ",
  "영화",
  "电影",
];
const SPORTS_KEYWORDS = [
  "sports",
  "football",
  "soccer",
  "basketball",
  "tennis",
  "olympics",
  "athlete",
  "championship",
  "スポーツ",
  "サッカー",
  "스포츠",
  "축구",
  "体育",
  "足球",
];
const ANIMAL_KEYWORDS = ["animal", "wildlife", "safari", "creature", "mammal", "zoo", "動物", "动物", "野生动物"];
const SPACE_KEYWORDS = ["space", "astronomy", "universe", "galaxy", "cosmos", "planet", "solar system"];
const HISTORY_KEYWORDS = ["history", "egypt", "pyramid", "ancient", "medieval", "pharaoh", "gladiator", "roman"];
const SCIENCE_KEYWORDS = ["science", "physics", "chemistry", "brain", "laboratory", "scientist", "dna"];
const BAKE_KEYWORDS = ["bake", "cookie", "biscuit", "pastry", "culinary", "dessert"];
const RACING_KEYWORDS = ["supercar", "hypercar", "racing", "racecar"];
const OCEAN_KEYWORDS = ["ocean", "sea", "marine", "fish", "shark", "whale", "submarine"];

function hasKeyword(topic: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => topic.includes(kw));
}

/**
 * Maps topic keywords to themed mascot costume, props, and actions across 16+ domains.
 */
export function resolveMascotThemedPersona(
  topicLower: string,
  layout: ThumbnailLayoutType,
  defaultPersona: { role: string; defaultCostume: string; defaultProp: string; defaultExpression: string },
): MascotThemedPersona {
  if (layout === "difficulty_tier") {
    return {
      role: "Overloaded Genius",
      costume: "Lab coat or high-tech cybernetic thinking suit",
      prop: "Cartoon steam puffing from ears and glowing cosmic brain aura",
      expression: "Comically overwhelmed with dizzy spiral eyes and mouth open in shock",
      poseDescription: "Staggering comically next to the Level 4 impossible challenge with mind-blown reaction",
    };
  }

  if (layout === "split_vs") {
    return {
      role: "Referee / Confused Judge",
      costume: "Black-and-white striped referee jersey with a whistle",
      prop: "Holding a referee flag or scratching head",
      expression: "Hilariously conflicted, looking back and forth between both choices",
      poseDescription: "Positioned right between the two competing sides with a funny indecisive stance",
    };
  }

  if (layout === "mystery_silhouette" && defaultPersona.role === "Master Detective") {
    return {
      role: "Master Detective",
      costume: defaultPersona.defaultCostume,
      prop: defaultPersona.defaultProp,
      expression: defaultPersona.defaultExpression,
      poseDescription: "Positioned dynamically to guide the viewer's attention to the challenge",
    };
  }

  if (layout === "odd_one_out" && defaultPersona.role === "Sharp Investigator") {
    return {
      role: "Sharp Investigator",
      costume: defaultPersona.defaultCostume,
      prop: defaultPersona.defaultProp,
      expression: defaultPersona.defaultExpression,
      poseDescription: "Positioned dynamically to guide the viewer's attention to the challenge",
    };
  }

  // 1. Medical / First Aid / School Clinic
  if (hasKeyword(topicLower, MEDICAL_KEYWORDS)) {
    return {
      role: "School Clinic Doctor & First Aid Hero",
      costume: "Clean white clinic coat over cheerful teal scrubs with red cross badge and pocket penlight",
      prop: "Gentle acoustic medical stethoscope and clean first aid pouch",
      expression: "Empathetic, reassuring, friendly heroic smile with warm sparkling eyes",
      poseDescription: "Standing heroically with a friendly reassuring posture, gesturing toward the clinic first aid challenge",
    };
  }

  // 2. School / Campus / Education
  if (hasKeyword(topicLower, SCHOOL_KEYWORDS)) {
    return {
      role: "Campus Honors Student",
      costume: "Smart navy school academy blazer, crisp white collar, and round spectacles",
      prop: "Leather-bound school notebook and golden fountain pen",
      expression: "Enthusiastic, bright, smiling with academic excitement",
      poseDescription: "Proudly presenting the school classroom challenge with animated academic flair",
    };
  }

  // 3. Gaming / Arcade / Esports
  if (hasKeyword(topicLower, GAMING_KEYWORDS)) {
    return {
      role: "Pro Esports Champion",
      costume: "Sleek cyberpunk hoodie with glowing neon RGB trim and pro gamer headset",
      prop: "Next-gen ergonomic wireless game controller with glowing buttons",
      expression: "Hyped, focused, thrilled with an energetic smirk",
      poseDescription: "Ready for battle with game controller in hand, gesturing with esports confidence",
    };
  }

  // 4a. Norse / Viking Mythology
  if (hasKeyword(topicLower, NORSE_KEYWORDS)) {
    return {
      role: "Norse Viking Hero Explorer",
      costume: "Authentic Nordic Viking warrior tunic with stitched leather bracers, cozy sheepskin fur-trimmed mantle, and runic bronze belt buckle",
      prop: "Miniature golden-engraved Thor's battle hammer (Mjolnir) crackling with soft lightning motes",
      expression: "Bold, courageous, proud Viking adventurer grin with gleaming determined eyes",
      poseDescription: "Hoisting the runic Nordic relic with heroic Viking bravery beside the challenge",
    };
  }

  // 4b. Greek / Roman Mythology
  if (hasKeyword(topicLower, GREEK_KEYWORDS)) {
    return {
      role: "Mythic Olympian Hero",
      costume: "Celestial white chiton tunic with golden laurel wreath and polished bronze breastplate",
      prop: "Golden crackling lightning bolt or gleaming Olympian sun shield",
      expression: "Noble, radiant, triumphant mythical heroic expression",
      poseDescription: "Commanding the heavens with mythical grace beside the challenge",
    };
  }

  // 4c. Egyptian Mythology & Antiquity
  if (hasKeyword(topicLower, EGYPT_KEYWORDS)) {
    return {
      role: "Royal Egyptian Guardian",
      costume: "Ornate royal linen nemes tunic with turquoise lapis-lazuli collar necklace and gold falcon wristbands",
      prop: "Gleaming golden Ankh scepter with glowing hieroglyphic inscriptions",
      expression: "Regal, wise, captivating mysterious smile",
      poseDescription: "Presenting the ancient golden tomb secret with graceful Egyptian nobility",
    };
  }

  // 4d. Japanese Folklore / Samurai / Ninja
  if (hasKeyword(topicLower, SAMURAI_KEYWORDS)) {
    return {
      role: "Legendary Samurai Champion",
      costume: "Traditional braided samurai armor with crimson silk sash and lacquered shoulder guards",
      prop: "Polished katana scabbard with golden dragon tsuba guard",
      expression: "Focused, honorable, disciplined warrior gaze with subtle confident smile",
      poseDescription: "Standing with honorable martial poise alongside the challenge",
    };
  }

  // 4e. Medieval Knights
  if (hasKeyword(topicLower, KNIGHT_KEYWORDS)) {
    return {
      role: "Noble Knight Champion",
      costume: "Polished steel knight plate armor with royal lion crest tabard and chainmail coif",
      prop: "Gleaming ceremonial longsword with jeweled crossguard",
      expression: "Gallant, brave, warm heroic smile",
      poseDescription: "Saluting with the knightly sword with chivalric honor beside the challenge",
    };
  }

  // 4. Fantasy / Arcane Magic
  if (hasKeyword(topicLower, FANTASY_KEYWORDS)) {
    return {
      role: "Mythic Arcane Wizard Apprentice",
      costume: "Royal purple velvet wizard robe adorned with golden celestial stars and silver clasp",
      prop: "Glowing crystalline star wand with swirling magical stardust sparkles",
      expression: "Mystical, delighted, eyes shining with wondrous enchantment",
      poseDescription: "Conjuring magical glowing sparkles toward the quiz challenge with theatrical wizardly wonder",
    };
  }

  // 5. Tech / AI / Cyber
  if (hasKeyword(topicLower, TECH_KEYWORDS)) {
    return {
      role: "Cyber Tech Pioneer",
      costume: "Futuristic white cybernetic jumpsuit with luminous cyan circuit piping",
      prop: "Floating holographic digital tablet displaying interactive neon data",
      expression: "Clever, visionary, proud tech genius smile",
      poseDescription: "Interacting with a futuristic holographic display with tech-savvy excitement",
    };
  }

  // 6. Movies / Cinema
  if (hasKeyword(topicLower, MOVIE_KEYWORDS)) {
    return {
      role: "Hollywood Film Director",
      costume: "Stylish beret, creative director scarf, and vintage brass viewfinder necklace",
      prop: "Classic wooden movie scene clapperboard and golden megaphone",
      expression: "Theatrical, passionate, eyes wide with cinematic drama",
      poseDescription: "Calling 'Action!' with dramatic cinematic flair beside the challenge",
    };
  }

  // 7. Sports / Athletics
  if (hasKeyword(topicLower, SPORTS_KEYWORDS)) {
    return {
      role: "All-Star Team Coach",
      costume: "Retro varsity athletic track jacket with sports whistle necklace and striped sweatband",
      prop: "Golden coaching playbook clipboard with tactical chalkboard notes",
      expression: "Motivational, spirited, cheering with radiant athletic energy",
      poseDescription: "Cheering the audience forward with an inspiring athletic team pump",
    };
  }

  // 8. Animals / Wildlife
  if (hasKeyword(topicLower, ANIMAL_KEYWORDS)) {
    return {
      role: "Wildlife Park Ranger",
      costume: "Friendly wildlife park ranger uniform with safari khaki shirt and green conservation badge",
      prop: "Compact birdwatching binoculars and animal tracker field guide",
      expression: "Gentle, adventurous, smiling with genuine love for animals",
      poseDescription: "Crouched in friendly observation, guiding attention to wildlife creatures",
    };
  }

  // 9. Space / Astronomy
  if (hasKeyword(topicLower, SPACE_KEYWORDS)) {
    return {
      role: "Space Explorer",
      costume: "Cute transparent mini astronaut space helmet and futuristic cosmic scout suit",
      prop: "Glowing miniature crescent moon or glowing cosmic star",
      expression: "Amazed, wide sparkling eyes, curious open smile",
      poseDescription: "Floating weightlessly in cosmic awe, reaching out toward the mystery planets with wonder",
    };
  }

  // 10. History / Ancient
  if (hasKeyword(topicLower, HISTORY_KEYWORDS)) {
    return {
      role: "Archaeologist Explorer",
      costume: "Vintage adventurer leather jacket and safari explorer hat",
      prop: "Golden blazing explorer torch and antique golden key",
      expression: "Determined, adventurous, eyes shining with excitement",
      poseDescription: "Illuminating ancient secrets with the torch",
    };
  }

  // 11. Science / Lab
  if (hasKeyword(topicLower, SCIENCE_KEYWORDS)) {
    return {
      role: "Genius Scientist",
      costume: "White lab coat with round nerdy spectacles",
      prop: "Bubbling colorful test tube or glowing hologram brain",
      expression: "Intrigued, inquisitive, eyebrow raised cleverly",
      poseDescription: "Holding the scientific discovery up proudly",
    };
  }

  // 12. Bakery / Pastry
  if (hasKeyword(topicLower, BAKE_KEYWORDS)) {
    return {
      role: "Master Pastry Chef",
      costume: "White chef hat and baker apron with flour dusted pockets",
      prop: "Wooden rolling pin or tray of golden warm freshly baked cookies",
      expression: "Delighted, proud, mouth-watering happy smile",
      poseDescription: "Enthusiastically presenting the delicious world bakery challenge",
    };
  }

  // 13. Supercars / Racing
  if (hasKeyword(topicLower, RACING_KEYWORDS)) {
    return {
      role: "Pro Racing Driver",
      costume: "High-speed aerodynamic racing driver jumpsuit and racing helmet",
      prop: "Black-and-white checkered finish flag or golden championship trophy",
      expression: "Adrenaline pumped, confident smirk, eyes shining",
      poseDescription: "Giving a triumphant thumbs up beside the track challenge",
    };
  }

  // 14. Ocean / Marine
  if (hasKeyword(topicLower, OCEAN_KEYWORDS)) {
    return {
      role: "Deep Sea Diver",
      costume: "Retro scuba diving goggles and bright aquatic life vest",
      prop: "Underwater tactical flashlight and glowing seashell",
      expression: "Delighted, surprised, eyes wide with discovery",
      poseDescription: "Swimming alongside marine creatures, waving enthusiastically",
    };
  }

  // Fallback to layout default persona (Explorer for mega_grid)
  return {
    role: defaultPersona.role,
    costume: defaultPersona.defaultCostume,
    prop: defaultPersona.defaultProp,
    expression: defaultPersona.defaultExpression,
    poseDescription: "Positioned dynamically to guide the viewer's attention to the challenge",
  };
}
