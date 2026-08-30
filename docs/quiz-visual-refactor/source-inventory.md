# Quiz Visual Source Inventory

This inventory routes fresh tasks to current responsibilities. It is not an exhaustive list of every transitive consumer.

## Shared contracts

| Path                                  | Responsibility                                             | Phase 1 relevance                                    |
| ------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| packages/shared/src/schemas/common.ts | Global quiz count limits                                   | Locks the current 2/3-choice contract                |
| packages/shared/src/schemas/quiz.ts   | QuizV2, DirectorPlan, format-specific choice validation    | Characterize accepted and rejected inputs            |
| packages/shared/src/enums.ts          | Layout, palette, motion, transition, and element style IDs | Record exhaustive persisted enums                    |
| packages/shared/src/quizLayouts.ts    | Layout catalog and auto resolver                           | Characterize metadata and non-enforced compatibility |
| packages/shared/src/presets.ts        | Built-in visual style bundles                              | Record layout/preset separation                      |
| packages/shared/src/api.ts            | Sandbox preview request schema                             | Characterize preview choice and style boundaries     |

## Server visual domain

| Path                                                        | Responsibility                                                | Phase 1 relevance                    |
| ----------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| apps/server/src/quiz/visual/types.ts                        | Template, palette, tokens, scene, and text-layout contracts   | Baseline current scene contract      |
| apps/server/src/quiz/visual/candyArcade.ts                  | Palette, layout, motion, transition, and text-tier resolution | Resolver and typography observations |
| apps/server/src/quiz/visual/elements/types.ts               | Generic element variant contract                              | Registry characterization            |
| apps/server/src/quiz/visual/elements/answerCard/types.ts    | Answer Card render input                                      | Confirms text-only input             |
| apps/server/src/quiz/visual/elements/answerCard/registry.ts | Answer Card registry and defaults                             | Registry completeness baseline       |
| apps/server/src/quiz/visual/elements/answerCard/variants    | Four Answer Card implementations                              | Duplication and markup baseline      |
| apps/server/src/quiz/visual/elements/questionBox            | Question Box registry and variants                            | Style combination baseline           |
| apps/server/src/quiz/visual/elements/thinkingBar            | Thinking Bar registry and variants                            | Style combination baseline           |
| apps/server/src/quiz/visual/elements/counterBadge           | Counter Badge registry and variants                           | Style combination baseline           |

## Server rendering

| Path                                                         | Responsibility                                            | Phase 1 relevance                           |
| ------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------- |
| apps/server/src/quiz/render/candyArcadeComposition.ts        | Production composition orchestration                      | Default and beat style precedence           |
| apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts  | Production scene, text choice, and visual choice HTML     | Main production baseline                    |
| apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts | Base, layout, state, background, and variant CSS assembly | CSS ownership baseline                      |
| apps/server/src/quiz/render/sandboxComposition.ts            | Sandbox preview assembly                                  | Preview/production comparison               |
| apps/server/src/quiz/render/layouts/types.ts                 | Layout slots and renderer definition                      | Slot contract baseline                      |
| apps/server/src/quiz/render/layouts/registry.ts              | Layout registry and dimensions                            | Exhaustiveness and duplication baseline     |
| apps/server/src/quiz/render/layouts/baseline.ts              | Preview-only compatibility layout                         | Distinguish preview from production catalog |
| apps/server/src/quiz/render/layouts/mediaLeftChoicesRight.ts | Text/media layout structure and CSS                       | Layout-to-skin coupling baseline            |
| apps/server/src/quiz/render/layouts/visualChoicesThree.ts    | Visual-three layout structure and CSS                     | Visual typography baseline                  |

## Director, QA, assets, and optimization

| Path                                                  | Responsibility                           | Phase 1 relevance                                |
| ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| apps/server/src/quiz/director/parseDirectorPlan.ts    | Deterministic default Director plan      | Hard-coded layout selection baseline             |
| apps/server/src/quiz/director/validateDirectorPlan.ts | Director semantic validation             | Confirms missing layout compatibility validation |
| apps/server/src/quiz/qa/visualQa.ts                   | Text fit, contrast, asset, and motion QA | Confirms selected-layout capacity gap            |
| apps/server/src/quiz/assets/assetPlanner.ts           | Hero versus option asset intent          | Choice representation inputs                     |
| apps/server/src/tasks/video/imageOptimizer.ts         | Layout-dependent render image dimensions | Hard-coded layout consumer                       |

## Web preview and customization

| Path                                                                      | Responsibility                        | Phase 1 relevance                     |
| ------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts                  | UI metadata for production layouts    | UI exhaustiveness baseline            |
| apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx | Current two-button selector           | Current scalable-UI limitation        |
| apps/web/src/features/sandbox/hooks/useSandboxDesignState.ts              | Sandbox selected design state         | Default and mutation baseline         |
| apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts          | Async preview request lifecycle       | Stale-response and request baseline   |
| apps/web/src/features/episode/utils/episodePreviewQuestions.ts            | Question-to-layout preview resolution | Auto/director baseline                |
| apps/web/src/features/episode/services/buildEpisodePreviewRequest.ts      | Preview request composition           | Selected layout and style propagation |
| apps/web/src/features/episode/utils/quizStyleResolution.ts                | Channel/episode style resolution      | Current precedence baseline           |
| apps/web/src/features/episode/hooks/useEpisodeStyles.ts                   | Style and preset mutations            | Preset materialization baseline       |

## High-value existing tests

| Test                                                                   | Existing focus                              | Phase 1 extension point                         |
| ---------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| apps/server/test/quizLayoutRegistry.test.ts                            | Renderer/catalog parity and slot selection  | Explicit layout compatibility observations      |
| apps/server/test/sandboxComposition.test.ts                            | Registries, phases, mascot, combinations    | Sandbox markup matrix                           |
| apps/server/test/quizVisualContractsCharacterization.test.ts           | Resolver, slots, choice paths, tiers, CSS   | Phase 1 deterministic contract baseline         |
| apps/server/test/sandboxVisualCharacterization.test.ts                 | Sandbox phases, skins, pairwise renders     | Phase 1 pairwise structural baseline            |
| apps/server/test/candyArcadeVisualRegression.test.ts                   | CSS and visual contracts                    | Aspect ratio, typography, and geometry baseline |
| apps/server/test/candyArcade.test.ts                                   | Template, QA, composition, canonical answer | Production choice and resolver baseline         |
| apps/web/src/features/stageStudio/questionLayouts.test.ts              | UI layout metadata parity                   | Catalog/UI baseline                             |
| apps/web/src/features/episode/utils/episodePreviewQuestions.test.ts    | Director and inferred layouts               | Resolution matrix                               |
| apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx | Preview requests                            | Selected-layout mutation request baseline       |
| apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx    | Selected question preview                   | Layout propagation and stale response baseline  |

## Search anchors

Prefer symbols over line numbers when current code has moved:

- QuizQuestionSchema
- quizChoiceCountForFormat
- QUIZ_LAYOUT_CATALOG
- resolveQuizLayoutId
- supportsQuizLayoutChoiceCount
- QUIZ_LAYOUT_RENDERERS
- QuizLayoutSlots
- questionClip
- answerCards
- visualAnswerCards
- buildSandboxComposition
- AnswerCardRenderInput
- VisualPresetItem
- getOptimalAssetDimensions
