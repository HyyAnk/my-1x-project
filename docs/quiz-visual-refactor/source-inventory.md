# Quiz Visual Source Inventory

This inventory routes fresh tasks to current responsibilities. It is not an exhaustive list of every transitive consumer.

## Shared contracts

| Path                                              | Responsibility                                             | Current role                                      |
| ------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| packages/shared/src/schemas/common.ts             | Global quiz count limits                                   | Locks the current 2/3-choice contract             |
| packages/shared/src/schemas/quiz.ts               | QuizV2, DirectorPlan, format-specific choice validation    | Preserves persisted layout IDs and domain counts  |
| packages/shared/src/enums.ts                      | Layout, palette, motion, transition, and element style IDs | Authoritative persisted layout enum               |
| packages/shared/src/quizLayouts.ts                | Public layout capability barrel                            | Exposes the single shared policy                  |
| packages/shared/src/quizLayouts.types.ts          | Typed capability, metric, result, and issue contracts      | Pure shared contract                              |
| packages/shared/src/quizLayouts.catalog.ts        | Production catalog and preview-only baseline capability    | Sole owner of compatibility facts and dimensions  |
| packages/shared/src/quizLayouts.policy.ts         | Compatibility evaluation and deterministic resolution      | Owns executable auto/explicit policy              |
| packages/shared/src/sandboxPreviewLayoutPolicy.ts | Sandbox compatibility context and structured error schema  | Keeps preview policy out of the API module        |
| packages/shared/src/presets.ts                    | Built-in visual style bundles                              | Preserves layout/preset separation                |
| packages/shared/src/api.ts                        | Sandbox preview schemas and capability validation          | Rejects incompatible preview requests predictably |

## Server visual domain

| Path                                                        | Responsibility                                                | Current role                         |
| ----------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| apps/server/src/quiz/visual/types.ts                        | Template, palette, tokens, scene, and text-layout contracts   | Baseline current scene contract      |
| apps/server/src/quiz/visual/candyArcade.ts                  | Palette, layout, motion, transition, and text-tier resolution | Resolver and typography observations |
| apps/server/src/quiz/visual/elements/types.ts               | Generic element variant contract                              | Registry characterization            |
| apps/server/src/quiz/visual/elements/answerCard/types.ts    | Answer Card skin and bounded hook contracts                   | Keeps workflow out of skins          |
| apps/server/src/quiz/visual/elements/answerCard/registry.ts | Answer Card skin registry and defaults                        | Exact enum parity and CSS assembly   |
| apps/server/src/quiz/visual/elements/answerCard/variants    | Four Answer Card skins                                        | Text/visual hooks and decorations    |
| apps/server/src/quiz/visual/elements/questionBox            | Question Box registry and variants                            | Style combination baseline           |
| apps/server/src/quiz/visual/elements/thinkingBar            | Thinking Bar registry and variants                            | Style combination baseline           |
| apps/server/src/quiz/visual/elements/counterBadge           | Counter Badge registry and variants                           | Style combination baseline           |

## Server rendering

| Path                                                                       | Responsibility                                             | Current role                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| apps/server/src/quiz/render/candyArcadeComposition.ts                      | Production composition orchestration                       | Resolves one accepted layout per question         |
| apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts                | Production clip surface                                    | Calls shared model and semantic choice part       |
| apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts               | Scene stylesheet assembly and catalog metric consumption   | Assembles focused owners and selected backgrounds |
| apps/server/src/quiz/render/sandboxComposition.ts                          | Sandbox document and mascot surface                        | Calls shared model and semantic parts             |
| apps/server/src/quiz/render/scene/quizScene.types.ts                       | Normalized model, state, assets, layout, styles, occupancy | Explicit Phase 3 scene contract                   |
| apps/server/src/quiz/render/scene/*SceneAdapter.ts                         | Production and Sandbox normalization                       | Separate surface adapters                         |
| apps/server/src/quiz/render/scene/*SceneStateAdapter.ts                    | Timeline and simulated-phase mapping                       | Pure common-state producers                       |
| apps/server/src/quiz/render/scene/buildQuizSceneRenderModel.ts             | Canonical normalization                                    | Single model builder for both surfaces            |
| apps/server/src/quiz/render/scene/buildQuizSceneParts.ts                   | Question, counter, media, choices, phase, brand semantics  | Single semantic-part builder                      |
| apps/server/src/quiz/render/scene/renderQuizSceneParts.ts                  | Stable shared element and choice HTML                      | Resolves skin and semantic choice renderer        |
| apps/server/src/quiz/render/choices/choiceGroup.types.ts                   | Unified renderer input and content contracts               | Text/visual semantic boundary                     |
| apps/server/src/quiz/render/choices/renderChoiceGroup.ts                   | Choice group/card rendering                                | Single workflow owner for both surfaces           |
| apps/server/src/quiz/visual/elements/background/registry.ts                | Background resolution and selected CSS assembly            | Canonical variant registry                        |
| apps/server/src/quiz/visual/elements/background/semanticBackgroundLayer.ts | Shared semantic background wrapper                         | One production/Sandbox layer contract             |
| apps/server/src/quiz/render/layouts/types.ts                               | Unified layout slots and renderer definition               | One active `choicesHtml` contract                 |
| apps/server/src/quiz/render/layouts/registry.ts                            | Layout renderer registry                                   | Renderer exhaustiveness; no dimensions view       |
| apps/server/src/quiz/render/layouts/baseline.ts                            | Preview-only compatibility layout                          | Distinguish preview from production catalog       |
| apps/server/src/quiz/render/layouts/mediaLeftChoicesRight.ts               | Text/media layout structure and CSS                        | Layout-to-skin coupling baseline                  |
| apps/server/src/quiz/render/layouts/visualChoicesThree.ts                  | Visual-three layout structure and CSS                      | Visual typography baseline                        |
| apps/server/src/quiz/render/layouts/mediaTopChoicesBottom.ts               | Top-media layout structure and CSS                         | Explicit-only production proof layout             |
| apps/server/src/quiz/render/layouts/fullStackList.ts                       | Full-stack layout structure and CSS                        | Explicit-only production proof layout             |

## Director, QA, assets, and optimization

| Path                                                  | Responsibility                           | Current role                             |
| ----------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| apps/server/src/quiz/director/parseDirectorPlan.ts    | Deterministic default Director plan      | Uses established auto policy             |
| apps/server/src/quiz/director/validateDirectorPlan.ts | Director semantic validation             | Maps shared capability failures          |
| apps/server/src/quiz/qa/visualQa.ts                   | Text fit, contrast, asset, and motion QA | Consumes accepted capability metrics     |
| apps/server/src/quiz/assets/assetPlanner.ts           | Hero versus option asset intent          | Choice representation inputs             |
| apps/server/src/tasks/video/imageOptimizer.ts         | Layout-dependent render image dimensions | Consumes canonical catalog asset metrics |

Phase 2 adds `apps/server/src/quiz/layoutCompatibility.ts` as the thin adapter from shared resolution issues to Director/QA `QuizIssue` records. `imageOptimizer.ts` now consumes shared asset metrics, and `videoAssetPreparation.ts` resolves each question's layout before optimization.

## Web preview and customization

| Path                                                                      | Responsibility                        | Current role                          |
| ------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts                  | UI metadata for production layouts    | UI exhaustiveness baseline            |
| apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx | Accessible catalog-driven combobox    | Scalable layout selection             |
| apps/web/src/features/sandbox/hooks/useSandboxDesignState.ts              | Sandbox selected design state         | Default and mutation baseline         |
| apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts          | Async preview request lifecycle       | Stale-response and request baseline   |
| apps/web/src/features/episode/utils/episodePreviewQuestions.ts            | Question-to-layout preview resolution | Auto/director baseline                |
| apps/web/src/features/episode/services/buildEpisodePreviewRequest.ts      | Preview request composition           | Selected layout and style propagation |
| apps/web/src/features/episode/utils/quizStyleResolution.ts                | Channel/episode style resolution      | Current precedence baseline           |
| apps/web/src/features/episode/hooks/useEpisodeStyles.ts                   | Style and preset mutations            | Preset materialization baseline       |

## High-value existing tests

| Test                                                                   | Existing focus                               | Current evidence role                           |
| ---------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| apps/server/test/quizLayoutRegistry.test.ts                            | Renderer/catalog parity and slot selection   | Explicit layout compatibility observations      |
| apps/server/test/sandboxComposition.test.ts                            | Registries, phases, mascot, combinations     | Sandbox markup matrix                           |
| apps/server/test/quizVisualContractsCharacterization.test.ts           | Resolver, slots, choice paths, tiers, CSS    | Phase 1 deterministic contract baseline         |
| apps/server/test/sandboxVisualCharacterization.test.ts                 | Sandbox phases, skins, pairwise renders      | Phase 1 pairwise structural baseline            |
| apps/server/test/candyArcadeVisualRegression.test.ts                   | CSS and visual contracts                     | Aspect ratio, typography, and geometry baseline |
| apps/server/test/candyArcade.test.ts                                   | Template, QA, composition, canonical answer  | Production choice and resolver baseline         |
| apps/server/test/quizSceneModel.test.ts                                | Model, state adapters, shared semantic parts | Phase 3 pure contract matrix                    |
| apps/server/test/quizScenePipeline.test.ts                             | Both public composition entry points         | Phase 3 cross-surface integration matrix        |
| apps/server/test/quizChoiceGroupRenderer.test.ts                       | Semantic choice and all-skin matrix          | Phase 4 renderer/domain evidence                |
| apps/web/src/features/stageStudio/questionLayouts.test.ts              | UI layout metadata parity                    | Catalog/UI baseline                             |
| apps/web/src/features/episode/utils/episodePreviewQuestions.test.ts    | Director and inferred layouts                | Resolution matrix                               |
| apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx | Preview requests                             | Selected-layout mutation request baseline       |
| apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx    | Selected question preview                    | Layout propagation and stale response baseline  |

Phase 2 added `quizLayoutCapabilities.test.ts` and `quizLayoutPreviewRoute.test.ts`; Phases 3–7 added scene, choice, CSS, layout/UI, and background suites. Phase 8 adds style-boundary, persistence, preview/production parity, semantic background parity, running-browser E2E, and `P8D-DIM-01` catalog-consumer drift coverage. Existing async and artifact suites remain required regression evidence.

## Search anchors

Prefer symbols over line numbers when current code has moved:

- QuizQuestionSchema
- quizChoiceCountForFormat
- QUIZ_LAYOUT_CATALOG
- resolveQuizLayout
- evaluateQuizLayoutCompatibility
- sandboxPreviewLayoutIssues
- QUIZ_LAYOUT_RENDERERS
- QuizLayoutSlots
- questionClip
- buildQuizSceneRenderModel
- buildQuizSceneParts
- adaptProductionQuizScene
- adaptSandboxQuizScene
- productionSceneStateAt
- sandboxSceneState
- renderQuizSceneBackground
- getSelectedBackgroundStylesCss
- renderQuizSceneChoicePart
- renderChoiceGroup
- AnswerCardSkin
- choicesHtml
- buildSandboxComposition
- VisualPresetItem
- getOptimalAssetDimensions
