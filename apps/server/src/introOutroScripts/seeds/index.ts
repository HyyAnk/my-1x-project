import type { CreativeSeed } from "@studio/shared";
import { INTRO_SEEDS, INTRO_SEED_DEFINITIONS } from "./introSeeds.js";
import { OUTRO_SEEDS, OUTRO_SEED_DEFINITIONS } from "./outroSeeds.js";

export { INTRO_SEEDS, INTRO_SEED_DEFINITIONS } from "./introSeeds.js";
export { OUTRO_SEEDS, OUTRO_SEED_DEFINITIONS } from "./outroSeeds.js";
export { buildSeedsFromDefinitions, type SeedDefinition } from "./seedTypes.js";

export const BUILT_IN_INTRO_OUTRO_SEEDS: CreativeSeed[] = [
  ...INTRO_SEEDS,
  ...OUTRO_SEEDS,
];
