import type { ShortReelGenerationTarget } from "../enums.js";

export type ReelGenerationMode = "repair" | "regenerate";

export function normalizeReelGenerationMode(target: ShortReelGenerationTarget, mode?: ReelGenerationMode): ReelGenerationMode {
  if (mode) {
    return mode;
  }
  return target === "package" ? "repair" : "regenerate";
}
