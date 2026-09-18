import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ActiveStyleSnapshot, StyleModuleDraft } from "./activation.js";
import { BUILT_IN_STYLE_MODULES } from "./builtins.js";
import { renderHtmlTemplate, renderPortableHtml } from "./exportPackage.js";
import type { SlotScopedStyleModule } from "./types.js";

export type SerializedModule = {
  manifest: SlotScopedStyleModule["manifest"];
  css: string;
  html: string;
  assets: Record<string, string>;
};

export type PersistedDraft = Omit<StyleModuleDraft, "module"> & { module: SerializedModule };
export type PersistedSnapshot = ActiveStyleSnapshot & { moduleKeys: Record<string, string> };
export type PersistedState = {
  activeRevision: string;
  activeKeys: string[];
  modules: Record<string, SerializedModule>;
  drafts: Record<string, PersistedDraft>;
  snapshots: PersistedSnapshot[];
};

export type LoadedPersistedState = {
  activeRevision: string;
  activeModules: Map<string, SlotScopedStyleModule>;
  snapshots: Map<string, ActiveStyleSnapshot>;
  revisions: Map<string, ReadonlyMap<string, SlotScopedStyleModule>>;
  drafts: Map<string, StyleModuleDraft>;
};

export function sortedAssets(module: SlotScopedStyleModule): Record<string, string> {
  return Object.fromEntries(
    Object.entries((module as SlotScopedStyleModule & { assets?: Record<string, Uint8Array> }).assets ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([assetPath, data]) => [assetPath, Buffer.from(data).toString("base64")]),
  );
}

export function renderHtml(module: SlotScopedStyleModule): string {
  return renderPortableHtml(module, { requireTemplate: false });
}

export function renderTemplate(template: string, context: unknown): string {
  return renderHtmlTemplate(template, context);
}

export function serializeModule(module: SlotScopedStyleModule): SerializedModule {
  const renderer = module.renderer as unknown as { renderTemplate?: string };
  return {
    manifest: module.manifest,
    css: module.renderer.renderCss(),
    html: renderer.renderTemplate ?? renderHtml(module),
    assets: sortedAssets(module),
  };
}

export function deserializeModule(serialized: SerializedModule): SlotScopedStyleModule {
  const assets = Object.fromEntries(
    Object.entries(serialized.assets).map(([assetPath, value]) => [assetPath, Buffer.from(value, "base64")]),
  );
  const template = serialized.html.includes("{{") ? serialized.html : undefined;
  const renderer =
    serialized.manifest.slot === "answer-card"
      ? {
          id: serialized.manifest.id as never,
          displayName: serialized.manifest.displayName,
          description: serialized.manifest.description,
          className: serialized.manifest.namespace,
          renderCss: () => serialized.css,
        }
      : {
          id: serialized.manifest.id as never,
          displayName: serialized.manifest.displayName,
          description: serialized.manifest.description,
          renderHtml: (context: unknown) => (template ? renderTemplate(template, context) : serialized.html),
          renderCss: () => serialized.css,
          ...(template ? { renderTemplate: template } : {}),
        };
  return { manifest: serialized.manifest, renderer, assets } as SlotScopedStyleModule;
}

export function mergeStyleModuleTokens(baseTokens: Record<string, string>, module: SlotScopedStyleModule): Record<string, string> {
  const overrides: Record<string, string> = {};
  if (module.manifest.namespace) {
    overrides[`--${module.manifest.slot}-namespace`] = module.manifest.namespace;
  }
  return { ...baseTokens, ...overrides };
}

export function applyStyleModulesToTemplate(template: string, modules: readonly SlotScopedStyleModule[], context?: unknown): string {
  let result = template;
  for (const mod of modules) {
    const slotMarker = `<!-- style-slot:${mod.manifest.slot} -->`;
    if (result.includes(slotMarker)) {
      const renderedHtml =
        "renderHtml" in mod.renderer ? (mod.renderer as { renderHtml: (ctx: unknown) => string }).renderHtml(context) : "";
      result = result.replace(slotMarker, renderedHtml);
    }
  }
  return context ? renderTemplate(result, context) : result;
}

export function persistActivationState(
  persistencePath: string,
  activeRevision: string,
  activeModules: Map<string, SlotScopedStyleModule>,
  snapshots: Map<string, ActiveStyleSnapshot>,
  modulesByRevision: Map<string, ReadonlyMap<string, SlotScopedStyleModule>>,
  drafts: Map<string, StyleModuleDraft>,
  isBuiltInFn: (module: SlotScopedStyleModule) => boolean,
): void {
  const modules: Record<string, SerializedModule> = {};
  const persistedSnapshots: PersistedSnapshot[] = [];
  for (const snapshot of snapshots.values()) {
    const moduleKeys: Record<string, string> = {};
    for (const [moduleKey, module] of modulesByRevision.get(snapshot.revision) ?? []) {
      const recordKey = isBuiltInFn(module) ? `builtin:${moduleKey}` : `${snapshot.revision}:${moduleKey}`;
      moduleKeys[moduleKey] = recordKey;
      if (!isBuiltInFn(module)) modules[recordKey] = serializeModule(module);
    }
    persistedSnapshots.push({ ...snapshot, moduleKeys });
  }
  const state: PersistedState = {
    activeRevision,
    activeKeys: [...activeModules.keys()],
    modules,
    drafts: Object.fromEntries(
      [...drafts.entries()].map(([draftKey, draft]) => [draftKey, { ...draft, module: serializeModule(draft.module) }]),
    ),
    snapshots: persistedSnapshots,
  };
  mkdirSync(path.dirname(persistencePath), { recursive: true });
  const tempPath = `${persistencePath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state));
  renameSync(tempPath, persistencePath);
}

export function loadPersistedActivationState(
  persistencePath: string,
  moduleKeyFn: (mod: SlotScopedStyleModule) => string,
): LoadedPersistedState | null {
  try {
    const state = JSON.parse(readFileSync(persistencePath, "utf8")) as PersistedState;
    const persistedModules = new Map(
      Object.entries(state.modules ?? {}).map(([recordKey, serialized]) => [recordKey, deserializeModule(serialized)]),
    );
    const resolveRecord = (moduleKey: string, recordKey: string): SlotScopedStyleModule | undefined => {
      if (recordKey.startsWith("builtin:")) return BUILT_IN_STYLE_MODULES.find((mod) => moduleKeyFn(mod) === moduleKey);
      return persistedModules.get(recordKey);
    };
    const snapshots = new Map<string, ActiveStyleSnapshot>();
    const revisions = new Map<string, ReadonlyMap<string, SlotScopedStyleModule>>();
    for (const snapshot of state.snapshots ?? []) {
      const modules = new Map<string, SlotScopedStyleModule>();
      for (const [moduleKey, recordKey] of Object.entries(snapshot.moduleKeys ?? {})) {
        const module = resolveRecord(moduleKey, recordKey);
        if (module) modules.set(moduleKey, module);
      }
      snapshots.set(snapshot.revision, snapshot);
      revisions.set(snapshot.revision, modules);
    }
    const activeModules = new Map<string, SlotScopedStyleModule>();
    for (const moduleKey of state.activeKeys ?? []) {
      const module =
        revisions.get(state.activeRevision)?.get(moduleKey) ??
        BUILT_IN_STYLE_MODULES.find((candidate) => moduleKeyFn(candidate) === moduleKey);
      if (module) activeModules.set(moduleKey, module);
    }
    if (activeModules.size === 0 || !snapshots.has(state.activeRevision)) {
      return null;
    }
    const drafts = new Map<string, StyleModuleDraft>();
    for (const [draftKey, draft] of Object.entries(state.drafts ?? {})) {
      drafts.set(draftKey, { ...draft, module: deserializeModule(draft.module) });
    }
    return {
      activeRevision: state.activeRevision,
      activeModules,
      snapshots,
      revisions,
      drafts,
    };
  } catch {
    return null;
  }
}
