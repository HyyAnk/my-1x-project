# Verified Code Inventory

Planning snapshot: 2026-09-11, checkout `a83220f` with extensive uncommitted changes. The working tree, not `HEAD`, is the actual baseline. Re-run symbol discovery before editing.

## Source changes

| File or symbol | Observed role | Required action |
| --- | --- | --- |
| `apps/server/src/quiz/render/buildComposition.ts:25` | V1 scene-based HTML renderer, including unused asset/BGM/mascot options and unused age/theme config | Delete the file after all imports migrate; do not refactor V1 first |
| Same file, `buildQuizV2Composition`, `buildQuizV2CompositionBundle`, `QuizV2CompositionInput` | Pass-through wrappers and duplicate input contract | Remove with the file; call the existing Candy Arcade boundary directly |
| `apps/server/src/quiz/render/hyperframesRenderer.ts:6` | Production adapter currently calls V2 wrapper | Change only import and builder call; preserve parameter forwarding and returned metadata |
| `apps/server/src/tasks.ts:2` | Re-exports V1 builder | Delete that export, retain task-manager exports |
| `apps/server/src/tasks/video/videoCompositionPreparer.ts:95` | Missing V2 allowed when an existing video path is truthy | Replace with non-null required-artifact loader |
| Same file, `compileCompositionHtml` | V2 branch and V1 fallback | Keep V2 mapping only; require non-null artifacts |
| Same file, `prepareVideoComposition` | Conditional V2 asset, preflight, soundtrack work; style pin/copy currently precede artifact check | Run guard first; make the V2 stages unconditional; remove boolean state |
| `apps/server/src/tasks/video/renderManifestWriter.ts:67` | Selects version 1/2 and `legacy_skipped` from the boolean | Write V2-only values and require a real preflight result |
| `apps/server/src/tasks/videoRunner.ts:137` | Forwards `comp.completeQuizV2` | Remove argument; preserve cleanup and new transition-related changes |
| `apps/server/src/quiz/render/layouts/registry.ts:25` | Unused `QUIZ_LAYOUT_REGISTRY` alias | Delete alias only, not the renderer registry |
| `apps/server/src/tasks/pipeline/quizProductionPipelineRunner.ts:11` | Legacy sequence helper and narrative workflow | Delete `executeShotPlanSequences` and `runLegacyPipeline` |
| Same file, `runPipelineTask:216` | Environment-based pipeline selector | Always call the existing quiz-native function |

## New focused files

| File | Responsibility |
| --- | --- |
| `apps/server/src/tasks/video/quizRenderArtifacts.types.ts` | Narrow repository reader contract and required V2 artifact result type |
| `apps/server/src/tasks/video/quizRenderArtifacts.ts` | Read the five artifacts, enforce completeness, report missing filenames |
| `apps/server/test/quizRenderArtifacts.test.ts` | Presence matrix, malformed/read failure propagation, slow-read barrier |
| `apps/server/test/quizV2OnlyCompositionPreparation.test.ts` | Integration guard: existing video does not bypass V2 and no preparation side effects occur |
| `apps/server/test/renderManifestWriter.test.ts` | New manifest always represents V2 with actual preflight; preserve other metadata |
| `apps/server/test/quizV1RetirementArchitecture.test.ts` | Narrow source-level tripwire against resurrection of the retired branch |

If an identically named test is added by another worker before execution, extend it; do not overwrite it or introduce a parallel test file.

## Existing tests to migrate or extend

| File | Action |
| --- | --- |
| `apps/server/test/videoRunner.test.ts` | Remove V1-only cases; use canonical bundle APIs; preserve V2 validation and renderer parity coverage |
| `apps/server/test/quizPipeline.test.ts` | Replace first V1 composition test and remove its now-unused `scene` fixture; keep layout, capability, and visual preset tests |
| `apps/server/test/quizNativeFlowEndToEnd.test.ts` | Step 5 must build V2 bundle from the existing quiz/director/timeline, checking root and mounted files; keep synthesis tests |
| `apps/server/test/quizProductionPipelineFastPath.test.ts` | Replace positive legacy-flag test with V2-only tests even when flag is true; preserve native resume/scene behavior |
| `apps/server/test/artifactRetentionPruner.test.ts:135` | Remove false `completeQuizV2` and replace null preflight fixture with a valid assessment; preserve pruning assertions |
| `apps/server/test/videoRunnerStyleBoundary.test.ts` | Positive runner/renderer integration reference and failure/cleanup extensions |
| `apps/server/test/videoRunnerCancellationLifecycle.test.ts` | Preserve cancellation and controller ownership contracts |
| `apps/server/test/renderConcurrencyLimiter.test.ts` | Preserve slot cleanup and other-episode behavior |
| `apps/server/test/quizPreviewProductionStyleParity.test.ts` | Preserve sandbox/production style parity |
| `apps/server/test/quizRenderStyleContract.test.ts` | Preserve explicit style contract |
| `apps/server/test/transitionRenderArtifacts.test.ts` | Preserve engine/hash/transition manifest fields |

Search all mocks of `prepareVideoComposition` and all callers of `persistVideoRenderArtifacts`; the list may grow with concurrent changes. Update fixtures to satisfy the new contract rather than casting away errors.

## Documentation changes required during implementation

- `docs/architecture.md`: remove instructions describing the old flag as a supported compatibility mode.
- `docs/quiz-engine-v2.md`: document the single pipeline, five-artifact requirement, and re-render compatibility break.
- `docs/troubleshooting.md`: add recovery for missing/malformed V2 artifacts without automatic regeneration.
- `docs/antigravity-image-sizing/05-acceptance.md`: its production-proof instruction currently names `buildQuizComposition`; replace that obsolete entry point with `prepareQuizVideoRender` / `HyperframesRenderer.prepare` and the V2 bundle.
- Recheck tracked environment examples and launchers for `USE_LEGACY_QUIZ_PIPELINE`. Remove obsolete recommendations if found, without printing credentials from local environment files.
- Keep this handoff as a historical record; update its execution status and evidence rather than claiming every historical occurrence of a retired name is an error.

## Explicit keep list

- `quiz/domain/quizArtifactSynthesizer.ts` and `tasks/handlers/directQuizHandler.ts`.
- `Scene`, scene files, script/dialogue/visual-bible compatibility artifacts still produced by quiz-native generation.
- All eight active layout modules and `layouts/baseline.ts`.
- `QUIZ_LAYOUT_RENDERERS`, `renderQuizLayoutBody`, layout capability catalog, preset adapters, preview APIs.
- The canonical `esc`/source helpers in Candy Arcade; deleting the V1-local `escapeHtml` does not authorize removing shared escaping.
- `buildCandyArcadeComposition`, which has callers outside the deleted wrapper.
- Mascot compatibility adapters, old manifest readers, asset-provider fallbacks, optional intro/outro fallback behavior, and Short Reel code.
- `pipelineHelpers.ts`, `planning.ts`, narrative task handlers, and task enum values with other consumers.
- Existing transition-unification and layout-unification edits, including untracked files.

## Discovery commands

Run CodeGraph first. Use these exact searches to enumerate text-only imports and leftover references afterward:

```powershell
rg -n '\bbuildQuizComposition\b|\bbuildQuizV2Composition\b|\bbuildQuizV2CompositionBundle\b|\bQuizV2CompositionInput\b|\bQUIZ_LAYOUT_REGISTRY\b|\bcompleteQuizV2\b' apps packages scripts -g '*.ts' -g '*.tsx' -g '*.mjs' -g '!dist' -g '!node_modules'
rg -n 'USE_LEGACY_QUIZ_PIPELINE|runLegacyPipeline|executeShotPlanSequences' apps packages scripts docs -g '*.ts' -g '*.tsx' -g '*.md' -g '*.mjs' -g '!dist' -g '!node_modules'
rg -n 'prepareVideoComposition|persistVideoRenderArtifacts' apps/server/test -g '*.ts'
rg -n 'synthesizeAllLegacyArtifacts|planSequenceResume|extractNarrationSections|hasReadyScript|isShotPlanFresh' apps/server/src -g '*.ts'
```

`rg` exit code 1 means no matches; exit code 2 means an actual search error. Use `-g` for filename patterns on Windows, not shell globs embedded in path arguments.
