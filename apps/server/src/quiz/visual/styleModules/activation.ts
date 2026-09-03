import { createHash } from "node:crypto";
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

function key(module: SlotScopedStyleModule): string {
  return `${module.manifest.slot}:${module.manifest.id}`;
}

function revisionFor(module: SlotScopedStyleModule): string {
  return `style-${createHash("sha256")
    .update(JSON.stringify(module.manifest))
    .update(module.renderer.renderCss())
    .digest("hex")
    .slice(0, 16)}`;
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

  constructor(private readonly publishRuntime = false) {
    this.recordSnapshot();
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
    return draft;
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
    return next;
  }

  activateDraft(slot: StyleSlot, id: string): ActiveStyleSnapshot {
    const draft = this.validateDraft(slot, id);
    if (draft.state !== "validated") throw new Error(draft.issues.join("; ") || "Style module validation failed");
    const nextModules = new Map(this.activeModules);
    nextModules.set(`${slot}:${id}`, draft.module);
    const catalog = createStyleCatalog([...nextModules.values()]);
    this.activeModules = nextModules;
    return this.recordSnapshot(catalog);
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
}

export const styleActivationManager = new StyleActivationManager(true);
export const getActiveStyleSnapshot = (): ActiveStyleSnapshot => styleActivationManager.getActiveSnapshot();
export const getActiveStyleCatalog = () => styleActivationManager.getActiveCatalog();
export { validateModule as validateStyleModule };
