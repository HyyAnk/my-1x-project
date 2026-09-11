import { canonicalJsonStringify, sha256Hex } from "../utils/contentHash.js";
import { cutTransition } from "./definitions/cut.js";
import { crossfadeTransition } from "./definitions/crossfade.js";
import { stingerSwipeTransition } from "./definitions/stingerSwipe.js";
import { bubbleSplashTransition } from "./definitions/bubbleSplash.js";
import { brushWaveTransition } from "./definitions/brushWave.js";
import { lightningBrushTransition } from "./definitions/lightningBrush.js";
import { setTransitionImplementationGetter } from "./resolveTransition.js";
import { unknownTransition } from "./transition.schemas.js";
import type { TransitionImplementation } from "./transition.types.js";

export const CANONICAL_TRANSITIONS: readonly TransitionImplementation[] = [
  stingerSwipeTransition,
  crossfadeTransition,
  cutTransition,
  bubbleSplashTransition,
  brushWaveTransition,
  lightningBrushTransition,
] as const;

const catalog = new Map<string, TransitionImplementation>();

export function resetTransitionCatalog(): void {
  catalog.clear();
  for (const def of CANONICAL_TRANSITIONS) {
    catalog.set(def.id, { ...def });
  }
}

// Initialize on module load
resetTransitionCatalog();

export function listTransitionDefinitions(): readonly TransitionImplementation[] {
  return Array.from(catalog.values());
}

export function getTransitionDefinition(id: string): TransitionImplementation {
  const item = catalog.get(id);
  if (!item) {
    throw unknownTransition(id);
  }
  return { ...item };
}

export function registerTransitionImplementation(impl: TransitionImplementation): void {
  if (!impl.id || typeof impl.id !== "string") {
    throw new Error("Invalid transition implementation ID");
  }
  catalog.set(impl.id, { ...impl });
}

export function computeCatalogRevision(): string {
  const entries = listTransitionDefinitions().map((def) => ({
    id: def.id,
    implementationRevision: def.implementationRevision,
    name: def.name,
    placements: [...def.placements].sort(),
    defaultDurationSeconds: def.defaultDurationSeconds,
    minDurationSeconds: def.minDurationSeconds,
    maxDurationSeconds: def.maxDurationSeconds,
    cssClass: def.cssClass,
    handoff: def.handoff,
    styles: def.styles,
  }));

  entries.sort((a, b) => a.id.localeCompare(b.id));
  return sha256Hex(canonicalJsonStringify(entries));
}

// Connect canonical catalog to resolveTransition
setTransitionImplementationGetter(getTransitionDefinition);
