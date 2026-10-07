import type { CreativeSeed, MascotStyleIdentityProfile } from "@studio/shared";
import { BUILT_IN_INTRO_OUTRO_SEEDS, INTRO_SEEDS, OUTRO_SEEDS } from "./seeds/index.js";

export { BUILT_IN_INTRO_OUTRO_SEEDS, INTRO_SEEDS, OUTRO_SEEDS };
export * from "./seeds/index.js";

export function isSeedEligible(seed: CreativeSeed, identity: MascotStyleIdentityProfile): boolean {
  if (seed.status !== "active") return false;
  return seed.required_capabilities.every((capability) => identity.capabilities[capability] === "supported");
}

export function listEligibleSeeds(catalog: readonly CreativeSeed[], identity: MascotStyleIdentityProfile | null): CreativeSeed[] {
  const latest = latestSeedCatalog(catalog);
  if (!identity || !["reviewed", "ready"].includes(identity.status)) return latest.filter((seed) => seed.status === "active");
  return latest.filter((seed) => isSeedEligible(seed, identity));
}

export function latestSeedCatalog(catalog: readonly CreativeSeed[]): CreativeSeed[] {
  const latestById = new Map<string, CreativeSeed>();
  for (const seed of catalog) {
    const current = latestById.get(seed.id);
    if (!current || seed.revision > current.revision) latestById.set(seed.id, seed);
  }
  return [...latestById.values()].sort((left, right) =>
    left.dimension === right.dimension ? left.name.localeCompare(right.name) : left.dimension.localeCompare(right.dimension),
  );
}
