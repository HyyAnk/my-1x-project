import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StyleCatalogSnapshot, StyleSlot } from "@studio/shared";
import { createStyleCatalog, setRuntimeStyleCatalog } from "./catalog.js";
import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { renderValidatedModuleCss } from "./namespaceCss.js";
import { BUILT_IN_STYLE_MODULES } from "./builtins.js";
import type { SlotScopedStyleModule } from "./types.js";

export type StyleActivationState = "draft" | "validated" | "active";

export type StyleModuleDraft = {
  module: SlotScopedStyleModule;
  state: StyleActivationState;
  revision: string;
  issues: readonly string[];
};

export type ActiveStyleSnapshot = {
  revision: string;
  generatedAt: string;
  catalog: StyleCatalogSnapshot;
};

export type StyleActivationValidation = {
  ok: boolean;
  issues: readonly string[];
  revision?: string;
};

type SerializedModule = {
  manifest: SlotScopedStyleModule["manifest"];
  css: string;
  html: string;
  assets: Record<string, string>;
};

type PersistedDraft = Omit<StyleModuleDraft, "module"> & { module: SerializedModule };
type PersistedSnapshot = ActiveStyleSnapshot & { moduleKeys: Record<string, string> };
type PersistedState = {
  activeRevision: string;
  activeKeys: string[];
  modules: Record<string, SerializedModule>;
  drafts: Record<string, PersistedDraft>;
  snapshots: PersistedSnapshot[];
};

function key(module: SlotScopedStyleModule): string {
  return `${module.manifest.slot}:${module.manifest.id}`;
}

function revisionFor(module: SlotScopedStyleModule): string {
  return `style-${createHash("sha256").update(JSON.stringify(module.manifest)).update(module.renderer.renderCss()).update(renderHtml(module)).update(JSON.stringify(sortedAssets(module))).digest("hex").slice(0, 16)}`;
}

function renderHtml(module: SlotScopedStyleModule): string {
  const renderer = module.renderer as unknown as { renderHtml?: (context: never) => string };
  try {
    return renderer.renderHtml ? renderer.renderHtml({} as never) : "";
  } catch {
    return "";
  }
}

function sortedAssets(module: SlotScopedStyleModule): Record<string, string> {
  return Object.fromEntries(
    Object.entries((module as SlotScopedStyleModule & { assets?: Record<string, Uint8Array> }).assets ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([assetPath, data]) => [assetPath, Buffer.from(data).toString("base64")]),
  );
}

function isBuiltIn(module: SlotScopedStyleModule): boolean {
  return BUILT_IN_STYLE_MODULES.some((candidate) => candidate === module);
}

function serializeModule(module: SlotScopedStyleModule): SerializedModule {
  return { manifest: module.manifest, css: module.renderer.renderCss(), html: renderHtml(module), assets: sortedAssets(module) };
}

function deserializeModule(serialized: SerializedModule): SlotScopedStyleModule {
  const assets = Object.fromEntries(Object.entries(serialized.assets).map(([assetPath, value]) => [assetPath, Buffer.from(value, "base64")]));
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
          renderHtml: () => serialized.html,
          renderCss: () => serialized.css,
        };
  return { manifest: serialized.manifest, renderer, assets } as SlotScopedStyleModule;
}

function validateModule(module: SlotScopedStyleModule): StyleActivationValidation {
  const issues: string[] = [];
  try {
    StyleModuleManifestSchema.parse(module.manifest);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Invalid style module manifest");
  }
  try {
    renderValidatedModuleCss(module);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Invalid style module CSS");
  }
  const declaredAssets = module.manifest.assetPaths ?? [];
  const providedAssets = (module as SlotScopedStyleModule & { assets?: Record<string, Uint8Array> }).assets ?? {};
  for (const asset of declaredAssets) {
    if (!providedAssets[asset]) issues.push(`Missing required asset: ${asset}`);
  }
  const revision = revisionFor(module);
  return { ok: issues.length === 0, issues, revision };
}

/** In-memory atomic activation store. A failed activation never mutates active state. */
export class StyleActivationManager {
  private activeModules = new Map<string, SlotScopedStyleModule>(BUILT_IN_STYLE_MODULES.map((module) => [key(module), module]));
  private readonly snapshots = new Map<string, ActiveStyleSnapshot>();
  private readonly modulesByRevision = new Map<string, ReadonlyMap<string, SlotScopedStyleModule>>();
  private readonly drafts = new Map<string, StyleModuleDraft>();
  private activeRevision = "";
  private persistencePath?: string;

  constructor(private readonly publishRuntime = false, persistencePath?: string) {
    this.persistencePath = persistencePath;
    if (persistencePath) this.loadPersistedState();
    this.recordSnapshot();
  }

  configurePersistence(persistencePath: string): void {
    this.persistencePath = persistencePath;
    this.activeModules = new Map(BUILT_IN_STYLE_MODULES.map((module) => [key(module), module]));
    this.snapshots.clear();
    this.modulesByRevision.clear();
    this.drafts.clear();
    this.activeRevision = "";
    this.loadPersistedState();
    this.recordSnapshot();
    if (this.publishRuntime) setRuntimeStyleCatalog(createStyleCatalog([...this.activeModules.values()]));
  }

  getActiveSnapshot(): ActiveStyleSnapshot {
    return this.snapshots.get(this.activeRevision)!;
  }

  getActiveCatalog(): ReturnType<typeof createStyleCatalog> {
    return createStyleCatalog([...this.activeModules.values()]);
  }

  getSnapshot(revision: string): ActiveStyleSnapshot | undefined {
    return this.snapshots.get(revision);
  }

  createDraft(module: SlotScopedStyleModule): StyleModuleDraft {
    const draft: StyleModuleDraft = { module, state: "draft", revision: revisionFor(module), issues: [] };
    this.drafts.set(key(module), draft);
    this.persist();
    return draft;
  }

  stageDraft(module: SlotScopedStyleModule): StyleModuleDraft {
    this.createDraft(module);
    return this.validateDraft(module.manifest.slot, module.manifest.id);
  }

  validateDraft(slot: StyleSlot, id: string): StyleModuleDraft {
    const draft = this.drafts.get(`${slot}:${id}`);
    if (!draft) throw new Error(`Style module draft not found: ${slot}:${id}`);
    const validation = validateModule(draft.module);
    const next: StyleModuleDraft = {
      ...draft,
      state: validation.ok ? "validated" : "draft",
      issues: validation.issues,
      revision: validation.revision ?? draft.revision,
    };
    this.drafts.set(`${slot}:${id}`, next);
    this.persist();
    return next;
  }

  activateDraft(slot: StyleSlot, id: string): ActiveStyleSnapshot {
    const draft = this.validateDraft(slot, id);
    if (draft.state !== "validated") throw new Error(draft.issues.join("; ") || "Style module validation failed");
    const nextModules = new Map(this.activeModules);
    nextModules.set(`${slot}:${id}`, draft.module);
    const catalog = createStyleCatalog([...nextModules.values()]);
    this.activeModules = nextModules;
    const snapshot = this.recordSnapshot(catalog);
    this.persist();
    return snapshot;
  }

  stageAndActivate(module: SlotScopedStyleModule): ActiveStyleSnapshot {
    this.createDraft(module);
    return this.activateDraft(module.manifest.slot, module.manifest.id);
  }

  resolveModule(slot: StyleSlot, id: string, revision?: string): SlotScopedStyleModule | undefined {
    if (revision) return this.snapshots.get(revision)?.catalog.entries.some((entry) => entry.slot === slot && entry.id === id) ? this.moduleForRevision(revision, slot, id) : undefined;
    return this.activeModules.get(`${slot}:${id}`);
  }

  private moduleForRevision(revision: string, slot: StyleSlot, id: string): SlotScopedStyleModule | undefined {
    return this.modulesByRevision.get(revision)?.get(`${slot}:${id}`);
  }

  private recordSnapshot(catalog = createStyleCatalog([...this.activeModules.values()])): ActiveStyleSnapshot {
    const snapshot: ActiveStyleSnapshot = Object.freeze({
      revision: catalog.getStyleCatalogSnapshot().revision,
      generatedAt: catalog.getStyleCatalogSnapshot().generatedAt,
      catalog: catalog.getStyleCatalogSnapshot(),
    });
    this.snapshots.set(snapshot.revision, snapshot);
    this.modulesByRevision.set(snapshot.revision, new Map(this.activeModules));
    this.activeRevision = snapshot.revision;
    if (this.publishRuntime) setRuntimeStyleCatalog(catalog);
    return snapshot;
  }

  private persist(): void {
    if (!this.persistencePath) return;
    const modules: Record<string, SerializedModule> = {};
    const snapshots: PersistedSnapshot[] = [];
    for (const snapshot of this.snapshots.values()) {
      const moduleKeys: Record<string, string> = {};
      for (const [moduleKey, module] of this.modulesByRevision.get(snapshot.revision) ?? []) {
        const recordKey = isBuiltIn(module) ? `builtin:${moduleKey}` : `${snapshot.revision}:${moduleKey}`;
        moduleKeys[moduleKey] = recordKey;
        if (!isBuiltIn(module)) modules[recordKey] = serializeModule(module);
      }
      snapshots.push({ ...snapshot, moduleKeys });
    }
    const state: PersistedState = {
      activeRevision: this.activeRevision,
      activeKeys: [...this.activeModules.keys()],
      modules,
      drafts: Object.fromEntries([...this.drafts.entries()].map(([draftKey, draft]) => [draftKey, { ...draft, module: serializeModule(draft.module) }])),
      snapshots,
    };
    mkdirSync(path.dirname(this.persistencePath), { recursive: true });
    const tempPath = `${this.persistencePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(state));
    renameSync(tempPath, this.persistencePath);
  }

  private loadPersistedState(): void {
    if (!this.persistencePath) return;
    try {
      const state = JSON.parse(readFileSync(this.persistencePath, "utf8")) as PersistedState;
      const persistedModules = new Map(Object.entries(state.modules ?? {}).map(([recordKey, serialized]) => [recordKey, deserializeModule(serialized)]));
      const resolveRecord = (moduleKey: string, recordKey: string): SlotScopedStyleModule | undefined => {
        if (recordKey.startsWith("builtin:")) return BUILT_IN_STYLE_MODULES.find((module) => key(module) === moduleKey);
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
        const module = revisions.get(state.activeRevision)?.get(moduleKey) ?? BUILT_IN_STYLE_MODULES.find((candidate) => key(candidate) === moduleKey);
        if (module) activeModules.set(moduleKey, module);
      }
      if (activeModules.size > 0 && snapshots.has(state.activeRevision)) {
        this.activeModules = activeModules;
        this.snapshots.clear();
        snapshots.forEach((snapshot, revision) => this.snapshots.set(revision, snapshot));
        this.modulesByRevision.clear();
        revisions.forEach((modules, revision) => this.modulesByRevision.set(revision, modules));
        this.activeRevision = state.activeRevision;
      }
      this.drafts.clear();
      for (const [draftKey, draft] of Object.entries(state.drafts ?? {})) {
        this.drafts.set(draftKey, { ...draft, module: deserializeModule(draft.module) });
      }
    } catch {
      // Corrupt or absent persistence falls back to built-in modules.
    }
  }
}

export const styleActivationManager = new StyleActivationManager(true);
export const getActiveStyleSnapshot = (): ActiveStyleSnapshot => styleActivationManager.getActiveSnapshot();
export const getActiveStyleCatalog = () => styleActivationManager.getActiveCatalog();
export const getStyleModuleAtRevision = (slot: StyleSlot, id: string, revision?: string) => styleActivationManager.resolveModule(slot, id, revision);
export { validateModule as validateStyleModule };
