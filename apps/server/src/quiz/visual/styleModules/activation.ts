import type { StyleCatalogSnapshot, StyleSlot } from "@studio/shared";
import { createStyleCatalog, setRuntimeStyleCatalog } from "./catalog.js";
import type { SlotScopedStyleModule } from "./types.js";
import {
  applyActiveDraft,
  createInitialActiveModules,
  createStyleDraft,
  isBuiltIn,
  key,
  resolveActiveStyleModules,
  validateModule,
  validateStyleDraft,
  type StyleActivationState,
  type StyleActivationValidation,
  type StyleModuleDraft,
} from "./activationRules.js";
import { applyStyleModulesToTemplate, loadPersistedActivationState, persistActivationState } from "./activationApplier.js";

export type { StyleActivationState, StyleModuleDraft, StyleActivationValidation };
export { resolveActiveStyleModules, applyStyleModulesToTemplate };

export type ActiveStyleSnapshot = {
  revision: string;
  generatedAt: string;
  catalog: StyleCatalogSnapshot;
};

/** In-memory atomic activation store. A failed activation never mutates active state. */
export class StyleActivationManager {
  private activeModules = createInitialActiveModules();
  private readonly snapshots = new Map<string, ActiveStyleSnapshot>();
  private readonly modulesByRevision = new Map<string, ReadonlyMap<string, SlotScopedStyleModule>>();
  private readonly drafts = new Map<string, StyleModuleDraft>();
  private activeRevision = "";
  private persistencePath?: string;

  constructor(
    private readonly publishRuntime = false,
    persistencePath?: string,
  ) {
    this.persistencePath = persistencePath;
    if (persistencePath) this.loadPersistedState();
    this.recordSnapshot();
  }

  configurePersistence(persistencePath: string): void {
    this.persistencePath = persistencePath;
    this.activeModules = createInitialActiveModules();
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
    const draft = createStyleDraft(this.drafts, module);
    this.persist();
    return draft;
  }

  stageDraft(module: SlotScopedStyleModule): StyleModuleDraft {
    this.createDraft(module);
    return this.validateDraft(module.manifest.slot, module.manifest.id);
  }

  validateDraft(slot: StyleSlot, id: string): StyleModuleDraft {
    const draft = validateStyleDraft(this.drafts, slot, id);
    this.persist();
    return draft;
  }

  activateDraft(slot: StyleSlot, id: string): ActiveStyleSnapshot {
    const draft = this.validateDraft(slot, id);
    const previousModules = this.activeModules;
    const previousRevision = this.activeRevision;
    const { nextModules, catalog } = applyActiveDraft(this.activeModules, draft, slot, id);
    this.activeModules = nextModules;
    const snapshot = this.recordSnapshot(catalog, false);
    try {
      this.persist();
    } catch (error) {
      this.activeModules = previousModules;
      this.activeRevision = previousRevision;
      this.snapshots.delete(snapshot.revision);
      this.modulesByRevision.delete(snapshot.revision);
      throw error;
    }
    if (this.publishRuntime) setRuntimeStyleCatalog(catalog);
    return snapshot;
  }

  stageAndActivate(module: SlotScopedStyleModule): ActiveStyleSnapshot {
    this.createDraft(module);
    return this.activateDraft(module.manifest.slot, module.manifest.id);
  }

  resolveModule(slot: StyleSlot, id: string, revision?: string): SlotScopedStyleModule | undefined {
    if (revision)
      return this.snapshots.get(revision)?.catalog.entries.some((entry) => entry.slot === slot && entry.id === id)
        ? this.modulesByRevision.get(revision)?.get(`${slot}:${id}`)
        : undefined;
    return this.activeModules.get(`${slot}:${id}`);
  }

  private recordSnapshot(
    catalog = createStyleCatalog([...this.activeModules.values()]),
    publish = this.publishRuntime,
  ): ActiveStyleSnapshot {
    const snapshot: ActiveStyleSnapshot = Object.freeze({
      revision: catalog.getStyleCatalogSnapshot().revision,
      generatedAt: catalog.getStyleCatalogSnapshot().generatedAt,
      catalog: catalog.getStyleCatalogSnapshot(),
    });
    this.snapshots.set(snapshot.revision, snapshot);
    this.modulesByRevision.set(snapshot.revision, new Map(this.activeModules));
    this.activeRevision = snapshot.revision;
    if (publish) setRuntimeStyleCatalog(catalog);
    return snapshot;
  }

  private persist(): void {
    if (!this.persistencePath) return;
    persistActivationState(
      this.persistencePath,
      this.activeRevision,
      this.activeModules,
      this.snapshots,
      this.modulesByRevision,
      this.drafts,
      isBuiltIn,
    );
  }

  private loadPersistedState(): void {
    if (!this.persistencePath) return;
    const loaded = loadPersistedActivationState(this.persistencePath, key);
    if (!loaded) return;
    this.activeModules = loaded.activeModules;
    this.snapshots.clear();
    loaded.snapshots.forEach((snapshot, revision) => this.snapshots.set(revision, snapshot));
    this.modulesByRevision.clear();
    loaded.revisions.forEach((modules, revision) => this.modulesByRevision.set(revision, modules));
    this.activeRevision = loaded.activeRevision;
    this.drafts.clear();
    loaded.drafts.forEach((draft, draftKey) => this.drafts.set(draftKey, draft));
  }
}

export const styleActivationManager = new StyleActivationManager(true);
export const getActiveStyleSnapshot = (): ActiveStyleSnapshot => styleActivationManager.getActiveSnapshot();
export const getStyleSnapshotAtRevision = (revision: string): ActiveStyleSnapshot | undefined =>
  styleActivationManager.getSnapshot(revision);
export const getActiveStyleCatalog = () => styleActivationManager.getActiveCatalog();
export const getStyleModuleAtRevision = (slot: StyleSlot, id: string, revision?: string) =>
  styleActivationManager.resolveModule(slot, id, revision);
export { validateModule as validateStyleModule };
