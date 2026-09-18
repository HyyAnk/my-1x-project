import { createHash } from "node:crypto";
import type { StyleSlot } from "@studio/shared";
import { BUILT_IN_STYLE_MODULES } from "./builtins.js";
import { StyleModuleManifestSchema } from "./manifestSchema.js";
import { renderValidatedModuleCss } from "./namespaceCss.js";
import { renderPortableHtml } from "./exportPackage.js";
import type { SlotScopedStyleModule } from "./types.js";
import { renderHtml, sortedAssets } from "./activationApplier.js";
import { createStyleCatalog } from "./catalog.js";

export type StyleActivationState = "draft" | "validated" | "active";

export type StyleModuleDraft = {
  module: SlotScopedStyleModule;
  state: StyleActivationState;
  revision: string;
  issues: readonly string[];
};

export type StyleActivationValidation = {
  ok: boolean;
  issues: readonly string[];
  revision?: string;
};

export type StyleModuleEligibilityFilter = {
  slot?: StyleSlot;
  id?: string;
  includeBuiltIn?: boolean;
};

const SLOT_PRIORITY: Record<StyleSlot, number> = {
  "thinking-bar": 1,
  "question-box": 2,
  "answer-card": 3,
  counter: 4,
  background: 5,
};

export function key(module: SlotScopedStyleModule): string {
  return `${module.manifest.slot}:${module.manifest.id}`;
}

export function isBuiltIn(module: SlotScopedStyleModule): boolean {
  return BUILT_IN_STYLE_MODULES.some((candidate) => candidate === module);
}

export function createInitialActiveModules(): Map<string, SlotScopedStyleModule> {
  return new Map(BUILT_IN_STYLE_MODULES.map((mod) => [key(mod), mod]));
}

export function revisionFor(module: SlotScopedStyleModule): string {
  return `style-${createHash("sha256")
    .update(JSON.stringify(module.manifest))
    .update(module.renderer.renderCss())
    .update(renderHtml(module))
    .update(JSON.stringify(sortedAssets(module)))
    .digest("hex")
    .slice(0, 16)}`;
}

export function evaluateModuleSelectors(module: SlotScopedStyleModule): readonly string[] {
  return module.manifest.cssSelectors ?? [];
}

export function isModuleEligible(module: SlotScopedStyleModule, filter?: StyleModuleEligibilityFilter): boolean {
  if (filter?.slot && module.manifest.slot !== filter.slot) return false;
  if (filter?.id && module.manifest.id !== filter.id) return false;
  if (filter?.includeBuiltIn === false && isBuiltIn(module)) return false;
  return Boolean(module.manifest.id && module.manifest.slot);
}

export function sortStyleModulesByPriority(modules: readonly SlotScopedStyleModule[]): SlotScopedStyleModule[] {
  return [...modules].sort((a, b) => {
    const slotDiff = (SLOT_PRIORITY[a.manifest.slot] ?? 99) - (SLOT_PRIORITY[b.manifest.slot] ?? 99);
    if (slotDiff !== 0) return slotDiff;
    const builtInA = isBuiltIn(a) ? 1 : 0;
    const builtInB = isBuiltIn(b) ? 1 : 0;
    if (builtInA !== builtInB) return builtInA - builtInB;
    return a.manifest.id.localeCompare(b.manifest.id);
  });
}

export function resolveActiveStyleModules(
  modules: readonly SlotScopedStyleModule[],
  filter?: StyleModuleEligibilityFilter,
): SlotScopedStyleModule[] {
  const eligible = modules.filter((mod) => isModuleEligible(mod, filter));
  return sortStyleModulesByPriority(eligible);
}

export function validateModule(module: SlotScopedStyleModule): StyleActivationValidation {
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
  try {
    renderPortableHtml(module);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Invalid style module HTML renderer");
  }
  const declaredAssets = module.manifest.assetPaths ?? [];
  const providedAssets = (module as SlotScopedStyleModule & { assets?: Record<string, Uint8Array> }).assets ?? {};
  for (const asset of declaredAssets) {
    if (!providedAssets[asset]) issues.push(`Missing required asset: ${asset}`);
  }
  const revision = revisionFor(module);
  return { ok: issues.length === 0, issues, revision };
}

export function createStyleDraft(drafts: Map<string, StyleModuleDraft>, module: SlotScopedStyleModule): StyleModuleDraft {
  const draft: StyleModuleDraft = { module, state: "draft", revision: revisionFor(module), issues: [] };
  drafts.set(key(module), draft);
  return draft;
}

export function validateStyleDraft(drafts: Map<string, StyleModuleDraft>, slot: StyleSlot, id: string): StyleModuleDraft {
  const draft = drafts.get(`${slot}:${id}`);
  if (!draft) throw new Error(`Style module draft not found: ${slot}:${id}`);
  const validation = validateModule(draft.module);
  const next: StyleModuleDraft = {
    ...draft,
    state: validation.ok ? "validated" : "draft",
    issues: validation.issues,
    revision: validation.revision ?? draft.revision,
  };
  drafts.set(`${slot}:${id}`, next);
  return next;
}

export function applyActiveDraft(
  activeModules: Map<string, SlotScopedStyleModule>,
  draft: StyleModuleDraft,
  slot: StyleSlot,
  id: string,
): { nextModules: Map<string, SlotScopedStyleModule>; catalog: ReturnType<typeof createStyleCatalog> } {
  if (draft.state !== "validated") throw new Error(draft.issues.join("; ") || "Style module validation failed");
  const nextModules = new Map(activeModules);
  nextModules.set(`${slot}:${id}`, draft.module);
  return { nextModules, catalog: createStyleCatalog([...nextModules.values()]) };
}
