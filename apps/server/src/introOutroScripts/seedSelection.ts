import { createHash } from "node:crypto";
import {
  INTRO_SEED_DIMENSIONS,
  OUTRO_SEED_DIMENSIONS,
  type CreativeSeed,
  type CreativeSeedDimension,
  type IntroOutroClipKind,
  type IntroOutroSeedSelection,
  type MascotStyleIdentityProfile,
} from "@studio/shared";
import { IntroOutroScriptError } from "./errors.js";
import { isSeedEligible } from "./seedCatalog.js";
import { hasBlockingIssues, validateSeedSelection } from "./validation.js";
import { compatibleSeeds, fitsProductionPolicy } from "./seedProductionPolicy.js";

function dimensionsForClip(clipKind: IntroOutroClipKind): readonly CreativeSeedDimension[] {
  return clipKind === "intro" ? INTRO_SEED_DIMENSIONS : OUTRO_SEED_DIMENSIONS;
}

function latestCatalog(catalog: readonly CreativeSeed[]): CreativeSeed[] {
  const byId = new Map<string, CreativeSeed>();
  for (const seed of catalog) {
    const current = byId.get(seed.id);
    if (!current || seed.revision > current.revision) byId.set(seed.id, seed);
  }
  return [...byId.values()];
}

function seededIndex(seed: string, dimension: string, size: number): number {
  const digest = createHash("sha256").update(`${seed}:${dimension}`).digest();
  return digest.readUInt32BE(0) % size;
}

export function resolveSeedSelection(params: {
  clipKind: IntroOutroClipKind;
  catalog: readonly CreativeSeed[];
  identity: MascotStyleIdentityProfile;
  randomizationSeed: string;
  selectedSeedIds?: readonly string[];
  lockedDimensions?: readonly CreativeSeedDimension[];
  durationSeconds?: number;
}): { selection: IntroOutroSeedSelection; seeds: CreativeSeed[] } {
  const dimensions = dimensionsForClip(params.clipKind);
  const active = latestCatalog(params.catalog).filter((seed) => seed.clip_kind === params.clipKind && seed.status === "active");
  const requested = new Map(active.filter((seed) => params.selectedSeedIds?.includes(seed.id)).map((seed) => [seed.dimension, seed]));
  if (params.lockedDimensions?.some((dimension) => !requested.has(dimension)))
    throw new IntroOutroScriptError("Each locked dimension needs an explicit active seed", "SEED_COMBINATION_INVALID");
  if (
    (params.selectedSeedIds ?? []).some((id) => !active.some((seed) => seed.id === id)) ||
    requested.size !== (params.selectedSeedIds?.length ?? 0)
  ) {
    throw new IntroOutroScriptError("Select one active seed per dimension", "SEED_COMBINATION_INVALID");
  }
  const candidates = dimensions.map((dimension) => {
    const explicit = requested.get(dimension);
    const eligible = active.filter(
      (seed) =>
        seed.dimension === dimension &&
        isSeedEligible(seed, params.identity) &&
        fitsProductionPolicy(seed, params.durationSeconds ?? 8) &&
        (!explicit || seed.id === explicit.id),
    );
    if (!eligible.length) {
      throw new IntroOutroScriptError(`No compatible active seed is available for ${dimension}`, "SEED_COMBINATION_INVALID");
    }
    const weighted = eligible.flatMap((seed) => Array.from({ length: Math.max(1, Math.round(seed.selection_weight)) }, () => seed));
    const first = weighted[seededIndex(params.randomizationSeed, dimension, weighted.length)];
    return [first, ...eligible.filter((seed) => seed.id !== first.id)];
  });
  const search = (index: number, selected: CreativeSeed[]): CreativeSeed[] | null => {
    if (index === candidates.length) return selected;
    for (const seed of candidates[index]) {
      if (!compatibleSeeds(selected, seed)) continue;
      const result = search(index + 1, [...selected, seed]);
      if (result) return result;
    }
    return null;
  };
  const selected = search(0, []);
  if (!selected)
    throw new IntroOutroScriptError("Selected seeds conflict with the single-action production budget", "SEED_COMBINATION_INVALID");

  const issues = validateSeedSelection(selected, params.identity, dimensions);
  if (hasBlockingIssues(issues)) {
    throw new IntroOutroScriptError(issues.map((item) => item.message).join(" "), "SEED_COMBINATION_INVALID");
  }
  return {
    selection: {
      randomization_seed: params.randomizationSeed,
      selected_seed_ids: selected.map((seed) => seed.id),
      locked_dimensions: [...(params.lockedDimensions ?? [])],
      algorithm_version: "2",
    },
    seeds: selected,
  };
}
