# Wave 2 Batch 9: TaskManager God-Class Decomposition Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: refactor-wave2-09-task-manager
- Working mode: main-direct
- Baseline before edits: `git status --porcelain` snapshot saved (162 dirty files); claim `claim-refactorwave209taskmanager-mtsxd5i9` created before any edit

## Source Files Read

- AGENTS.md
- apps/server/src/tasks/manager.ts (original, 341 lines)
- apps/server/src/tasks/taskDelegates.ts (original, 177 lines — now deleted)
- apps/server/src/tasks/runtime.ts, taskLifecycle.ts, taskApprovalManager.ts, taskQueuePump.ts, taskClientEvents.ts, taskSubmission.ts, taskFailedBuildCleaner.ts, taskMutationQueue.ts, codexRunner.ts, imageRunner.ts, audioRunner.ts, videoRunner.ts, pipelineRunner.ts, pipeline/pipelineHelpers.ts, pipeline/quizProductionPipelineRunner.ts, stream/approvalHandler.ts, stream/notificationHandler.ts, handlers/outputCompletionHandler.ts, codexRetries.ts
- Consumers: apps/server/src/tasks.ts (barrel), apps/server/src/app.ts, apps/server/src/routes/*.ts, tests: tasks.test.ts, taskLifecycle.test.ts, shortReelRoutesTestUtils.ts, videoCancellation.test.ts, videoRunnerCancellationLifecycle.test.ts, pipelineVideoProgress.test.ts, shortReelRoutesGenerate.test.ts, topicToEpisodePipelineE2E.test.ts

## Files Changed

- Modified: `apps/server/src/tasks/manager.ts` (341 -> 429 lines)
- Deleted: `apps/server/src/tasks/taskDelegates.ts` (177 lines)
- Created: `apps/server/src/tasks/taskAbortRegistry.ts` (56 lines)
- Created: `apps/server/src/tasks/taskQueueCoordinator.ts` (59 lines)
- Created: `apps/server/src/tasks/pipelineExecutionEngine.ts` (34 lines)
- Created: `apps/server/src/tasks/taskApprovalRegistry.ts` (48 lines)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (162 files; final diff confirmed current dirty set is a strict superset — no baseline file touched or reverted)
- Pre-existing dirty files touched: none (codexRetries.ts, codexRunner.ts, handlers/textArtifactHandlers.ts, video/videoCompositionPreparer.ts imported only, never edited)

## Scope

- Claimed phase: Wave 2 batch 9 — task-status-progress zone (exclusive) + coordination-handoffs
- Allowed scope used: apps/server/src/tasks/manager.ts, taskDelegates.ts, new registries, handoff doc
- Scope deviations: none (all created files were in the planned-files list)

## What Changed Architecturally

### Runtime prototype monkey-patching: FULLY REMOVED

The original wiring:

- `taskDelegates.ts` exported an object of 35 `this: TaskManagerRuntime` wrapper functions, each forwarding to an already-extracted implementation module.
- `manager.ts` ended with `Object.assign(TaskManager.prototype, taskDelegates, { ...5 overridden wrappers... })`, plus 34 `declare run: ...` type-only field shims to make the patched methods typecheck.

Both are gone. TaskManager now declares every runtime-contract method as a real class method that delegates to the same focused implementation modules (`codexRunner`, `imageRunner`, `audioRunner`, `videoRunner`, `pipelineRunner`, `taskLifecycle`, `taskFailedBuildCleaner`). Because they are real instance methods, tests that override per-instance (`internals.runVideoTask = ...`, `app.tasks.createImageProvider = ...`) still work — instance properties shadow prototype methods, and monkey-patching the prototype is no longer needed anywhere.

### Explicit composition: registries own the state, manager stays the composition root

Four cohesive services were extracted. TaskManager owns them as private fields and exposes their state through the frozen flat `TaskManagerRuntime` contract (see Decisions for why flat fields must remain):

| Registry | Owns | Flat-field aliases on TaskManager |
| --- | --- | --- |
| `TaskAbortRegistry` | image/video/short-reel AbortControllers, shortReelTargets | `activeImageControllers`, `activeVideoControllers`, `activeShortReelControllers`, `shortReelTargets` |
| `PipelineExecutionEngine` | activeRuns (ActiveRun), pipelineRuns (PipelineRun), completionWaiters | `active`, `pipelineRuns`, `completionWaiters` |
| `TaskApprovalRegistry` | pending approval map + `decideTaskApproval` wiring | `approvalRequests` (getter) |
| `TaskQueueCoordinator` | lock set + pump wiring + running-work checks | `locks`; running counters remain flat manager fields |

New registry behaviors that used to live as ad-hoc loops in manager.ts's Object.assign overrides:

- `releaseShortReelsFor(taskIds)` / `reconcileShortReels(validIds)` — the abort/cleanup loops previously duplicated in `pruneEpisodeTasks`/`pruneChannelTasks`/`reconcileOrphanedTasks` overrides.
- `PipelineExecutionEngine.completeRun(taskId)` — the active/completionWaiter cleanup previously inlined in `finish`.
- `cleanupExpiredFailedBuilds`/`startFailedBuildCleanupTimer` now delegate straight to `taskFailedBuildCleaner` (the old delegates + Object.assign wrappers duplicated its logic).

## Delegate Migration Table (all 35 + 5 overrides)

| taskDelegates entry (35) | Destination |
| --- | --- |
| run, handleNotification, handleServerRequest, completeWithOutput, retryQuizResearch, retryScript, retryVisualBible, retrySequenceScenes, retryTopicSuggestions | Real method on TaskManager -> `codexRunner.ts` (unchanged) |
| createImageProvider, generateBundleImageWithSafetyRetry, runGpti2BundleImageTask, runAntigravityBundleImageTask, runShopAiKeyImageTask | Real method -> `imageRunner.ts` (unchanged) |
| runPipelineTask, runQuizV2Pipeline, hasReadyArtifact, generatePipelineBundleImages, attachPipelineBundleImages, hasReadyScript, hasValidNarrationAsset, isShotPlanFresh, waitForTaskTerminal | Real method -> `pipelineRunner.ts` re-exports (unchanged) |
| runAudioTask | Real method -> `audioRunner.ts` (unchanged) |
| runVideoTask | Real method -> `videoRunner.ts` (unchanged) |
| cleanupExpiredFailedBuilds, startFailedBuildCleanupTimer | Real method -> `taskFailedBuildCleaner.ts` directly (replaces duplicate delegate logic) |
| hasActiveEpisodeTasks, hasActiveChannelTasks, reconcileQuestionHistory, pruneEpisodeTasks*, pruneChannelTasks*, reconcileOrphanedTasks* | Real method -> `taskLifecycle.ts`; * pruned methods additionally call `abortRegistry.releaseShortReelsFor` / `reconcileShortReels` |
| (Object.assign overrides) pruneEpisodeTasks/pruneChannelTasks/reconcileOrphanedTasks wrappers | Inlined into the real methods above (registry calls, no duplication) |
| (Object.assign overrides) cleanupExpiredFailedBuilds/startFailedBuildCleanupTimer wrappers | Deleted — `taskFailedBuildCleaner` already implements the promise/timer de-dup |

## Decisions

- Decision: Keep flat state fields on TaskManager (aliasing registry-owned instances) instead of nested `manager.abortRegistry.imageControllers` access.
  - Reason: The `TaskManagerRuntime` interface is a frozen contract — ~10 server test files (server-tests zone, NOT editable by this agent) build plain-object runtime mocks with flat fields (`activeVideoControllers`, `pipelineRuns`, ...) and call runner functions via `.call(runtime, ...)`; routes/tests also do `app.tasks.activeShortReelControllers.set(...)`. Renaming or nesting these fields would break uneditable tests and 20+ runner modules that use `this.` flat access.
  - Impact on later phases: Any future decomposition must preserve the flat `TaskManagerRuntime` surface or coordinate a sweeping test-zone change first.
- Decision: Queue running counters (`runningCount`, etc.) stay plain mutable manager fields; coordinator owns locks + pump.
  - Reason: `pumpTaskQueue` mutates counters via `runtime.runningCount += 1` — getters without setters would throw under `useDefineForClassFields`. Locks and pump wiring are coordinator-owned; counters passed as a state snapshot for `hasRunningWork`.
  - Impact: A later phase could move counters into the coordinator only by also refactoring `taskQueuePump.ts` and its plain-object test mocks (server-tests zone).
- Decision: `approvalRequests` is a getter returning the registry's map (all existing consumers only read/set/delete on the map, never reassign).
  - Reason: Registry must be constructed in the constructor (needs codex + lifecycle callbacks); a getter satisfies the interface while keeping a single source of truth.
- Decision: manager.ts is 429 lines, above the ~300 target but below the old 341+177=518 combined footprint.
  - Reason: Every `TaskManagerRuntime` method must exist on the class; the file is now pure composition (fields, constructor, lifecycle orchestration, one-line delegations) with zero business logic. Splitting the delegation block further would require re-introducing indirection (the thing this refactor removes).
  - Impact: If a later wave wants manager.ts smaller, the lever is shrinking `TaskManagerRuntime` itself (test-coordination effort), not manager.ts.

## Verification

- Command: `pnpm --filter @studio/server typecheck`
  - Result: PASS (clean, zero errors)
- Command: `npx vitest run test/tasks.test.ts --testTimeout 15000` (46-test suite per briefing; 18 test cases in file)
  - Result: PASS 18/18, UNCHANGED test file
- Command: `npx vitest run test/taskLifecycle.test.ts test/taskMutationQueue.test.ts test/taskOrphanReconciliation.test.ts test/taskStateStore.test.ts test/taskRenderProgressSchema.test.ts test/hyperframesProgress.test.ts`
  - Result: PASS 19/19
- Command: `npx vitest run test/tasks.test.ts test/hyperframesProgress.test.ts` (claim-required combo)
  - Result: PASS 22/22
- Command: `npx vitest run test/episodeDeletionTasks.test.ts test/bundleImageTask.test.ts test/videoCancellation.test.ts test/videoRunnerCancellationLifecycle.test.ts test/videoRunnerStyleBoundary.test.ts test/pipelineVideoProgress.test.ts` (internal-surface consumers)
  - Result: PASS 15/15
- Command: `npx vitest run test/topicToEpisodePipelineE2E.test.ts test/shortReelRoutesGenerate.test.ts test/shortReelRoutesConflict.test.ts` (tests that patch manager methods/fields)
  - Result: PASS 12/12
- Command: `pnpm --filter @studio/web test -- src/components/TaskProgressPanel.test.tsx`
  - Result: PASS — full web suite ran 72 files / 330 tests, all green (TaskProgressPanel included)
- Command: `pnpm exec prettier --check` on all 5 owned/created task files
  - Result: PASS
- Command: `node scripts/check-format.mjs`
  - Result: 15 unformatted files repo-wide, ALL pre-existing dirty files owned by other active agents (candyArcadeClips, codexRetries, videoCompositionPreparer, introOutro*, ShortReelStudio, etc.) — none of them mine; my 5 files all pass prettier. Not fixable from this zone without violating claim boundaries.
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: PASS (valid: true, 0 unmapped, 0 overlapping, 0 definition errors)
- Command: `git status --porcelain` vs saved baseline
  - Result: Current dirty set is a strict superset of the 162-file baseline; my footprint is exactly the 6 claimed task files + this handoff. All other new dirty entries belong to concurrent wave-1 agents.
- Note: One earlier full-suite run had 2 flaky timeouts (`scriptQuality.test.ts`, 3s waitFor under 196-file parallel load); re-run in isolation passes 5/5. Pre-existing flakiness, unrelated to this change (test only uses public `submit`/`get`/`load`).

## Open Risks

- Risk: `pnpm --filter @studio/server test -- test/tasks.test.ts` does not pass the file filter through pnpm (it ran the entire 196-file suite). Use `cd apps/server && npx vitest run <files>` for targeted runs.
  - Suggested next action: none (environment quirk, documented here).
- Risk: `taskDelegates.ts` deletion removes the only consumer of `codexRunner.ts`'s re-export block (lines 22-31). If another module later wants those re-exports they still exist; harmless.
  - Suggested next action: optional cleanup of the re-export block in codexRunner by a future task-status-progress claimant.

## Next Phase Input

- Files the next agent must read: `apps/server/src/tasks/manager.ts`, `runtime.ts`, the 4 new registries (`taskAbortRegistry.ts`, `taskQueueCoordinator.ts`, `pipelineExecutionEngine.ts`, `taskApprovalRegistry.ts`), this handoff.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`; then `cd apps/server && npx vitest run test/tasks.test.ts test/taskLifecycle.test.ts --testTimeout 15000`.
- Important constraints: `TaskManagerRuntime`'s flat fields and method names are a frozen cross-zone contract (plain-object mocks in uneditable tests + runner modules' `this:` usage). Public API of TaskManager is byte-for-byte behavior-compatible: same constructor signature, same method names/signatures, same EventEmitter events (event names/order untouched — emitEvent paths unchanged).
