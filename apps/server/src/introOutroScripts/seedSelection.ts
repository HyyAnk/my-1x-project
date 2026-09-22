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
}): { selection: IntroOutroSeedSelection; seeds: CreativeSeed[] } {
  const dimensions = dimensionsForClip(params.clipKind);
  const active = latestCatalog(params.catalog).filter((seed) => seed.clip_kind === params.clipKind && seed.status === "active");
  const requested = new Map(active.filter((seed) => params.selectedSeedIds?.includes(seed.id)).map((seed) => [seed.dimension, seed]));
  const selected: CreativeSeed[] = [];

  for (const dimension of dimensions) {
    const explicit = requested.get(dimension);
    if (explicit) {
      selected.push(explicit);
      continue;
    }
    const eligible = active.filter((seed) => seed.dimension === dimension && isSeedEligible(seed, params.identity));
    if (!eligible.length) {
      throw new IntroOutroScriptError(`No compatible active seed is available for ${dimension}`, "SEED_COMBINATION_INVALID");
    }
    const weighted = eligible.flatMap((seed) => Array.from({ length: Math.max(1, Math.round(seed.selection_weight)) }, () => seed));
    selected.push(weighted[seededIndex(params.randomizationSeed, dimension, weighted.length)]);
  }

  const issues = validateSeedSelection(selected, params.identity, dimensions);
  if (hasBlockingIssues(issues)) {
    throw new IntroOutroScriptError(issues.map((item) => item.message).join(" "), "SEED_COMBINATION_INVALID");
  }
  return {
    selection: {
      randomization_seed: params.randomizationSeed,
      selected_seed_ids: selected.map((seed) => seed.id),
      locked_dimensions: [...(params.lockedDimensions ?? [])],
      algorithm_version: "1",
    },
    seeds: selected,
  };
}
