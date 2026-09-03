import type { StyleCatalogEntry, StyleCatalogSnapshot, StyleSlot } from "@studio/shared";
import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { BUILT_IN_STYLE_MODULES } from "./builtins.js";
import type { SlotScopedStyleModule } from "./types.js";

export type StyleCatalog = {
  getStyleCatalogSnapshot: () => StyleCatalogSnapshot;
  getStyleCatalogEntry: (slot: StyleSlot, id: string) => StyleCatalogEntry | undefined;
  getStyleModule: (slot: StyleSlot, id: string) => SlotScopedStyleModule | undefined;
};

function toCatalogEntry(module: SlotScopedStyleModule): StyleCatalogEntry {
  const manifest = StyleModuleManifestSchema.parse(module.manifest);
  return { ...manifest, available: true };
}

export function createStyleCatalog(modules: readonly SlotScopedStyleModule[]): StyleCatalog {
  const entries = modules.map(toCatalogEntry);
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.slot}:${entry.id}`;
    if (keys.has(key)) throw new Error(`Duplicate style catalog entry: ${key}`);
    keys.add(key);
  }
  const snapshot: StyleCatalogSnapshot = {
    revision: "builtins-v1",
    generatedAt: new Date().toISOString(),
    entries,
  };
  const moduleByKey = new Map(modules.map((module) => [`${module.manifest.slot}:${module.manifest.id}`, module]));

  return {
    getStyleCatalogSnapshot: () => snapshot,
    getStyleCatalogEntry: (slot, id) => snapshot.entries.find((entry) => entry.slot === slot && entry.id === id),
    getStyleModule: (slot, id) => moduleByKey.get(`${slot}:${id}`),
  };
}

const builtInCatalog = createStyleCatalog(BUILT_IN_STYLE_MODULES);

export const getStyleCatalogSnapshot = builtInCatalog.getStyleCatalogSnapshot;
export const getStyleCatalogEntry = builtInCatalog.getStyleCatalogEntry;
export const getStyleModule = builtInCatalog.getStyleModule;
export { BUILT_IN_STYLE_MODULES };
