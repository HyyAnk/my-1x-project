# Independent Element Styles And Dashboard Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every element style independently authorable and registerable while making dashboard-managed presets the only grouping mechanism.

**Architecture:** Keep the existing composable render model: an episode resolves one ID per slot (`thinkingBar`, `questionBox`, `answerCard`, `counter`, and `background`). Move style ownership into slot-scoped modules with a shared manifest/render contract. Generate the runtime catalog from those modules, persist presets through the server repository/API, and activate generated catalog snapshots atomically so draft edits cannot change an active render.

**Tech Stack:** TypeScript, Zod, Fastify, React, Vitest, existing repository service, existing ZIP helper.

**Spec:** Approved architecture in the current task conversation: independent element-style modules, dashboard-managed presets, no required Style Pack abstraction.

## Global Constraints

- Preserve the current independent per-element selection contract and all existing built-in style IDs.
- Do not require users to select a Style Pack; presets remain optional groupings of element-style IDs.
- A draft module or preset must never replace the active runtime catalog before validation succeeds.
- Episode renders must remain reproducible; an existing episode must not silently change because a preset or module was edited.
- CSS from a module must use a module namespace and must not modify global selectors such as `body`, `h1`, or unscoped `.answer-card`.
- Preserve the existing timing contract for Thinking Bar styles: timer origin remains `clipStart`.
- Use the repository's main-direct coordination protocol for every implementation task; claim concrete files before editing and release only after verification.

---

### Task 1: Define Slot-Scoped Style Module Contracts

**Files:**
- Create: `apps/server/src/quiz/visual/styleModules/types.ts`
- Create: `apps/server/src/quiz/visual/styleModules/manifestSchema.ts`
- Create: `packages/shared/src/quizStyles/styleCatalog.types.ts`
- Modify: `packages/shared/src/quizStyles.types.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `apps/server/test/styleModuleContract.test.ts`

**Interfaces:**
- Produces `StyleSlot = "thinking-bar" | "question-box" | "answer-card" | "counter" | "background"`.
- Produces `StyleModuleManifest` with `id`, `slot`, `version`, `displayName`, `description`, `namespace`, optional `previewAsset`, and declared asset paths.
- Produces slot-specific renderer contracts that adapt the existing `renderHtml(context)` and `renderCss()` implementations without changing their timing inputs.
- Produces `StyleCatalogEntry` and `StyleCatalogSnapshot` for later registry and API tasks.

- [ ] **Step 1: Write failing contract tests**

  Add tests that reject an unknown slot, an invalid namespaced ID, a path containing `..`, a manifest without a version, and CSS metadata that declares a global selector. Add a passing fixture for a Thinking Bar module whose renderer receives `clipStart` and `revealStart` unchanged.

- [ ] **Step 2: Run the focused tests and confirm the contract is absent**

  Run `pnpm --filter @studio/server test -- test/styleModuleContract.test.ts`.
  Expected: FAIL because the new manifest and catalog contracts do not exist.

- [ ] **Step 3: Implement the minimal typed contracts and Zod schemas**

  Keep the shared contract metadata-only. Keep executable renderer interfaces in the server visual layer. Validate IDs as `<namespace>.<slot>.<name>` or the existing built-in ID through an explicit backward-compatibility adapter. Do not loosen existing persisted schema fields until the catalog adapter in Task 2 is ready.

- [ ] **Step 4: Run contract tests and shared type checks**

  Run `pnpm --filter @studio/server test -- test/styleModuleContract.test.ts` and `pnpm --filter @studio/shared build`.
  Expected: PASS with existing built-in style IDs still type-checking.

- [ ] **Step 5: Commit the focused contract change after claim verification**

  Release the implementation claim only after the coordination verification gate, then commit only the Task 1 files with message `feat: define independent style module contracts`.

### Task 2: Generate the Runtime Catalog And Registry From Modules

**Files:**
- Create: `apps/server/src/quiz/visual/styleModules/catalog.ts`
- Create: `apps/server/src/quiz/visual/styleModules/builtins.ts`
- Create: `apps/server/src/quiz/visual/styleModules/namespaceCss.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/registry.ts`
- Modify: `apps/server/src/quiz/visual/elements/questionBox/registry.ts`
- Modify: `apps/server/src/quiz/visual/elements/answerCard/registry.ts`
- Modify: `apps/server/src/quiz/visual/elements/counterBadge/registry.ts`
- Modify: `apps/server/src/quiz/visual/elements/background/registry.ts`
- Modify: `apps/server/src/quiz/visual/elements/index.ts`
- Modify: `packages/shared/src/enums/quiz/visualStyles.ts`
- Modify: `packages/shared/src/quizStyles/fieldValidators.ts`
- Test: `apps/server/test/styleCatalog.test.ts`
- Test: `apps/server/test/quizBackgroundRegistry.test.ts`
- Test: `apps/server/test/quizRenderStyleContract.test.ts`

**Interfaces:**
- Consumes `StyleModuleManifest`, `StyleCatalogEntry`, and the existing `VisualElementVariant` contracts from Task 1.
- Produces `getStyleCatalogSnapshot()`, `getStyleCatalogEntry(slot, id)`, and slot adapters consumed by `resolveQuizSceneElementStyles` and the existing render functions.

- [ ] **Step 1: Write failing catalog and compatibility tests**

  Assert that every current built-in style appears exactly once in the catalog, that `energy_laser` resolves to the same renderer as before, that all CSS aggregation functions include the selected module CSS, and that a new slot-local fixture appears without editing a second slot registry.

- [ ] **Step 2: Run the focused tests and confirm generated catalog behavior is absent**

  Run `pnpm --filter @studio/server test -- test/styleCatalog.test.ts test/quizBackgroundRegistry.test.ts test/quizRenderStyleContract.test.ts`.
  Expected: FAIL for the new catalog assertions while existing behavior tests continue to identify any regression.

- [ ] **Step 3: Implement the catalog and built-in adapters**

  Register existing variants through one catalog source and expose compatibility views for the current element registries. Keep `renderQuizSceneParts.ts` and `candyArcadeStyles.ts` calling stable resolver functions. Add selector namespacing checks before CSS is aggregated. Preserve the `auto` fallback behavior and the current style precedence in `resolveQuizStyle`.

- [ ] **Step 4: Replace UI-facing closed lists with a catalog client contract**

  Export catalog DTO types from shared code, but keep existing literal IDs accepted by API schemas during migration. The catalog must supply labels, descriptions, slot, preview path, and availability so future UI code does not import separate `ALL_*_STYLES` lists.

- [ ] **Step 5: Run render and type verification**

  Run `pnpm --filter @studio/server test -- test/styleCatalog.test.ts test/quizBackgroundRegistry.test.ts test/quizRenderStyleContract.test.ts test/quizScenePipeline.test.ts`, then `pnpm typecheck`.
  Expected: all existing built-in render outputs remain compatible and the catalog tests pass.

- [ ] **Step 6: Commit after the registry claim is verified and released**

  Commit only the Task 2 files with message `refactor: generate visual style catalog from slot modules`.

### Task 3: Persist And Manage Style Presets Through The Dashboard

**Files:**
- Create: `packages/shared/src/api/stylePresets.ts`
- Create: `apps/server/src/repository/stylePresets.ts`
- Create: `apps/server/src/routes/stylePresets.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/web/src/api/quizApi.ts`
- Create: `apps/web/src/features/stylePresets/hooks/useStylePresets.ts`
- Create: `apps/web/src/features/stylePresets/components/StylePresetManager.tsx`
- Create: `apps/web/src/features/stylePresets/components/StylePresetEditor.tsx`
- Modify: `apps/web/src/features/sandbox/hooks/useSandboxPresets.ts`
- Modify: `apps/web/src/features/episode/components/customization/PresetPickerDropdown.tsx`
- Test: `apps/server/test/stylePresetsRoutes.test.ts`
- Test: `apps/web/src/features/stylePresets/hooks/useStylePresets.test.ts`
- Test: `apps/web/src/features/stylePresets/components/StylePresetManager.test.tsx`

**Interfaces:**
- Consumes `StyleCatalogSnapshot` from Task 2.
- Produces CRUD endpoints: `GET /api/style-presets`, `POST /api/style-presets`, `PUT /api/style-presets/:presetId`, `DELETE /api/style-presets/:presetId`.
- Produces a typed `StylePreset` record containing a stable ID, user-facing name, description, selected element-style IDs, palette/theme, timestamps, and an immutable revision.

- [ ] **Step 1: Write failing API and UI tests**

  Cover create, rename, duplicate, delete, invalid referenced style ID, and empty-name validation. Verify that a dashboard mutation updates the list without a full-page reload and that a failed mutation preserves the current form input and shows a recoverable error.

- [ ] **Step 2: Run the focused tests and confirm server persistence is absent**

  Run `pnpm --filter @studio/server test -- test/stylePresetsRoutes.test.ts` and `pnpm --filter @studio/web test -- src/features/stylePresets/hooks/useStylePresets.test.ts src/features/stylePresets/components/StylePresetManager.test.tsx`.
  Expected: FAIL because the repository, routes, hook, and manager do not exist.

- [ ] **Step 3: Implement repository and route validation**

  Store presets in the existing repository-owned application data area using the project repository abstraction. Validate each referenced style ID against the catalog before persistence. Return structured errors and keep delete/rename operations idempotent where possible.

- [ ] **Step 4: Implement the dashboard manager and migrate sandbox storage**

  Replace `localStorage` as the source of truth in `useSandboxPresets.ts` with the API hook. Keep a short-lived local draft only for unsaved form input. Use concise labels and visible pending/success/error states for create, save, duplicate, and delete actions.

- [ ] **Step 5: Verify responsive dashboard behavior and synchronization**

  Run `pnpm --filter @studio/server test -- test/stylePresetsRoutes.test.ts`, `pnpm --filter @studio/web test -- src/features/stylePresets/hooks/useStylePresets.test.ts src/features/stylePresets/components/StylePresetManager.test.tsx`, and `pnpm --filter @studio/web build`.
  Expected: named presets persist across reloads and appear in both dashboard and existing preset picker without manual refresh.

- [ ] **Step 6: Commit after API and web claims are separately verified and released**

  Commit only the Task 3 files with message `feat: manage visual style presets from dashboard`.

### Task 4: Add Draft/Active Activation, Reproducibility, And Export

**Files:**
- Create: `apps/server/src/quiz/visual/styleModules/activation.ts`
- Create: `apps/server/src/quiz/visual/styleModules/exportPackage.ts`
- Create: `apps/server/src/routes/styleModules.ts`
- Modify: `apps/server/src/quiz/render/quizRenderStyleContext.ts`
- Modify: `apps/server/src/quiz/render/hyperframesRenderer.ts`
- Modify: `apps/server/src/repository/quiz/quizArtifactsInvalidation.ts`
- Modify: `packages/shared/src/api/channel.ts`
- Modify: `packages/shared/src/schemas/quiz/quizDirector.ts`
- Modify: `apps/web/src/features/episode/hooks/useEpisodeStyles.ts`
- Create: `apps/web/src/features/stylePresets/components/StyleModuleImportDialog.tsx`
- Test: `apps/server/test/styleModuleActivation.test.ts`
- Test: `apps/server/test/styleModuleExport.test.ts`
- Test: `apps/server/test/quizStyleReproducibility.test.ts`
- Test: `apps/web/src/features/stylePresets/components/StyleModuleImportDialog.test.tsx`

**Interfaces:**
- Consumes catalog and preset persistence from Tasks 2 and 3.
- Produces `draft → validate → active` module activation, immutable preset revisions, and export/import of a single element-style module or a selected preset configuration.

- [ ] **Step 1: Write failing activation and reproducibility tests**

  Assert that a draft CSS change does not alter the active catalog, failed validation leaves the prior active revision intact, two modules can be activated independently, and an episode rendered with revision `N` continues resolving revision `N` after revision `N+1` is activated.

- [ ] **Step 2: Run the focused tests and confirm activation boundaries are absent**

  Run `pnpm --filter @studio/server test -- test/styleModuleActivation.test.ts test/quizStyleReproducibility.test.ts`.
  Expected: FAIL because draft/active snapshots and revision pinning do not exist.

- [ ] **Step 3: Implement atomic activation and revision pinning**

  Validate manifest, assets, CSS namespace, timing contract, contrast, and layout compatibility before activation. Write a complete active snapshot in one repository operation. Include module/preset revision identifiers in the resolved render context or persisted episode customization so older renders remain deterministic.

- [ ] **Step 4: Implement export/import using the existing ZIP helper**

  Export `manifest.json`, module source/render assets, animation CSS, preview, and tests metadata. On import, reject unsafe paths, duplicate IDs without an explicit new revision, unsupported engine versions, and missing required assets. Import must stage first, validate second, and activate only after validation succeeds.

- [ ] **Step 5: Verify preview, production, and import workflows**

  Run `pnpm --filter @studio/server test -- test/styleModuleActivation.test.ts test/styleModuleExport.test.ts test/quizStyleReproducibility.test.ts test/quizPreviewProductionStyleParity.test.ts`, `pnpm typecheck`, `pnpm --filter @studio/web test`, and `pnpm --filter @studio/web build`.
  Expected: an imported Thinking Bar appears in the catalog, can be selected independently, renders the same in sandbox and production, and does not change unrelated active styles.

- [ ] **Step 6: Run the full verification gate and release all claims**

  Run `pnpm test`, `pnpm lint`, and `node scripts/agent-validate-zones.mjs --json`. Verify every implementation claim, release it, then inspect `git diff` for unrelated files before integration.

## Completion Criteria

- A request such as “create a new Thinking Bar style” maps to one slot-scoped module without creating or modifying a preset.
- A request such as “create a new preset” creates a named dashboard record that references existing module IDs.
- Editing one module can be previewed and activated without changing unrelated modules or in-flight renders.
- Existing element IDs, presets, episode settings, preview rendering, and production rendering remain backward compatible.
- Presets survive browser reloads and can be exported/imported independently of source-code changes.

