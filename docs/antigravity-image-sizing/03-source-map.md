# Source Map and Responsibility Boundaries

All paths below are repository-relative. They were verified while preparing this packet. Proposed paths are explicitly labeled. The code may change before execution; use CodeGraph first when locating code, then inspect live files and call sites.

## Shared source of truth

| Existing file                                    | Current responsibility                | Required integration                                                    |
| ------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------- |
| `packages/shared/src/quizLayouts.catalog.ts`     | Capability catalog and static metrics | Delegate image metrics to geometry/policy; preserve capability behavior |
| `packages/shared/src/quizLayouts.types.ts`       | Layout/asset types                    | Reuse existing public types; no incompatible narrowing                  |
| `packages/shared/src/quizLayouts.policy.ts`      | Layout compatibility and resolution   | Same effective layout for render and asset plan                         |
| `packages/shared/src/quizLayouts.ts`             | Public exports                        | Preserve existing exports                                               |
| `packages/shared/src/index.ts`                   | Shared package exports                | Export only new public contracts                                        |
| `packages/shared/src/sampleImages.ts`            | Generic SVG specimens                 | Add recommendation-derived specs without replacing unrelated samples    |
| `packages/shared/src/schemas/quiz/quizAssets.ts` | Asset/plan/resolution Zod schemas     | Add optional compatible sizing and actual-dimension fields              |

Proposed modules: `packages/shared/src/quizImageSizing/{types,geometry,policy,index}.ts`. Geometry has no catalog runtime import. Catalog can consume policy output; policy consumes only types/geometry. No server-to-shared dependency reversal.

## Rendering and Sandbox

| Existing file                                                                             | Change boundary                                                                  |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/server/src/quiz/render/layouts/layoutContentGeometry.ts`                            | Reuse/move relevant pure outer geometry; keep a compatibility re-export if moved |
| `apps/server/src/quiz/render/layouts/visualChoicesThree.ts`                               | Replace image width/height/border literals with shared contract-derived values   |
| `apps/server/src/quiz/render/layouts/visualChoicesThreePure.ts`                           | Same; keep square recommendation under current geometry                          |
| `apps/server/src/quiz/render/layouts/styles/splitVersusTwoStyles.ts`                      | Same for visual presentation; no images in text presentation                     |
| `apps/server/src/quiz/render/layouts/mediaLeftChoicesRight.ts`                            | Hero inner viewport geometry                                                     |
| `apps/server/src/quiz/render/layouts/verdictTrueFalse.ts`                                 | Hero inner viewport geometry                                                     |
| `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealStageStyles.ts`    | Nested contain image boxes and dual reveal layers                                |
| `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealBaseStyles.ts`     | Stage border/box model inputs                                                    |
| `apps/server/src/quiz/render/layouts/styles/clueDeduction/clueDeductionEvidenceStyles.ts` | Nested contain/max-size geometry                                                 |
| `apps/server/src/quiz/render/choices/baseChoiceStyles.ts`                                 | Default image fit; keep generic component responsibilities                       |
| `apps/server/src/quiz/render/choices/renderChoiceGroup.ts`                                | Media markup; add only stable diagnostic attributes if needed                    |
| `apps/server/src/quiz/render/scene/sandboxSceneAdapter.ts`                                | Derive specimens from recommendation and active roles                            |
| `apps/server/src/quiz/render/scene/productionSceneAdapter.ts`                             | Production source mapping and sizing metadata propagation                        |
| `apps/server/src/quiz/render/scene/buildQuizSceneParts.ts`                                | Keep shared scene contract coherent                                              |
| `apps/server/src/quiz/render/scene/renderQuizSceneParts.ts`                               | Shared media/choice rendering seam                                               |
| `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`                             | Production uses same layout and scene contract                                   |
| `apps/server/src/quiz/render/sandboxComposition.ts`                                       | Snapshot/rehearsal diagnostics stay in sync                                      |

Proposed server renderer helper: `apps/server/src/quiz/render/layouts/imageSlotStyles.ts`, converting shared geometry to narrowly scoped CSS variables/rules. Do not add a second whole-scene builder. Existing large layout files receive small integration changes, not new planning algorithms.

Proposed web component: `apps/web/src/features/sandbox/components/design/SandboxImageRequirements.tsx`, presentation only. Integrate into `SandboxLayoutSelector.tsx` by extracting its current inline media-spec block. The existing `useSandboxPreviewRenderer.ts` already has a latest request ID and font-readiness staging; extend/test it rather than introducing a parallel fetch lifecycle.

## Episode workflow and persistence

| Existing file                                               | Current risk / required change                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/server/src/quiz/assets/assetPlanner.ts`               | Uses raw beat.layout_id and square subject_scale; resolve actual layout and new sizing |
| `apps/server/src/quiz/assets/promptCompiler.ts`             | Preserve consistency/style; consume ratio-aware framing                                |
| `apps/server/src/quiz/assets/promptFramingRules.ts`         | Shared crop-safe prompt text                                                           |
| `apps/server/src/quiz/assets/assetFingerprint.ts`           | Distinguish source generation/framing identity from render bounds                      |
| `apps/server/src/quiz/assets/resolveQuizAssets.ts`          | Reuse validation and all cache/explicit/provider branches must agree                   |
| `apps/server/src/quiz/assets/assetValidator.ts`             | Completion check currently only validates PNG header/dimensions > 0                    |
| `apps/server/src/quiz/assets/validateAssets.ts`             | Separate 18%-tolerance validator; consolidate or delegate, do not leave dead gate      |
| `apps/server/src/quiz/assets/resolvers/bundleAssetSync.ts`  | Preserve explicit provenance/metadata when transferring sources                        |
| `apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts` | Explicit planning/resolution entry points and downstream invalidation                  |
| `apps/server/src/tasks/pipeline/quizV2PipelineRunner.ts`    | Currently plans only if asset_plan missing; detect stale plans too                     |
| `apps/server/src/quiz/pipeline/invalidation.ts`             | Preserve current downstream semantics, avoid unrelated voice regeneration              |
| `apps/server/src/tasks/video/videoCompositionPreparer.ts`   | Render can load existing stale plan; add preflight sizing check                        |
| `apps/server/src/tasks/video/videoAssetPreparation.ts`      | Validate reused resolution; forward full image config; optimize current bounds         |
| `apps/server/src/tasks/video/imageOptimizer.ts`             | Delegated recommendation and parameter-aware output cache                              |
| `apps/server/src/tasks/fingerprints.ts`                     | Render identity must include current sizing/optimization inputs                        |
| `apps/server/src/quiz/qa/stages/assessAssetQa.ts`           | Surface actual dimension/stale/crop warnings via established QuizIssue                 |

Proposed focused modules:

- `apps/server/src/quiz/assets/reconcileQuizAssetSizing.ts`: pure sizing reconciliation and change classification.
- `apps/server/src/quiz/assets/imageMetadataValidator.ts`: Sharp decoding/normalization and structured dimensional validation.
- `apps/server/src/quiz/assets/ensureQuizAssetSizing.ts`: application boundary for current-plan checks, explicit action policy, and persistence; thin existing task handlers call it.
- `apps/server/src/tasks/video/renderImageIdentity.ts`: pure optimization key and sidecar contract. File I/O stays in optimizer.

Use existing repository read/write methods and task idempotency/serialization mechanisms. Do not build a new repository, task queue, event bus, or migration framework. Before writes, compare captured plan/director/source identity with latest identity and reject stale work using a structured issue; do not let an old job overwrite a newer user selection.

## Provider adapters

- `apps/server/src/quiz/assets/resolvers/providerAssetResolver.ts`: requirement enters primary/fallback adapter. Preserve config and ratio through retry/fallback branches.
- `apps/server/src/providers/gpti2Dimensions.ts`: existing ratio-to-supported-size mapping.
- `apps/server/src/providers/gpti2/generator.ts` and `gpti2/provider.ts`: request construction and persistence.
- `apps/server/src/providers/imgstudio/dimensions.ts`, `generator.ts`, `provider.ts`: ratio/preset validation, request, result metadata.
- `apps/server/src/providers/shopAiKeyImage.ts`: size precedence and actual HTTP payload; currently an environment size can override derived size.
- `apps/server/src/providers/googleImagen.ts`: retain existing supported behavior if exercised by the selected pipeline; do not activate it as a new default.
- `apps/server/src/providers/antigravityImageChain.ts`: existing fallback chain must retain requirement framing; no new remote execution during tests.

Shared pure sizing never imports these adapters. Provider-supported exact sizes remain adapter-owned.

## Existing UI state seams

- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts`: request ordering, pending preview, font readiness, error recovery.
- `apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx`: existing image-spec surface.
- `apps/web/src/features/episode/hooks/useEpisodeTaskTracking.ts`: task completion/refetch seam.
- `apps/web/src/features/episode/hooks/useEpisodeActions.ts`: explicit user actions and pending state.
- `apps/web/src/features/episode/utils/railStatusResolver.ts` and `railProgressCalculator.ts`: do not count stale assets as ready just by array length.
- `apps/web/src/features/episode/components/quiz/QuizV2Assessment.tsx`: existing warning/blocker surface.

Do not infer that all these files must change. Follow the actual call path and modify the smallest cohesive set that covers the acceptance tests.
