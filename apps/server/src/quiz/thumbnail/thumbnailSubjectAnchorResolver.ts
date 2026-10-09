import type { ThumbnailLayoutType } from "@studio/shared";
import type { QuizSubjectAnchor, ResolveThumbnailInput } from "./thumbnailTypes.js";

export type SubjectDomainCategory =
  | "medical"
  | "space"
  | "gaming"
  | "science"
  | "norse"
  | "greek"
  | "history"
  | "ocean"
  | "food"
  | "animals"
  | "school"
  | "supercars"
  | "fantasy"
  | "general";

/**
 * Detects topic domain category from title and summary keywords.
 */
export function detectSubjectDomain(topicLower: string): SubjectDomainCategory {
  if (
    topicLower.includes("clinic") ||
    topicLower.includes("first aid") ||
    topicLower.includes("medical") ||
    topicLower.includes("hospital") ||
    topicLower.includes("doctor") ||
    topicLower.includes("nurse") ||
    topicLower.includes("healthcare") ||
    topicLower.includes("ambulance") ||
    topicLower.includes("surgery") ||
    topicLower.includes("救急") ||
    topicLower.includes("医療") ||
    topicLower.includes("병원") ||
    topicLower.includes("의료") ||
    topicLower.includes("急救") ||
    topicLower.includes("医疗")
  ) {
    return "medical";
  }

  if (
    topicLower.includes("solar system") ||
    topicLower.includes("planet") ||
    topicLower.includes("space") ||
    topicLower.includes("astronomy") ||
    topicLower.includes("mars") ||
    topicLower.includes("jupiter") ||
    topicLower.includes("saturn") ||
    topicLower.includes("cosmos") ||
    topicLower.includes("galaxy") ||
    topicLower.includes("宇宙") ||
    topicLower.includes("太空")
  ) {
    return "space";
  }

  if (
    topicLower.includes("game") ||
    topicLower.includes("gaming") ||
    topicLower.includes("arcade") ||
    topicLower.includes("nintendo") ||
    topicLower.includes("playstation") ||
    topicLower.includes("minecraft") ||
    topicLower.includes("roblox") ||
    topicLower.includes("fortnite") ||
    topicLower.includes("esports") ||
    topicLower.includes("ゲーム") ||
    topicLower.includes("게임") ||
    topicLower.includes("游戏")
  ) {
    return "gaming";
  }

  if (
    topicLower.includes("science lab") ||
    topicLower.includes("physics") ||
    topicLower.includes("chemistry") ||
    topicLower.includes("biology") ||
    topicLower.includes("laboratory") ||
    topicLower.includes("scientist") ||
    topicLower.includes("experiment") ||
    topicLower.includes("atom") ||
    topicLower.includes("dna") ||
    topicLower.includes("molecule")
  ) {
    return "science";
  }

  if (
    topicLower.includes("norse") ||
    topicLower.includes("viking") ||
    topicLower.includes("valhalla") ||
    topicLower.includes("thor") ||
    topicLower.includes("odin") ||
    topicLower.includes("loki") ||
    topicLower.includes("ragnarok") ||
    topicLower.includes("asgard") ||
    topicLower.includes("runes") ||
    topicLower.includes("midgard") ||
    topicLower.includes("jotunheim") ||
    topicLower.includes("valkyrie")
  ) {
    return "norse";
  }

  if (
    topicLower.includes("greek myth") ||
    topicLower.includes("greek god") ||
    topicLower.includes("olympus") ||
    topicLower.includes("zeus") ||
    topicLower.includes("poseidon") ||
    topicLower.includes("hades") ||
    topicLower.includes("athena") ||
    topicLower.includes("hercules")
  ) {
    return "greek";
  }

  if (
    topicLower.includes("ancient") ||
    topicLower.includes("empire") ||
    topicLower.includes("civilization") ||
    topicLower.includes("roman") ||
    topicLower.includes("medieval") ||
    topicLower.includes("dynasty") ||
    topicLower.includes("knight") ||
    topicLower.includes("samurai") ||
    topicLower.includes("egypt") ||
    topicLower.includes("pharaoh") ||
    topicLower.includes("pyramid") ||
    topicLower.includes("anubis") ||
    topicLower.includes("sphinx") ||
    topicLower.includes("hieroglyph")
  ) {
    return "history";
  }

  if (
    topicLower.includes("ocean") ||
    topicLower.includes("marine") ||
    topicLower.includes("sea") ||
    topicLower.includes("underwater") ||
    topicLower.includes("shark") ||
    topicLower.includes("whale") ||
    topicLower.includes("coral") ||
    topicLower.includes("abyss") ||
    topicLower.includes("deep sea") ||
    topicLower.includes("submarine")
  ) {
    return "ocean";
  }

  if (
    topicLower.includes("bake") ||
    topicLower.includes("cookie") ||
    topicLower.includes("biscuit") ||
    topicLower.includes("pastry") ||
    topicLower.includes("dessert") ||
    topicLower.includes("culinary") ||
    topicLower.includes("food") ||
    topicLower.includes("cooking") ||
    topicLower.includes("chef") ||
    topicLower.includes("restaurant") ||
    topicLower.includes("pizza") ||
    topicLower.includes("burger")
  ) {
    return "food";
  }

  if (
    topicLower.includes("animal") ||
    topicLower.includes("wildlife") ||
    topicLower.includes("safari") ||
    topicLower.includes("creature") ||
    topicLower.includes("mammal") ||
    topicLower.includes("zoo")
  ) {
    return "animals";
  }

  if (
    topicLower.includes("school") ||
    topicLower.includes("classroom") ||
    topicLower.includes("student") ||
    topicLower.includes("teacher") ||
    topicLower.includes("campus") ||
    topicLower.includes("homework") ||
    topicLower.includes("academy")
  ) {
    return "school";
  }

  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("racing") ||
    topicLower.includes("racecar") ||
    topicLower.includes("motorsport")
  ) {
    return "supercars";
  }

  if (
    topicLower.includes("mythology") ||
    topicLower.includes("dragon") ||
    topicLower.includes("wizard") ||
    topicLower.includes("magic") ||
    topicLower.includes("fantasy")
  ) {
    return "fantasy";
  }

  return "general";
}

/**
 * Enriches choice text with topic domain context (e.g. "France" in a Cookie quiz -> "authentic specialty cookie representing France").
 */
export function contextualizeChoiceSubject(choice: string, topicLower: string): string {
  const trimmed = choice.trim();
  const domain = detectSubjectDomain(topicLower);

  switch (domain) {
    case "food":
      if (
        topicLower.includes("bake") ||
        topicLower.includes("cookie") ||
        topicLower.includes("biscuit") ||
        topicLower.includes("pastry") ||
        topicLower.includes("dessert") ||
        topicLower.includes("culinary")
      ) {
        return `delicious authentic specialty cookie or pastry representing ${trimmed}`;
      }
      return `delicious artisanal gourmet dish representing ${trimmed}`;

    case "supercars":
      return `luxury high-speed exotic sports car from ${trimmed}`;

    case "medical":
      return `essential emergency medical clinic item or tool: ${trimmed}`;

    case "school":
      return `essential school classroom educational item: ${trimmed}`;

    case "gaming":
      return `vibrant 3D arcade gaming artifact: ${trimmed}`;

    case "science":
      return `scientific laboratory research artifact representing ${trimmed}`;

    case "norse":
      return `authentic Norse mythical artifact or legendary figure: ${trimmed}`;

    case "greek":
      return `authentic Greek mythical Olympian artifact or hero: ${trimmed}`;

    case "history":
      return `authentic historical archaeological artifact representing ${trimmed}`;

    case "ocean":
      return `deep ocean marine life creature or aquatic artifact representing ${trimmed}`;

    case "animals":
      return `realistic 3D wildlife animal model of ${trimmed}`;

    case "space":
      return `celestial astronomical 3D model representing ${trimmed}`;

    case "fantasy":
      return `magical mythic fantasy artifact representing ${trimmed}`;

    default:
      if (topicLower.includes("weapon") || topicLower.includes("sword") || topicLower.includes("blade") || topicLower.includes("armor")) {
        return `legendary iconic artifact weapon representing ${trimmed}`;
      }
      return trimmed;
  }
}

/**
 * Strips question words, auxiliary verbs, and punctuation to extract pure visual noun subjects.
 */
export function cleanSubjectFromQuestion(question: string, answer?: string): string {
  if (answer && answer.trim().length > 0 && answer.trim().length < 40) {
    return answer.trim();
  }
  let cleaned = question
    .replace(/^(which|what|where|who|how|why|when|is|are|can|do|does|did|find|spot|guess|choose)\s+(is|are|the|a|an|of)?\s*/i, "")
    .replace(/\b(could|can|would|should)\s+(float in water|fly|survive|live|happen|win|be|exist)\b/gi, "")
    .replace(/[?!.:,;]+$/g, "")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    cleaned = "mystery trivia subject";
  }
  return cleaned;
}

/**
 * Resolves domain-themed fallback subject anchors tailored to the episode topic and layout.
 */
function resolveThemedFallbackAnchors(domain: SubjectDomainCategory, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  switch (domain) {
    case "medical":
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Dedicated clinic school nurse in cheerful scrubs with first aid kit" },
          { label: "Option B", visualPrompt: "Expert emergency hospital doctor with stethoscope and trauma response pack" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt:
              "Dark mysterious silhouette of an emergency first aid hero surrounded by glowing cyan medical cross badge and gentle hospital room starlight",
          },
        ];
      }
      if (layout === "odd_one_out") {
        return [
          {
            label: "Odd Element",
            visualPrompt:
              "3x3 matrix grid of clean red cross first aid kit boxes where one subtle box displays a golden heart emblem instead of a cross",
          },
        ];
      }
      if (layout === "difficulty_tier") {
        return [
          { label: "Level 1", visualPrompt: "Adhesive bandages and soothing cooling ice pack" },
          { label: "Level 2", visualPrompt: "Clinical stethoscope and digital blood pressure monitor" },
          { label: "Level 3", visualPrompt: "Advanced cardiac defibrillator and trauma emergency kit" },
          { label: "Level 4", visualPrompt: "Futuristic holographic bio-scan surgical healing chamber 🔥" },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Prominent vintage red cross emergency medical first aid metal box floating with crisp glowing clinic heart-rate monitor pulse",
          },
        ];
      }
      // Mega grid defaults for medical
      return [
        { label: "First Aid Kit", visualPrompt: "Vintage red cross emergency medical first aid box with gleaming brass latches", badge: "✓" },
        { label: "Stethoscope", visualPrompt: "Sleek acoustic medical stethoscope with glowing metallic chestpiece" },
        { label: "Medicine", visualPrompt: "Amber glass medicine bottle with luminous liquid and dropper" },
        { label: "Thermometer", visualPrompt: "Digital clinic thermometer with glowing temperature display and colorful adhesive bandages" },
      ];

    case "space":
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Fiery red volcanic planet Mars glowing with orbital satellites" },
          { label: "Option B", visualPrompt: "Icy blue giant planet Neptune surrounded by cosmic frozen blizzards" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt:
              "Dark mysterious silhouette of an unidentified deep space spacecraft enveloped in glowing cyan nebula dust and single question mark '?'",
          },
        ];
      }
      if (layout === "odd_one_out") {
        return [
          {
            label: "Odd Element",
            visualPrompt:
              "3x3 matrix grid of glowing planetary orbits where one subtle planet rotates in retrograde backwards motion",
          },
        ];
      }
      if (layout === "difficulty_tier") {
        return [
          { label: "Level 1", visualPrompt: "Crescent moon and sparkling orbital satellite" },
          { label: "Level 2", visualPrompt: "Ringed planet Saturn and asteroid belt" },
          { label: "Level 3", visualPrompt: "Swirling supermassive black hole with luminous accretion disk" },
          { label: "Level 4", visualPrompt: "Hyper-luminous cosmic quasar bursting through primordial space time 🔥" },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Planet Saturn glowing with luminous crystalline rings inside a transparent cosmic nebula sphere",
          },
        ];
      }
      return [
        { label: "Saturn", visualPrompt: "Planet Saturn glowing in colorful cosmic nebula with luminous crystalline rings", badge: "✓" },
        { label: "Mars Rover", visualPrompt: "High-tech Mars exploration rover exploring dusty red Martian craters" },
        { label: "Telescope", visualPrompt: "Deep space James Webb space telescope orbiting distant glowing spiral galaxies" },
        { label: "Astronaut Helmet", visualPrompt: "Sleek astronaut helmet with golden visor reflecting colorful cosmic stars and nebulae" },
      ];

    case "gaming":
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Retro vintage 8-bit arcade joystick console glowing with neon vaporwave lights" },
          { label: "Option B", visualPrompt: "Futuristic sleek next-gen gaming console with dynamic RGB cooling fans" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt:
              "Dark mysterious silhouette of an iconic video game hero surrounded by glowing neon pixel power-up blocks and question mark '?'",
          },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Glowing vintage arcade gaming cartridge floating with shimmering golden pixel sparkles",
          },
        ];
      }
      return [
        { label: "Arcade Cabinet", visualPrompt: "Retro 1980s neon arcade cabinet glowing with vibrant pixel art sprites", badge: "✓" },
        { label: "Controller", visualPrompt: "Next-gen ergonomic wireless game controller with glowing RGB edge trim" },
        { label: "Power-up Star", visualPrompt: "Golden 8-bit pixel power-up star floating with shimmering sparkles" },
        { label: "VR Headset", visualPrompt: "High-tech VR gaming headset with glowing holographic visor" },
      ];

    case "science":
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Glowing 3D double-helix DNA molecule floating inside a pristine glass laboratory orb",
          },
        ];
      }
      return [
        { label: "Microscope", visualPrompt: "Vintage brass laboratory microscope with glowing crystalline glass slide", badge: "✓" },
        { label: "DNA Strand", visualPrompt: "Luminous 3D double-helix DNA strand with colorful floating nucleotide bonds" },
        { label: "Chemical Beaker", visualPrompt: "Glowing laboratory beaker with bubbling violet and cyan effervescent potion" },
        { label: "Atomic Model", visualPrompt: "Orbital atomic model with glowing electrons circling bright energetic nucleus" },
      ];

    case "norse":
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Mighty golden-engraved Thor's battle hammer (Mjolnir) crackling with electric-blue lightning" },
          { label: "Option B", visualPrompt: "Odin's legendary runic spear Gungnir surrounded by two mystical flying ravens" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt:
              "Dark mysterious silhouette of an iconic Norse Viking warrior with horned/winged helm surrounded by glowing cyan runes and question mark '?'",
          },
        ];
      }
      if (layout === "odd_one_out") {
        return [
          {
            label: "Odd Element",
            visualPrompt:
              "3x3 matrix grid of carved Nordic Viking shields where one shield glows with an enchanted golden dragon rune",
          },
        ];
      }
      if (layout === "difficulty_tier") {
        return [
          { label: "Level 1", visualPrompt: "Carved wooden Viking rune stone" },
          { label: "Level 2", visualPrompt: "Sturdy Nordic round shield and battle axe" },
          { label: "Level 3", visualPrompt: "Thor's divine hammer Mjolnir with crackling sparks" },
          { label: "Level 4", visualPrompt: "Cosmic Yggdrasil world tree glowing with celestial auroras 🔥" },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Iconic golden-engraved Thor's battle hammer (Mjolnir) floating with glowing electric-blue runes",
          },
        ];
      }
      return [
        { label: "Thor's Hammer", visualPrompt: "Mythic golden-engraved Thor's battle hammer (Mjolnir) crackling with soft electric-blue sparks", badge: "✓" },
        { label: "Viking Longship", visualPrompt: "Carved Nordic Viking dragon longship with wooden round shields mounted on its hull" },
        { label: "Valkyrie Helmet", visualPrompt: "Gleaming silver Valkyrie winged battle helmet with polished bronze trim" },
        { label: "Runic World Tree", visualPrompt: "Ancient mossy Nordic runestone glowing with vibrant amber Norse runes" },
      ];

    case "greek":
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Zeus's crackling golden lightning bolt with celestial thunder clouds" },
          { label: "Option B", visualPrompt: "Poseidon's oceanic bronze trident emerging from swirling crystalline tidal waves" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt:
              "Dark mysterious silhouette of an Olympian deity with golden laurel halo and glowing cyan question mark '?'",
          },
        ];
      }
      if (layout === "odd_one_out") {
        return [
          {
            label: "Odd Element",
            visualPrompt: "3x3 matrix grid of Olympian marble amphora vases where one glows with crackling divine fire",
          },
        ];
      }
      if (layout === "difficulty_tier") {
        return [
          { label: "Level 1", visualPrompt: "Golden Olympian laurel wreath" },
          { label: "Level 2", visualPrompt: "Polished Spartan bronze helmet and round shield" },
          { label: "Level 3", visualPrompt: "Poseidon's divine tidal trident" },
          { label: "Level 4", visualPrompt: "Mount Olympus summit bathed in divine golden celestial lightning 🔥" },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Prominent golden Olympian lightning bolt floating with celestial sparks and divine clouds",
          },
        ];
      }
      return [
        { label: "Zeus Lightning", visualPrompt: "Crackling golden Olympian lightning bolt surrounded by radiant celestial sparks", badge: "✓" },
        { label: "Poseidon Trident", visualPrompt: "Ancient bronze trident of Poseidon surrounded by spiraling oceanic water droplets" },
        { label: "Spartan Shield", visualPrompt: "Polished bronze Spartan hoplite round shield embossed with classic Greek patterns" },
        { label: "Parthenon Temple", visualPrompt: "Ancient Greek marble Parthenon temple bathed in warm golden sunset light" },
      ];

    case "fantasy":
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Enchanted glowing wizard spellbook floating open with swirling celestial runes" },
          { label: "Option B", visualPrompt: "Fearsome red dragon skull artifact with glowing ember-fire eye sockets" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt: "Dark mysterious silhouette of an enchanted mythical creature with glowing cyan stardust and question mark '?'",
          },
        ];
      }
      if (layout === "odd_one_out") {
        return [
          {
            label: "Odd Element",
            visualPrompt: "3x3 matrix grid of glowing crystalline potions where one vial pulses with vibrant dragon fire",
          },
        ];
      }
      if (layout === "difficulty_tier") {
        return [
          { label: "Level 1", visualPrompt: "Carved wooden magic wand" },
          { label: "Level 2", visualPrompt: "Bubbling violet arcane potion flask" },
          { label: "Level 3", visualPrompt: "Ancient runic spellbook with floating runes" },
          { label: "Level 4", visualPrompt: "Mythic crystalline dragon egg hatching celestial starlight 🔥" },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Ornate glowing arcane spellbook floating open with swirling stardust sparkles",
          },
        ];
      }
      return [
        { label: "Spellbook", visualPrompt: "Ancient leather-bound spellbook glowing with swirling magical runes", badge: "✓" },
        { label: "Dragon Egg", visualPrompt: "Crystalline dragon egg with iridescent scales pulsing with inner ember glow" },
        { label: "Magic Wand", visualPrompt: "Carved wooden wizard wand with glowing star crystal tip and stardust trail" },
        { label: "Golden Chalice", visualPrompt: "Mythic royal golden chalice overflowing with liquid starlight" },
      ];

    case "history":
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Ancient golden Egyptian artifact chest surrounded by floating glowing hieroglyphic tablets",
          },
        ];
      }
      return [
        { label: "Pharaoh Sarcophagus", visualPrompt: "Ancient Egyptian golden Pharaoh sarcophagus with lapis lazuli inlays", badge: "✓" },
        { label: "Gladiator Helmet", visualPrompt: "Roman gladiator bronze helmet and polished embossed round shield" },
        { label: "Knight Longsword", visualPrompt: "Medieval knight longsword embedded in ancient mossy stone with golden engravings" },
        { label: "Ancient Temple", visualPrompt: "Ancient Greek Parthenon marble temple bathed in golden sunset light" },
      ];

    case "ocean":
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Glowing bioluminescent jellyfish pulsating with vibrant neon tentacles inside crystal clear ocean sphere",
          },
        ];
      }
      return [
        { label: "Blue Whale", visualPrompt: "Giant blue whale swimming gracefully through sunlit turquoise ocean waters", badge: "✓" },
        { label: "Coral Reef", visualPrompt: "Vibrant tropical coral reef with glowing bioluminescent jellyfish" },
        { label: "Sunken Treasure", visualPrompt: "Ancient sunken pirate galleon treasure chest overflowing with gold coins" },
        { label: "Submarine", visualPrompt: "Deep sea yellow research submarine exploring glowing hydrothermal vents" },
      ];

    case "food":
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Exquisite golden chocolate dessert dome melting under warm poured caramel sauce",
          },
        ];
      }
      return [
        { label: "Artisan Pizza", visualPrompt: "Artisanal wood-fired pizza with bubbling golden mozzarella, roasted cherry tomatoes, and fresh basil", badge: "✓" },
        { label: "Gourmet Burger", visualPrompt: "Towering gourmet cheeseburger with melting cheddar, crisp bacon, and sesame brioche bun" },
        { label: "Macaron Tower", visualPrompt: "Multi-tiered pastel French macaron tower with delicate sugar dusting" },
        { label: "Chef Pan", visualPrompt: "Polished copper chef sauté pan with colorful sizzling vegetables and gentle flame burst" },
      ];

    case "animals":
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Chameleon perched on tropical branch seamlessly shifting colors between vibrant turquoise and sunset gold",
          },
        ];
      }
      return [
        { label: "Lion", visualPrompt: "Majestic African lion with golden flowing mane atop a sunlit savannah rock", badge: "✓" },
        { label: "Panda", visualPrompt: "Playful giant panda munching fresh green bamboo shoots in misty forest" },
        { label: "Macaw", visualPrompt: "Tropical scarlet macaw parrot with vibrant feathers spreading wings on branch" },
        { label: "Polar Bear", visualPrompt: "Arctic polar bear cub playing on crystalline turquoise iceberg" },
      ];

    case "school":
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Classic school chalkboard slate floating with luminous chalk diagrams and a shiny red apple",
          },
        ];
      }
      return [
        { label: "Backpack", visualPrompt: "Cheerful colorful school backpack packed with textbooks and glowing rulers", badge: "✓" },
        { label: "Globe", visualPrompt: "Sleek spinning desktop world globe with illuminated continents and brass stand" },
        { label: "Art Supplies", visualPrompt: "Wooden artist palette with vivid oil paints, paintbrushes, and color pencils" },
        { label: "Trophy", visualPrompt: "Golden school championship trophy cup radiating celebratory glitter sparkles" },
      ];

    default:
      // General knowledge baseline fallbacks
      if (layout === "split_vs") {
        return [
          { label: "Option A", visualPrompt: "Epic glowing fiery prehistoric Tyrannosaurus Rex" },
          { label: "Option B", visualPrompt: "Futuristic heavy armored laser Mecha Robot in icy blizzards" },
        ];
      }
      if (layout === "mystery_silhouette") {
        return [
          {
            label: "Mystery Subject",
            visualPrompt: "Pitch-black mysterious superhero silhouette enveloped in glowing cyan neon question mark '?' and dark mist",
          },
        ];
      }
      if (layout === "odd_one_out") {
        return [
          {
            label: "Odd Element",
            visualPrompt:
              "3x3 matrix grid of cheerful yellow ducklings where one wears cool sunglasses and smirk, highlighted with red circle ⭕",
          },
        ];
      }
      if (layout === "difficulty_tier") {
        return [
          { label: "Level 1", visualPrompt: "Green Easy puzzle piece" },
          { label: "Level 2", visualPrompt: "Yellow Medium math equations" },
          { label: "Level 3", visualPrompt: "Orange Hard complex glowing gears" },
          { label: "Level 4", visualPrompt: "Purple Impossible blazing cosmic supernova brain 🔥" },
        ];
      }
      if (layout === "yes_no") {
        return [
          {
            label: "Statement Subject",
            visualPrompt: "Mind-bending visual paradox: goldfish swimming inside a floating water sphere in zero-gravity space",
          },
        ];
      }
      return [
        { label: "History", visualPrompt: "Ancient Giza Pyramids under glowing desert sun", badge: "✓" },
        { label: "Science", visualPrompt: "Albert Einstein with glowing holographic brain" },
        { label: "Nature", visualPrompt: "Great white shark swimming in deep crystal ocean" },
        { label: "Space", visualPrompt: "Planet Saturn glowing in colorful cosmic nebula with rocket" },
      ];
  }
}

/**
 * Extracts 2 to 4 visual subject anchors for grid/versus layouts.
 * Ensures anchors only describe visual 3D objects, NEVER raw question sentences.
 */
export function resolveSubjectAnchors(input: ResolveThumbnailInput, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  const anchors: QuizSubjectAnchor[] = [];
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();
  const domain = detectSubjectDomain(topicLower);

  if (input.questions && input.questions.length > 0) {
    const firstQ = input.questions[0];

    // Priority 1: If first question has multiple visual choices (e.g. 4 choices for a 2x2 grid or 2 choices for VS)
    if (firstQ.choices && firstQ.choices.length >= 2 && (layout === "mega_grid" || layout === "split_vs")) {
      const limit = layout === "split_vs" ? 2 : Math.min(firstQ.choices.length, 4);
      for (let i = 0; i < limit; i++) {
        const choice = firstQ.choices[i];
        const isAnswer = firstQ.answer
          ? choice.toLowerCase().includes(firstQ.answer.toLowerCase()) || firstQ.answer.toLowerCase().includes(choice.toLowerCase())
          : i === 0;
        const enrichedVisual = contextualizeChoiceSubject(choice, topicLower);
        anchors.push({
          label: `Option ${i + 1}`,
          visualPrompt: `3D visual icon of ${enrichedVisual}`,
          badge: isAnswer ? "✓" : undefined,
        });
      }
    } else {
      // Priority 2: Distinct subjects from multiple questions (clean noun phrases)
      for (let i = 0; i < Math.min(input.questions.length, 4); i++) {
        const q = input.questions[i];
        const subject = cleanSubjectFromQuestion(q.question, q.answer);
        const enrichedVisual = contextualizeChoiceSubject(subject, topicLower);
        anchors.push({
          label: `Subject ${i + 1}`,
          visualPrompt: `3D visual icon of ${enrichedVisual}`,
          badge: i === 0 ? "✓" : undefined,
        });
      }
    }
  }

  // Fallback themed anchors if no specific question prompts provided
  if (anchors.length === 0) {
    return resolveThemedFallbackAnchors(domain, layout);
  }

  return anchors;
}
