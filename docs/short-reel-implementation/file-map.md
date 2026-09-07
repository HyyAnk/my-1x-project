# File And Ownership Map

Paths below are verified existing entry points or proposed new files, not an exhaustive portrait audit. Phase 01 must follow current callers and populate the inventory. Recent changes extracted mascot/render/Sandbox services; preserve those boundaries.

## Existing Entry Points

| Responsibility             | Read First                                                                                                                | Relevant Ownership                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Topic/quiz DTOs            | `packages/shared/src/schemas/channel.ts`, `packages/shared/src/api/channel.ts`                                            | shared-contracts                    |
| Bank schema                | `packages/shared/src/schemas/questionBank.ts`                                                                             | shared-contracts                    |
| Topic planning             | `apps/server/src/context/topicMatrixPlanner.ts`                                                                           | api-contracts                       |
| Topic confirmation/storage | `apps/server/src/repository/topics.ts`, `apps/server/src/routes/channels.ts`                                              | artifact-contracts, api-contracts   |
| Bank lookup                | `apps/server/src/repository/quiz/questionBankRepository.ts`, `apps/server/src/repository/quiz/bank/bankQueryEngine.ts`    | artifact-contracts                  |
| Repository wiring          | `apps/server/src/repository/service.ts`, `types.ts`, `runtime.ts`, `bindings/`                                            | artifact-contracts                  |
| Thumbnail                  | `apps/server/src/quiz/thumbnail/thumbnailService.ts` and compiler/types                                                   | image-thumbnail-prompt              |
| Task orchestration         | `apps/server/src/tasks/`, `apps/server/src/app.ts`                                                                        | task-status-progress, api-contracts |
| Topic cards                | `apps/web/src/features/channel/components/TopicCard.tsx`, `ChannelTopicsTab.tsx`                                          | web-layout-style                    |
| Navigation                 | `apps/web/src/components/AppViewRouter.tsx`, `apps/web/src/hooks/useAppOrchestration.ts`                                  | web-layout-style, web-api-state     |
| Layout contracts           | `packages/shared/src/quizLayouts.catalog.ts`, `quizLayouts.policy.ts`, `quizLayouts.types.ts`                             | shared-layout-contracts             |
| Mascot render contracts    | `packages/shared/src/mascot/`, `schemas/mascot.ts`                                                                        | shared-mascot-contracts             |
| Portrait renderer          | `apps/server/src/quiz/render/layouts/portrait/` including extracted styles                                                | render-implementation               |
| Sandbox                    | `apps/web/src/features/sandbox/VisualSandboxTab.tsx`, `hooks/useSandboxLayoutSync.ts`, `services/sandboxPresetService.ts` | web-layout-style, web-api-state     |

Resolve full paths for `types.ts`/`bindings/` relative to the named repository folder. Use the actual current zone map to decide ownership, not this descriptive table alone.

## Proposed Focused Files

| Phase | New Files                                                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 02    | `packages/shared/src/shortReel/shortReel.schema.ts`, `shortReel.types.ts`, `shortReel.api.ts`; `packages/shared/test/shortReel.test.ts`; `apps/server/src/repository/shortReels.ts`, `shortReelStorage.ts`, `bindings/shortReelBindings.ts`; `apps/server/test/shortReelRepository.test.ts` |
| 03    | `apps/server/src/shortReel/questionSelection.ts`, `topicConfirmation.ts`; `apps/server/test/shortReelQuestionSelection.test.ts`; `apps/web/src/features/shortReel/ShortReelStudio.tsx`; `apps/web/src/api/shortReels.ts`; `apps/server/src/routes/shortReels.ts`                            |
| 04    | `apps/server/src/shortReel/scriptService.ts`, `scriptPrompt.ts`, `flowPromptCompiler.ts`, `revisionPolicy.ts`; server tests `shortReelScript.test.ts`, `shortReelPrompt.test.ts`, `shortReelRevision.test.ts`                                                                               |
| 05    | `apps/server/src/shortReel/packageService.ts`, `referenceResolver.ts`, `thumbnailAdapter.ts`, `publishingService.ts`, `exportService.ts`; `apps/server/test/shortReelPackage.test.ts`                                                                                                       |
| 06    | Short-Reel feature `components/SegmentEditor.tsx`, `ReelAssets.tsx`, `PublishingPanel.tsx`, `hooks/useShortReel.ts`, `hooks/useShortReel.test.tsx`; `apps/server/test/shortReelRoutes.test.ts`; `apps/web/e2e/shortReel.spec.ts` if that testDir matches current Playwright config          |
| 07    | No replacement portrait renderer; remove/narrow exact paths in approved inventory. New regression tests only where existing files cannot express required behavior                                                                                                                          |
| 08    | Evidence and integration tests for actual gaps; no new product feature                                                                                                                                                                                                                      |

For shorthand new filenames, use the first full directory in the corresponding group. Before creating the files, record fully expanded paths in the phase evidence/claim. If existing conventions provide a better cohesive location, document the mapping and update downstream references before editing; do not maintain duplicate implementations.

## Ownership Preparation

New `apps/server/src/shortReel/` application files require explicit coverage. Phase 01 proposes a focused `short-reel-application` zone, with dependencies on shared contracts/artifact contracts and companion server tests, through the existing integrator process. This kit does not edit the zone map or grant itself protocol authority. Phase 02 must confirm coverage is approved/applied before new application files in Phase 03.

Shared contracts, API, storage, tasks and render inputs are high-risk areas. Claim their actual exclusive zones; disjoint source files do not override exclusive policy. Documentation here maps to `repository-docs`; external handoffs map to `coordination-handoffs`.

## Baseline Warning

At kit creation, HEAD was `52071bfa2acf0bebc3eb24359aa408afdbb9e5d0`; claim baseline contained 54 dirty files including newly extracted modules. This is historical evidence, not permission to overwrite them. Capture a new baseline for every execution phase.
