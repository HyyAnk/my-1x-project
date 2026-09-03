import { createHash } from "node:crypto";
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
  const assetPaths = Object.freeze([...manifest.assetPaths]);
  const cssSelectors = manifest.cssSelectors ? Object.freeze([...manifest.cssSelectors]) : undefined;
  return {
    ...manifest,
    assetPaths,
    ...(cssSelectors ? { cssSelectors } : {}),
    available: true,
  };
}

export function createStyleCatalog(modules: readonly SlotScopedStyleModule[]): StyleCatalog {
  const entries = Object.freeze(modules.map(toCatalogEntry).map((entry) => Object.freeze(entry)));
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.slot}:${entry.id}`;
    if (keys.has(key)) throw new Error(`Duplicate style catalog entry: ${key}`);
    keys.add(key);
  }
  const snapshot: StyleCatalogSnapshot = {
    revision: createCatalogRevision(modules),
    generatedAt: new Date().toISOString(),
    entries: Object.freeze(entries),
  };
  const frozenSnapshot = Object.freeze(snapshot);
  const moduleByKey = new Map(modules.map((module) => [`${module.manifest.slot}:${module.manifest.id}`, module]));

  return {
    getStyleCatalogSnapshot: () => frozenSnapshot,
    getStyleCatalogEntry: (slot, id) => frozenSnapshot.entries.find((entry) => entry.slot === slot && entry.id === id),
    getStyleModule: (slot, id) => moduleByKey.get(`${slot}:${id}`),
  };
}

function createCatalogRevision(modules: readonly SlotScopedStyleModule[]): string {
  const content = modules.map((module) => ({
    manifest: module.manifest,
    css: module.renderer.renderCss(),
  }));
  const digest = createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);
  return `catalog-${digest}`;
}

const builtInCatalog = createStyleCatalog(BUILT_IN_STYLE_MODULES);
let runtimeCatalog: StyleCatalog = builtInCatalog;

export const getStyleCatalogSnapshot = (): StyleCatalogSnapshot => runtimeCatalog.getStyleCatalogSnapshot();
export const getStyleCatalogEntry = (slot: StyleSlot, id: string): StyleCatalogEntry | undefined => runtimeCatalog.getStyleCatalogEntry(slot, id);
export const getStyleModule = (slot: StyleSlot, id: string): SlotScopedStyleModule | undefined => runtimeCatalog.getStyleModule(slot, id);
export function setRuntimeStyleCatalog(catalog: StyleCatalog): void {
  runtimeCatalog = catalog;
}
export { BUILT_IN_STYLE_MODULES };
