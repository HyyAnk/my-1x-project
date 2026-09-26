import type { CreativeSeed } from "@studio/shared";

export function fitsProductionPolicy(seed: CreativeSeed, duration: number): boolean {
  if (seed.complexity === "high" || (duration < 8 && seed.complexity === "medium")) return false;
  if (seed.dimension !== "outro_farewell") return true;
  // Hero-hold endings cannot also leave the stage. Custom endings must explicitly opt in.
  return seed.origin === "built_in" ? ["G01", "G04", "G06"].includes(seed.id) : seed.style_tags.includes("stationary_ending");
}

export function compatibleSeeds(selected: readonly CreativeSeed[], seed: CreativeSeed): boolean {
  return (
    selected.every((other) => !other.forbidden_seed_ids.includes(seed.id) && !seed.forbidden_seed_ids.includes(other.id)) &&
    selected.filter((other) => other.complexity === "medium").length + Number(seed.complexity === "medium") <= 1
  );
}
