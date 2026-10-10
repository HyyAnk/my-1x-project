import type { ThumbnailLayoutType } from "@studio/shared";
import type { SubjectDomainCategory } from "./thumbnailSubjectDomain.types.js";
import type { QuizSubjectAnchor } from "./thumbnailTypes.js";

interface ThemedAnchorSet {
  byLayout: Partial<Record<ThumbnailLayoutType, readonly QuizSubjectAnchor[]>>;
  fallback: readonly QuizSubjectAnchor[];
}

type ThemedAnchorDomain = Exclude<SubjectDomainCategory, "supercars">;

/** Domain-themed fallback subject anchors keyed by domain, then by layout (mega grid uses `fallback`). */
const THEMED_FALLBACK_ANCHORS: Record<ThemedAnchorDomain, ThemedAnchorSet> = {
  medical: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Dedicated clinic school nurse in cheerful scrubs with first aid kit" },
        { label: "Option B", visualPrompt: "Expert emergency hospital doctor with stethoscope and trauma response pack" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt:
            "Dark mysterious silhouette of an emergency first aid hero surrounded by glowing cyan medical cross badge and gentle hospital room starlight",
        },
      ],
      odd_one_out: [
        {
          label: "Odd Element",
          visualPrompt:
            "3x3 matrix grid of clean red cross first aid kit boxes where one subtle box displays a golden heart emblem instead of a cross",
        },
      ],
      difficulty_tier: [
        { label: "Level 1", visualPrompt: "Adhesive bandages and soothing cooling ice pack" },
        { label: "Level 2", visualPrompt: "Clinical stethoscope and digital blood pressure monitor" },
        { label: "Level 3", visualPrompt: "Advanced cardiac defibrillator and trauma emergency kit" },
        { label: "Level 4", visualPrompt: "Futuristic holographic bio-scan surgical healing chamber 🔥" },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Prominent vintage red cross emergency medical first aid metal box floating with crisp glowing clinic heart-rate monitor pulse",
        },
      ],
    },
    // Mega grid defaults for medical
    fallback: [
      { label: "First Aid Kit", visualPrompt: "Vintage red cross emergency medical first aid box with gleaming brass latches", badge: "✓" },
      { label: "Stethoscope", visualPrompt: "Sleek acoustic medical stethoscope with glowing metallic chestpiece" },
      { label: "Medicine", visualPrompt: "Amber glass medicine bottle with luminous liquid and dropper" },
      { label: "Thermometer", visualPrompt: "Digital clinic thermometer with glowing temperature display and colorful adhesive bandages" },
    ],
  },
  space: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Fiery red volcanic planet Mars glowing with orbital satellites" },
        { label: "Option B", visualPrompt: "Icy blue giant planet Neptune surrounded by cosmic frozen blizzards" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt:
            "Dark mysterious silhouette of an unidentified deep space spacecraft enveloped in glowing cyan nebula dust and single question mark '?'",
        },
      ],
      odd_one_out: [
        {
          label: "Odd Element",
          visualPrompt:
            "3x3 matrix grid of glowing planetary orbits where one subtle planet rotates in retrograde backwards motion",
        },
      ],
      difficulty_tier: [
        { label: "Level 1", visualPrompt: "Crescent moon and sparkling orbital satellite" },
        { label: "Level 2", visualPrompt: "Ringed planet Saturn and asteroid belt" },
        { label: "Level 3", visualPrompt: "Swirling supermassive black hole with luminous accretion disk" },
        { label: "Level 4", visualPrompt: "Hyper-luminous cosmic quasar bursting through primordial space time 🔥" },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Planet Saturn glowing with luminous crystalline rings inside a transparent cosmic nebula sphere",
        },
      ],
    },
    fallback: [
      { label: "Saturn", visualPrompt: "Planet Saturn glowing in colorful cosmic nebula with luminous crystalline rings", badge: "✓" },
      { label: "Mars Rover", visualPrompt: "High-tech Mars exploration rover exploring dusty red Martian craters" },
      { label: "Telescope", visualPrompt: "Deep space James Webb space telescope orbiting distant glowing spiral galaxies" },
      { label: "Astronaut Helmet", visualPrompt: "Sleek astronaut helmet with golden visor reflecting colorful cosmic stars and nebulae" },
    ],
  },
  gaming: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Retro vintage 8-bit arcade joystick console glowing with neon vaporwave lights" },
        { label: "Option B", visualPrompt: "Futuristic sleek next-gen gaming console with dynamic RGB cooling fans" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt:
            "Dark mysterious silhouette of an iconic video game hero surrounded by glowing neon pixel power-up blocks and question mark '?'",
        },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Glowing vintage arcade gaming cartridge floating with shimmering golden pixel sparkles",
        },
      ],
    },
    fallback: [
      { label: "Arcade Cabinet", visualPrompt: "Retro 1980s neon arcade cabinet glowing with vibrant pixel art sprites", badge: "✓" },
      { label: "Controller", visualPrompt: "Next-gen ergonomic wireless game controller with glowing RGB edge trim" },
      { label: "Power-up Star", visualPrompt: "Golden 8-bit pixel power-up star floating with shimmering sparkles" },
      { label: "VR Headset", visualPrompt: "High-tech VR gaming headset with glowing holographic visor" },
    ],
  },
  science: {
    byLayout: {
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Glowing 3D double-helix DNA molecule floating inside a pristine glass laboratory orb",
        },
      ],
    },
    fallback: [
      { label: "Microscope", visualPrompt: "Vintage brass laboratory microscope with glowing crystalline glass slide", badge: "✓" },
      { label: "DNA Strand", visualPrompt: "Luminous 3D double-helix DNA strand with colorful floating nucleotide bonds" },
      { label: "Chemical Beaker", visualPrompt: "Glowing laboratory beaker with bubbling violet and cyan effervescent potion" },
      { label: "Atomic Model", visualPrompt: "Orbital atomic model with glowing electrons circling bright energetic nucleus" },
    ],
  },
  norse: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Mighty golden-engraved Thor's battle hammer (Mjolnir) crackling with electric-blue lightning" },
        { label: "Option B", visualPrompt: "Odin's legendary runic spear Gungnir surrounded by two mystical flying ravens" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt:
            "Dark mysterious silhouette of an iconic Norse Viking warrior with horned/winged helm surrounded by glowing cyan runes and question mark '?'",
        },
      ],
      odd_one_out: [
        {
          label: "Odd Element",
          visualPrompt:
            "3x3 matrix grid of carved Nordic Viking shields where one shield glows with an enchanted golden dragon rune",
        },
      ],
      difficulty_tier: [
        { label: "Level 1", visualPrompt: "Carved wooden Viking rune stone" },
        { label: "Level 2", visualPrompt: "Sturdy Nordic round shield and battle axe" },
        { label: "Level 3", visualPrompt: "Thor's divine hammer Mjolnir with crackling sparks" },
        { label: "Level 4", visualPrompt: "Cosmic Yggdrasil world tree glowing with celestial auroras 🔥" },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Iconic golden-engraved Thor's battle hammer (Mjolnir) floating with glowing electric-blue runes",
        },
      ],
    },
    fallback: [
      { label: "Thor's Hammer", visualPrompt: "Mythic golden-engraved Thor's battle hammer (Mjolnir) crackling with soft electric-blue sparks", badge: "✓" },
      { label: "Viking Longship", visualPrompt: "Carved Nordic Viking dragon longship with wooden round shields mounted on its hull" },
      { label: "Valkyrie Helmet", visualPrompt: "Gleaming silver Valkyrie winged battle helmet with polished bronze trim" },
      { label: "Runic World Tree", visualPrompt: "Ancient mossy Nordic runestone glowing with vibrant amber Norse runes" },
    ],
  },
  greek: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Zeus's crackling golden lightning bolt with celestial thunder clouds" },
        { label: "Option B", visualPrompt: "Poseidon's oceanic bronze trident emerging from swirling crystalline tidal waves" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt:
            "Dark mysterious silhouette of an Olympian deity with golden laurel halo and glowing cyan question mark '?'",
        },
      ],
      odd_one_out: [
        {
          label: "Odd Element",
          visualPrompt: "3x3 matrix grid of Olympian marble amphora vases where one glows with crackling divine fire",
        },
      ],
      difficulty_tier: [
        { label: "Level 1", visualPrompt: "Golden Olympian laurel wreath" },
        { label: "Level 2", visualPrompt: "Polished Spartan bronze helmet and round shield" },
        { label: "Level 3", visualPrompt: "Poseidon's divine tidal trident" },
        { label: "Level 4", visualPrompt: "Mount Olympus summit bathed in divine golden celestial lightning 🔥" },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Prominent golden Olympian lightning bolt floating with celestial sparks and divine clouds",
        },
      ],
    },
    fallback: [
      { label: "Zeus Lightning", visualPrompt: "Crackling golden Olympian lightning bolt surrounded by radiant celestial sparks", badge: "✓" },
      { label: "Poseidon Trident", visualPrompt: "Ancient bronze trident of Poseidon surrounded by spiraling oceanic water droplets" },
      { label: "Spartan Shield", visualPrompt: "Polished bronze Spartan hoplite round shield embossed with classic Greek patterns" },
      { label: "Parthenon Temple", visualPrompt: "Ancient Greek marble Parthenon temple bathed in warm golden sunset light" },
    ],
  },
  fantasy: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Enchanted glowing wizard spellbook floating open with swirling celestial runes" },
        { label: "Option B", visualPrompt: "Fearsome red dragon skull artifact with glowing ember-fire eye sockets" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt: "Dark mysterious silhouette of an enchanted mythical creature with glowing cyan stardust and question mark '?'",
        },
      ],
      odd_one_out: [
        {
          label: "Odd Element",
          visualPrompt: "3x3 matrix grid of glowing crystalline potions where one vial pulses with vibrant dragon fire",
        },
      ],
      difficulty_tier: [
        { label: "Level 1", visualPrompt: "Carved wooden magic wand" },
        { label: "Level 2", visualPrompt: "Bubbling violet arcane potion flask" },
        { label: "Level 3", visualPrompt: "Ancient runic spellbook with floating runes" },
        { label: "Level 4", visualPrompt: "Mythic crystalline dragon egg hatching celestial starlight 🔥" },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Ornate glowing arcane spellbook floating open with swirling stardust sparkles",
        },
      ],
    },
    fallback: [
      { label: "Spellbook", visualPrompt: "Ancient leather-bound spellbook glowing with swirling magical runes", badge: "✓" },
      { label: "Dragon Egg", visualPrompt: "Crystalline dragon egg with iridescent scales pulsing with inner ember glow" },
      { label: "Magic Wand", visualPrompt: "Carved wooden wizard wand with glowing star crystal tip and stardust trail" },
      { label: "Golden Chalice", visualPrompt: "Mythic royal golden chalice overflowing with liquid starlight" },
    ],
  },
  history: {
    byLayout: {
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Ancient golden Egyptian artifact chest surrounded by floating glowing hieroglyphic tablets",
        },
      ],
    },
    fallback: [
      { label: "Pharaoh Sarcophagus", visualPrompt: "Ancient Egyptian golden Pharaoh sarcophagus with lapis lazuli inlays", badge: "✓" },
      { label: "Gladiator Helmet", visualPrompt: "Roman gladiator bronze helmet and polished embossed round shield" },
      { label: "Knight Longsword", visualPrompt: "Medieval knight longsword embedded in ancient mossy stone with golden engravings" },
      { label: "Ancient Temple", visualPrompt: "Ancient Greek Parthenon marble temple bathed in golden sunset light" },
    ],
  },
  ocean: {
    byLayout: {
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Glowing bioluminescent jellyfish pulsating with vibrant neon tentacles inside crystal clear ocean sphere",
        },
      ],
    },
    fallback: [
      { label: "Blue Whale", visualPrompt: "Giant blue whale swimming gracefully through sunlit turquoise ocean waters", badge: "✓" },
      { label: "Coral Reef", visualPrompt: "Vibrant tropical coral reef with glowing bioluminescent jellyfish" },
      { label: "Sunken Treasure", visualPrompt: "Ancient sunken pirate galleon treasure chest overflowing with gold coins" },
      { label: "Submarine", visualPrompt: "Deep sea yellow research submarine exploring glowing hydrothermal vents" },
    ],
  },
  food: {
    byLayout: {
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Exquisite golden chocolate dessert dome melting under warm poured caramel sauce",
        },
      ],
    },
    fallback: [
      { label: "Artisan Pizza", visualPrompt: "Artisanal wood-fired pizza with bubbling golden mozzarella, roasted cherry tomatoes, and fresh basil", badge: "✓" },
      { label: "Gourmet Burger", visualPrompt: "Towering gourmet cheeseburger with melting cheddar, crisp bacon, and sesame brioche bun" },
      { label: "Macaron Tower", visualPrompt: "Multi-tiered pastel French macaron tower with delicate sugar dusting" },
      { label: "Chef Pan", visualPrompt: "Polished copper chef sauté pan with colorful sizzling vegetables and gentle flame burst" },
    ],
  },
  animals: {
    byLayout: {
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Chameleon perched on tropical branch seamlessly shifting colors between vibrant turquoise and sunset gold",
        },
      ],
    },
    fallback: [
      { label: "Lion", visualPrompt: "Majestic African lion with golden flowing mane atop a sunlit savannah rock", badge: "✓" },
      { label: "Panda", visualPrompt: "Playful giant panda munching fresh green bamboo shoots in misty forest" },
      { label: "Macaw", visualPrompt: "Tropical scarlet macaw parrot with vibrant feathers spreading wings on branch" },
      { label: "Polar Bear", visualPrompt: "Arctic polar bear cub playing on crystalline turquoise iceberg" },
    ],
  },
  school: {
    byLayout: {
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Classic school chalkboard slate floating with luminous chalk diagrams and a shiny red apple",
        },
      ],
    },
    fallback: [
      { label: "Backpack", visualPrompt: "Cheerful colorful school backpack packed with textbooks and glowing rulers", badge: "✓" },
      { label: "Globe", visualPrompt: "Sleek spinning desktop world globe with illuminated continents and brass stand" },
      { label: "Art Supplies", visualPrompt: "Wooden artist palette with vivid oil paints, paintbrushes, and color pencils" },
      { label: "Trophy", visualPrompt: "Golden school championship trophy cup radiating celebratory glitter sparkles" },
    ],
  },
  // General knowledge baseline fallbacks (also used for supercars)
  general: {
    byLayout: {
      split_vs: [
        { label: "Option A", visualPrompt: "Epic glowing fiery prehistoric Tyrannosaurus Rex" },
        { label: "Option B", visualPrompt: "Futuristic heavy armored laser Mecha Robot in icy blizzards" },
      ],
      mystery_silhouette: [
        {
          label: "Mystery Subject",
          visualPrompt: "Pitch-black mysterious superhero silhouette enveloped in glowing cyan neon question mark '?' and dark mist",
        },
      ],
      odd_one_out: [
        {
          label: "Odd Element",
          visualPrompt:
            "3x3 matrix grid of cheerful yellow ducklings where one wears cool sunglasses and smirk, highlighted with red circle ⭕",
        },
      ],
      difficulty_tier: [
        { label: "Level 1", visualPrompt: "Green Easy puzzle piece" },
        { label: "Level 2", visualPrompt: "Yellow Medium math equations" },
        { label: "Level 3", visualPrompt: "Orange Hard complex glowing gears" },
        { label: "Level 4", visualPrompt: "Purple Impossible blazing cosmic supernova brain 🔥" },
      ],
      yes_no: [
        {
          label: "Statement Subject",
          visualPrompt: "Mind-bending visual paradox: goldfish swimming inside a floating water sphere in zero-gravity space",
        },
      ],
    },
    fallback: [
      { label: "History", visualPrompt: "Ancient Giza Pyramids under glowing desert sun", badge: "✓" },
      { label: "Science", visualPrompt: "Albert Einstein with glowing holographic brain" },
      { label: "Nature", visualPrompt: "Great white shark swimming in deep crystal ocean" },
      { label: "Space", visualPrompt: "Planet Saturn glowing in colorful cosmic nebula with rocket" },
    ],
  },
};

function cloneAnchors(anchors: readonly QuizSubjectAnchor[]): QuizSubjectAnchor[] {
  return anchors.map((anchor) => ({ ...anchor }));
}

/**
 * Resolves domain-themed fallback subject anchors tailored to the episode topic and layout.
 */
export function resolveThemedFallbackAnchors(domain: SubjectDomainCategory, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  const anchorSet = domain === "supercars" ? THEMED_FALLBACK_ANCHORS.general : THEMED_FALLBACK_ANCHORS[domain];
  return cloneAnchors(anchorSet.byLayout[layout] ?? anchorSet.fallback);
}
