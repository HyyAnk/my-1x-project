import type { ReelArchetype } from "../shortReelSource.schema.js";
import type { ReelScriptSeed, ReelScriptSeedId } from "../schemas/reelScriptSeed.schema.js";
import {
  ALL_REEL_SCRIPT_SEEDS,
  VERSUS_FACEOFF_SEEDS,
  DEEP_TRIVIA_SEEDS,
  TRUE_FALSE_SEEDS,
} from "./reelScriptSeedDefinitions.js";

export {
  ALL_REEL_SCRIPT_SEEDS,
  VERSUS_FACEOFF_SEEDS,
  DEEP_TRIVIA_SEEDS,
  TRUE_FALSE_SEEDS,
};

export const DEFAULT_SEED_BY_ARCHETYPE: Record<ReelArchetype, ReelScriptSeedId> = {
  versus_faceoff: "vf_arena_clash",
  deep_trivia: "dt_mystery_investigation",
  verdict_true_false: "tf_mythbusters_lab",
};

export function getScriptSeedsForArchetype(archetype: ReelArchetype): readonly ReelScriptSeed[] {
  switch (archetype) {
    case "versus_faceoff":
      return VERSUS_FACEOFF_SEEDS;
    case "deep_trivia":
      return DEEP_TRIVIA_SEEDS;
    case "verdict_true_false":
      return TRUE_FALSE_SEEDS;
    default:
      return [];
  }
}

export function getScriptSeedById(id: string): ReelScriptSeed | undefined {
  return ALL_REEL_SCRIPT_SEEDS.find((seed) => seed.id === id);
}

export function resolveDefaultSeedForArchetype(archetype: ReelArchetype): ReelScriptSeed {
  const defaultId = DEFAULT_SEED_BY_ARCHETYPE[archetype];
  const found = getScriptSeedById(defaultId);
  if (found) return found;
  const fallback = getScriptSeedsForArchetype(archetype)[0];
  if (!fallback) {
    throw new Error(`No seeds configured for archetype: ${archetype}`);
  }
  return fallback;
}

function computeSimpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveScriptSeed(
  archetype: ReelArchetype,
  requestedSeedId?: string | null,
  deterministicKey?: string | null,
): ReelScriptSeed {
  const availableSeeds = getScriptSeedsForArchetype(archetype);
  if (availableSeeds.length === 0) {
    throw new Error(`No script seeds available for archetype: ${archetype}`);
  }

  if (requestedSeedId) {
    const exactMatch = availableSeeds.find((seed) => seed.id === requestedSeedId);
    if (exactMatch) {
      return exactMatch;
    }
  }

  if (deterministicKey && deterministicKey.trim().length > 0) {
    const hash = computeSimpleHash(deterministicKey.trim());
    const index = hash % availableSeeds.length;
    return availableSeeds[index];
  }

  return resolveDefaultSeedForArchetype(archetype);
}
