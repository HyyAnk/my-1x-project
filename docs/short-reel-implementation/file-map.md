# File And Ownership Map

## Phase 01 Current-Code Findings

Audited at HEAD `42d2ecd79c2a3e1955499764661d05446a3baf46` with a clean initial baseline. The per-file inventory is now in [portrait manifest](inventory/portrait-removal-manifest.md); future-file proposals below remain proposals, not existing implementations.

| Boundary          | Current Symbol / Contract                                                                                                                                          | Integration Consequence                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic routing     | `apps/server/src/quiz/bank/questionBankToQuizBridge.ts`: createEpisodeFromTopicWithBank(deps), portrait default when title contains shorts OR any archetype is set | Replace both heuristics, not only the title test; do not reuse JIT/transcreation/history side effects for reels                                                  |
| Quick build       | Same bridge: createEpisodeFromQuestionBank; `apps/server/src/routes/questionBank/buildRoutes.ts` defaults render_aspect_ratio to 9:16                              | Include Question Bank quick build and web questionBankApi/list/modal consumers in retirement                                                                     |
| Bootstrap         | `apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts`: bootstrapSingleQuestionEpisode / bootstrapTopicEpisode                                              | Single-question bootstrap writes an Episode config count of 3 with one quiz question; do not copy this workaround                                                |
| Director          | `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts`: resolveTargetLayoutForTopic(topic, aspectRatio)                                                     | Four portrait mappings plus reverse landscape mappings; shared policy and registry must change together                                                          |
| Shared config     | `packages/shared/src/schemas/channel.ts`: QuizConfigSchema owns render_aspect_ratio; episode.ts imports it                                                         | Do not modify only schemas/episode.ts and assume Episode ratio is constrained                                                                                    |
| Runtime roots     | RepositoryService(rootDirectory, storageRoot), pathSafety.createRoots                                                                                              | Active data lives outside repo; bank taxonomy fallback differs from asset root behavior                                                                          |
| Serialization     | RepositoryService.queueEpisodeArtifactMutation<T>(channelId, episodeId, operation) uses instance Map; withMascotWriteLock uses module Map                          | Neither establishes cross-process CAS. buildApp/index have no storage-root writer lock; PORT can differ. Phase 02 must enforce/process-test the chosen guarantee |
| Atomic write      | utils/fs.ts: atomicRenameWithRetry falls back to copyFile + unlink after Windows lock retries                                                                      | Fallback is not an atomic replacement guarantee; evaluate strict Short-Reel write path under scoped ownership and fault injection                                |
| Bank lookup       | bankQueryEngine.queryQuestionBankQuestions(params) defaults limit 50; getQuestionBankQuestion caps lookup at 10000                                                 | Use bounded full pagination and explicit empty behavior; no assumption metadata-less language means non-English                                                  |
| Task submit       | tasks/taskSubmission.ts: submitTask(runtime, taskType, channelId, episodeId, sceneNumber?, requestedImageVariant?, topicHint?)                                     | Non-channel tasks require episode-derived lock key. Introduce proper reel ownership, never put reel IDs in episode_id                                            |
| Task restart      | tasks/taskStateStore.ts: loadTasksFromDisk(runtimeRoot) rewrites RUNNING/WAITING_APPROVAL to FAILED                                                                | Startup mutates task files; do not start real configured app just for read-only inventory                                                                        |
| Events            | routes/events.ts: registerEventsRoutes({tasks, clients}); /api/events WebSocket sends status and active task.updated                                               | Web hooks/useTasks.ts refreshes on reconnect/terminal; reuse reconciliation, add reel-scoped invalidation                                                        |
| Navigation        | hooks/router/useNavigationActions.ts: openEpisode(channelId, episodeId, tab?) creates hash route                                                                   | Add distinct reel route via router parser/actions, components/types.ts, AppViewRouter and useAppOrchestration; no fake Episode destination                       |
| Thumbnail         | thumbnailService.generateEpisodeThumbnail(repository, options); resolveTargetThumbnailRatio also checks title shorts                                               | Reuse planThumbnailWithAI and compileThumbnailPrompt; persistence remains Episode-bound and needs a focused adapter                                              |
| Recent extraction | render/layouts/portrait/styles, render/mascot/productionMascotStateAdapter.ts, render/sandbox/sandboxDocumentTemplates.ts and sandboxRehearsalScript.ts            | Keep extracted boundaries; follow dynamic callers even when no literal portrait string appears                                                                   |

No listener was observed on the standard 4310/2244 ports during inventory. No application process was started against live storage. Existing route integration tests ran against isolated temporary roots and the render suites exercised HTML composition with fixtures; no paid provider or Flow operation ran.

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
| 02    | `packages/shared/src/shortReel/shortReel.schema.ts`, `shortReel.types.ts`, `shortReel.api.ts`, `shortReelSource.schema.ts`, `shortReelSource.ts`; tests `packages/shared/test/shortReel.test.ts`, `shortReelSource.test.ts`; `apps/server/src/repository/shortReels.ts`, `shortReelStorage.ts`, `shortReelAtomicWriter.ts`, `bindings/shortReelBindings.ts`; server tests `shortReelRepository.test.ts`, `shortReelAtomicWriter.test.ts`, `shortReelWriterSafety.test.ts`, `shortReelSourcePersistence.test.ts` |
| 03    | `apps/server/src/shortReel/questionSelection.ts`, `topicConfirmation.ts`; `apps/server/test/shortReelQuestionSelection.test.ts`; `apps/web/src/features/shortReel/ShortReelStudio.tsx`; `apps/web/src/api/shortReelApi.ts`; `apps/server/src/routes/shortReels.ts`                            |
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
