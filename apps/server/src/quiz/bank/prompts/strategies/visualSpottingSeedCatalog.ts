import type {
  VisualSpottingContrastDimension,
  VisualSpottingHookTemplate,
  VisualSpottingItemSeed,
} from "./visualSpottingSeed.types.js";

export * from "./visualSpottingSeed.types.js";

export const VISUAL_SPOTTING_CONTRAST_DIMENSIONS: readonly VisualSpottingContrastDimension[] = [
  {
    id: "diet_predator_vs_herbivore",
    category: "diet_nutrition",
    label: "Diet & Nutrition",
    description: "2 Carnivores / Apex Predators vs 1 Peaceful Herbivore / Vegetarian",
    example: "Lion & Timber Wolf vs Giant Panda",
    applicableDomains: ["nature_animals", "wildlife", "biology", "general"],
  },
  {
    id: "biome_arctic_vs_desert",
    category: "biome_habitat",
    label: "Biome & Climate",
    description: "2 Subzero Polar / Arctic dwellers vs 1 Arid Desert / Tropical dweller",
    example: "Polar Bear & Emperor Penguin vs Fennec Fox",
    applicableDomains: ["nature_animals", "geography", "earth_science"],
  },
  {
    id: "biome_deepsea_vs_freshwater",
    category: "biome_habitat",
    label: "Aquatic Biome",
    description: "2 Saltwater Ocean / Abyssal creatures vs 1 Freshwater River / Lake fish",
    example: "Great White Shark & Manta Ray vs Amazon Piranha",
    applicableDomains: ["nature_animals", "oceanography", "marine_life"],
  },
  {
    id: "locomotion_aviator_vs_flightless",
    category: "locomotion_physics",
    label: "Locomotion & Aerodynamics",
    description: "2 High-altitude soaring fliers vs 1 Heavy ground-bound flightless runner",
    example: "Golden Eagle & Peregrine Falcon vs Ostrich / Kiwi",
    applicableDomains: ["nature_animals", "birds", "physics"],
  },
  {
    id: "locomotion_swimmer_vs_slither",
    category: "locomotion_physics",
    label: "Locomotion Mechanics",
    description: "2 Limbed walkers / sprinters vs 1 Legless slithering creature",
    example: "Cheetah & Greyhound vs Black Mamba",
    applicableDomains: ["nature_animals", "reptiles"],
  },
  {
    id: "anatomy_bioluminescence",
    category: "anatomy_hallmark",
    label: "Bioluminescence",
    description: "2 Naturally glowing / bioluminescent organisms vs 1 Non-luminescent subject",
    example: "Anglerfish & Firefly vs Dragonfly",
    applicableDomains: ["nature_animals", "science", "marine_life"],
  },
  {
    id: "anatomy_venom_vs_harmless",
    category: "anatomy_hallmark",
    label: "Defensive Venom",
    description: "2 Lethally venomous / toxic organisms vs 1 Non-venomous lookalike",
    example: "King Cobra & Poison Dart Frog vs Corn Snake",
    applicableDomains: ["nature_animals", "reptiles", "medicine"],
  },
  {
    id: "anatomy_horns_vs_hornless",
    category: "anatomy_hallmark",
    label: "Physical Armor & Horns",
    description: "2 Heavily antlered / horned beasts vs 1 Naturally hornless counterpart",
    example: "Moose & Ibex vs Wild Boar",
    applicableDomains: ["nature_animals", "mammals"],
  },
  {
    id: "anatomy_exoskeleton_vs_soft",
    category: "anatomy_hallmark",
    label: "Skeletal Structure",
    description: "2 Hard chitinous exoskeleton creatures vs 1 Soft-bodied invertebrate",
    example: "Scorpion & Lobster vs Giant Squid",
    applicableDomains: ["nature_animals", "marine_life", "insects"],
  },
  {
    id: "era_living_fossil_vs_modern",
    category: "era_evolution",
    label: "Evolutionary Era",
    description: "2 Prehistoric survivors / living fossils vs 1 Modern mammal",
    example: "Coelacanth & Horseshoe Crab vs Atlantic Salmon",
    applicableDomains: ["nature_animals", "paleontology", "history"],
  },
  {
    id: "behavior_nocturnal_vs_diurnal",
    category: "behavior_activity",
    label: "Activity Cycle",
    description: "2 Midnight nocturnal hunters vs 1 Sun-loving diurnal creature",
    example: "Barn Owl & Fruit Bat vs Red-tailed Hawk",
    applicableDomains: ["nature_animals", "birds"],
  },
  {
    id: "popculture_superpower_vs_tech",
    category: "popculture_power",
    label: "Superpower vs Tech Origin",
    description: "2 Innately superhuman / mutant beings vs 1 Pure technology / armored human",
    example: "Thor & The Hulk vs Iron Man",
    applicableDomains: ["comics", "superheroes", "gaming", "anime_manga"],
  },
  {
    id: "popculture_fruit_vs_haki",
    category: "popculture_power",
    label: "Power System Alignment",
    description: "2 Supernatural power/magic wielders vs 1 Pure weapon / physical martial artist",
    example: "Luffy & Law vs Zoro",
    applicableDomains: ["anime_manga", "gaming", "pop_culture"],
  },
  {
    id: "material_liquid_vs_solid",
    category: "material_element",
    label: "Elemental State",
    description: "2 Dense solid/metal minerals vs 1 Volatile liquid / gaseous element",
    example: "Titanium & Granite vs Liquid Mercury",
    applicableDomains: ["science", "chemistry", "space", "astronomy"],
  },
];

export const VISUAL_SPOTTING_HOOK_TEMPLATES: readonly VisualSpottingHookTemplate[] = [
  {
    id: "dual_trait_dilemma",
    label: "Dual-Trait Dilemma",
    templateFormat: "Two [shared trait], but which one [contrasting trait]?",
    sampleQuestion: "Two thrive in subzero blizzards, but which one prowls scorching dunes?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "lone_exception",
    label: "The Lone Exception",
    templateFormat: "Which of these three [category] broke the mold by [contrasting trait]?",
    sampleQuestion: "Which of these three ocean giants broke the mold by breathing air?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "impostor_hunt",
    label: "Impostor Hunt",
    templateFormat: "Unmask the impostor: Which [subject] completely lacks [hallmark trait]?",
    sampleQuestion: "Unmask the impostor: Which apex predator lacks sharp retractable claws?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "peaceful_vs_deadly",
    label: "Peaceful vs Deadly",
    templateFormat: "Two are deadly apex hunters, but which one is a harmless [diet/trait]?",
    sampleQuestion: "Two are venomous vipers, but which one is a harmless lookalike?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "habitat_misfit",
    label: "Habitat Misfit",
    templateFormat: "Two roam [biome A], but which one is native to [biome B]?",
    sampleQuestion: "Two roam African savannas, but which one is native to the Amazon jungle?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "category_divergence",
    label: "Category Divergence",
    templateFormat: "Two share [physical hallmark], but which one evolved without it?",
    sampleQuestion: "Two boast colossal ivory tusks, but which one evolved completely hornless?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "rule_breaker",
    label: "The Rule Breaker",
    templateFormat: "Which of these three [category] defies the rule of [hallmark trait]?",
    sampleQuestion: "Which of these three raptors defies the rule of nocturnal hunting?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
  {
    id: "outlier_spot",
    label: "Dimensional Outlier",
    templateFormat: "Which of these three [category] is the true outlier in [dimension]?",
    sampleQuestion: "Which of these three mythical beasts is the true outlier in element?",
    forbiddenKeywords: ["odd one out", "does not belong", "spot the mismatch"],
  },
];

/**
 * Allocates varied contrast dimensions and hook templates for a batch of questions.
 * Ensures consecutive questions never share identical hook formulas or contrast categories.
 */
export function allocateVisualSpottingSeeds(
  count: number,
  domainId?: string,
): VisualSpottingItemSeed[] {
  const normDomain = domainId?.toLowerCase().trim() || "";
  const matchingDimensions = VISUAL_SPOTTING_CONTRAST_DIMENSIONS.filter(
    (dim) => !normDomain || !dim.applicableDomains || dim.applicableDomains.some((d) => normDomain.includes(d)),
  );

  const dimensionPool = matchingDimensions.length >= 3 ? matchingDimensions : VISUAL_SPOTTING_CONTRAST_DIMENSIONS;
  const hookPool = VISUAL_SPOTTING_HOOK_TEMPLATES;

  const seeds: VisualSpottingItemSeed[] = [];
  for (let i = 0; i < count; i++) {
    const contrastDimension = dimensionPool[i % dimensionPool.length];
    const hookTemplate = hookPool[i % hookPool.length];

    const guidanceLine =
      `Question #${i + 1}: [Contrast: ${contrastDimension.label}] -> ` +
      `Focus on: "${contrastDimension.description}" (e.g. ${contrastDimension.example}). ` +
      `Hook style: ${hookTemplate.label} (Formula: "${hookTemplate.templateFormat}"). ` +
      `NEVER write "odd one out" or "does not belong".`;

    seeds.push({
      itemIndex: i + 1,
      contrastDimension,
      hookTemplate,
      guidanceLine,
    });
  }

  return seeds;
}

/**
 * Formats allocated seeds into a prompt instruction block enforcing item-by-item diversity.
 */
export function formatVisualSpottingSeedsBlock(seeds: VisualSpottingItemSeed[]): string {
  if (seeds.length === 0) return "";

  const itemsText = seeds
    .map(
      (s) =>
        `Question #${s.itemIndex}:\n` +
        `  * Contrast Dimension: ${s.contrastDimension.label} (${s.contrastDimension.description})\n` +
        `  * Hook Formula (${s.hookTemplate.label}): "${s.hookTemplate.templateFormat}" (e.g. "${s.hookTemplate.sampleQuestion}")\n` +
        `  * Strict Negative: DO NOT write "odd one out" or "does not belong".`,
    )
    .join("\n\n");

  return [
    `=== MANDATORY ITEM-BY-ITEM DIVERSITY BLUEPRINTS (NO "ODD ONE OUT" REPETITION) ===`,
    `To eliminate repetitive "odd one out" questions and ensure high mobile viewer retention,`,
    `each question in the returned JSON array MUST strictly adopt its assigned blueprint below:`,
    ``,
    itemsText,
    ``,
    `CRITICAL PROHIBITION: The phrase 'odd one out' is STRICTLY FORBIDDEN anywhere in question text!`,
  ].join("\n");
}
