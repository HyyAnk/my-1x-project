import type { CreativeSeed } from "@studio/shared";

export function compatibleSeeds(selected: readonly CreativeSeed[], seed: CreativeSeed): boolean {
  return selected.every((other) => !other.forbidden_seed_ids.includes(seed.id) && !seed.forbidden_seed_ids.includes(other.id));
}
