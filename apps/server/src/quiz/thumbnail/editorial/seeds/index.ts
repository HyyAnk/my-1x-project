import { BIOLOGY_DOMAIN_SEED } from "./biologySeeds.js";
import { WILDLIFE_DOMAIN_SEED } from "./wildlifeSeeds.js";
import { FOOD_DOMAIN_SEED } from "./foodSeeds.js";
import { SPACE_DOMAIN_SEED } from "./spaceSeeds.js";
import { TRANSIT_DOMAIN_SEED, MACHINES_DOMAIN_SEED } from "./engineeringSeeds.js";
import { SCIENCE_DOMAIN_SEED } from "./scienceSeeds.js";
import { HISTORY_DOMAIN_SEED, LITERATURE_DOMAIN_SEED } from "./historyStorybookSeeds.js";
import {
  WONDERS_DOMAIN_SEED,
  CLINIC_DOMAIN_SEED,
  GAMING_DOMAIN_SEED,
  BRAND_DOMAIN_SEED,
} from "./wondersClinicGamingSeeds.js";
import type { EditorialDomainSeed } from "./seedTypes.js";

export * from "./seedTypes.js";
export * from "./archetypeSeeds.js";
export * from "./biologySeeds.js";
export * from "./wildlifeSeeds.js";
export * from "./foodSeeds.js";
export * from "./spaceSeeds.js";
export * from "./engineeringSeeds.js";
export * from "./scienceSeeds.js";
export * from "./historyStorybookSeeds.js";
export * from "./wondersClinicGamingSeeds.js";

/**
 * All 12 diversified topic domains in prioritized order.
 * Specific domains (Mythology, Literature, Transit, Clinic, Brand) precede generic biology
 * to prevent loose keyword overlap.
 */
export const EDITORIAL_DOMAIN_SEEDS: EditorialDomainSeed[] = [
  HISTORY_DOMAIN_SEED,
  LITERATURE_DOMAIN_SEED,
  TRANSIT_DOMAIN_SEED,
  MACHINES_DOMAIN_SEED,
  CLINIC_DOMAIN_SEED,
  BRAND_DOMAIN_SEED,
  SPACE_DOMAIN_SEED,
  SCIENCE_DOMAIN_SEED,
  FOOD_DOMAIN_SEED,
  WILDLIFE_DOMAIN_SEED,
  WONDERS_DOMAIN_SEED,
  GAMING_DOMAIN_SEED,
  BIOLOGY_DOMAIN_SEED,
];
