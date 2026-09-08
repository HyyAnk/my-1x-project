# Wave 3 Batch 12: tasks.test.ts God-File Split Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: refactor-wave3-12-tasks-tests
- Working mode: main-direct
- Baseline before edits: `git status --porcelain` captured to `$TEMP/baseline-wave3-12.txt` (213 entries) before the first edit; base revision `feaf77a5aa591116fa0f23320943fb1c5da3447c`
- Claims used: `claim-refactorwave312taskstests-mtt10e4n` (expired mid-run due to a late heartbeat), re-claimed as `claim-refactorwave312taskstests-mtt1suvq` (same files + the two extra manager split files)

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md (via protocol instructions)
- apps/server/test/tasks.test.ts (original, 1007 lines, 18 `it()` cases, 4 describe blocks)
- apps/server/test/shortReelRoutesTestUtils.ts (prior agent's shared-utils pattern)

## Files Changed

- DELETED: `apps/server/test/tasks.test.ts` (1007 lines)
- CREATED: `apps/server/test/tasksContracts.test.ts` (9 lines, 1 test)
- CREATED: `apps/server/test/tasksMarkdownExtraction.test.ts` (18 lines, 2 tests)
- CREATED: `apps/server/test/tasksSequencePlanning.test.ts` (150 lines, 6 tests)
- CREATED: `apps/server/test/taskManagerLocks.test.ts` (218 lines, 3 tests)
- CREATED: `apps/server/test/taskManagerQualityRetries.test.ts` (245 lines, 4 tests)
- CREATED: `apps/server/test/taskManagerPipelineLifecycle.test.ts` (244 lines, 2 tests)
- CREATED: `apps/server/test/tasksTestUtils.ts` (157 lines, shared fixtures)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none (verified via `git status --porcelain` diff against the saved baseline; the only delta is this task's 8 files plus 4 unrelated entries from concurrent agents: `scripts/coordination/monitor/web/monitor/`, `scripts/coordination/monitor/web/app.js`, and two handoff docs)

## Scope

- Claimed phase: Wave 3 batch 12 — split `apps/server/test/tasks.test.ts`
- Allowed scope used: `server-tests`, `coordination-handoffs`; planned files exactly as claimed (plus agent-expand for the two additional manager files before writing them)
- Scope deviations: the mission brief suggested 4 target files and estimated 46 tests; the actual file contains 18 `it()` cases (verified, no `it.each`), and the 670-line "TaskManager locks" block was split into three files by coherent sub-theme (locks/pools/concurrency, quality-gate retries, pipeline lifecycle) per the brief's "you may split further" allowance. agent-expand was run successfully before writing those two extra files.

## Decisions

- Decision: Keep the `describe("TaskManager locks", { timeout: 20000 }, ...)` wrapper with identical title and timeout in each of the three manager test files.
  - Reason: Titles must remain verbatim for parity, and the per-block timeout (20000 ms) is behavioral; some individual tests also carry their own 15000 ms timeout which was preserved byte-for-byte.
  - Impact on later phases: Test output shows the same describe names; traceability to the original suite is preserved.
- Decision: Move `FakeCodex`, `fakeWav`, `waitFor`, and the temp-root cleanup (`roots` array + `afterEach`) into `apps/server/test/tasksTestUtils.ts`; the only body-level mechanical change is `roots.push(root)` -> `registerTestRoot(root)`.
  - Reason: Follows the `shortReelRoutesTestUtils.ts` pattern from a prior agent; the afterEach cleanup semantics (module-scoped roots array per importing test module) are identical to the original because vitest registers the `afterEach` from the imported util module in the importing file's context.
  - Impact on later phases: Future task-family tests should reuse these fixtures instead of redefining them.
- Decision: Add `import type { Task } from "@studio/shared"` to the two manager files whose tests reference the bare `Task` type inside `internals` cast signatures (`taskManagerLocks.test.ts`, `taskManagerPipelineLifecycle.test.ts`).
  - Reason: The original file used `Task` without importing it (test files are outside the server `tsconfig` `include`, so `tsc` never checked it, and vitest strips types). Making the import explicit keeps the type resolvable for future lint/typecheck passes of tests; `@studio/shared` is the same source `taskLifecycle.test.ts` imports it from. Zero runtime impact.
  - Impact on later phases: None.
- Decision: `tasksContracts.test.ts` retained `TaskTypeSchema` import; manager files dropped only the symbols they do not use, each file carrying exactly the imports its tests need.
  - Reason: Brief requirement — distribute imports per ownership.
  - Impact on later phases: None.

## Verification

- Parity method: a generator script sliced the original file by verified line ranges and asserted (1) original `it()` count 18 == sum across new files, (2) sorted title lists byte-identical. Both assertions passed before any write.
- Command: `cd apps/server && npx vitest run test/tasksContracts.test.ts test/tasksMarkdownExtraction.test.ts test/tasksSequencePlanning.test.ts test/taskManagerLocks.test.ts test/taskManagerQualityRetries.test.ts test/taskManagerPipelineLifecycle.test.ts`
  - Result: 6 files passed, 18/18 tests passed.
- Command: `cd apps/server && npx vitest run test/taskLifecycle.test.ts test/taskMutationQueue.test.ts test/taskOrphanReconciliation.test.ts test/taskStateStore.test.ts test/taskRenderProgressSchema.test.ts test/hyperframesProgress.test.ts`
  - Result: 6 files passed, 19/19 tests passed.
- Command: `cd apps/server && npx vitest run` (full suite)
  - Result: 200/201 files passed, 1392/1393 tests passed. One failure: `test/questionJitSeeding.test.ts > questionJitSeeder > ensureTopicQuestionsWithJitFallback > fails with a clear error when the LLM client throws an unexpected error` (5s timeout). Verified UNRELATED: the test file is untracked and NOT in this task's baseline (created concurrently by another agent's in-flight work on `apps/server/src/quiz/bank/questionJitSeeder.ts`, which IS pre-existing dirty), it imports none of the split files, and this task touched zero src code. The failure reproduces in isolation identically.
- Command: `pnpm --filter @studio/server test` (claim-required verification, runs `vitest run --testTimeout 15000`)
  - Result: PASS — 201/201 files, 1393/1393 tests. The questionJitSeeding timeout did not recur under the 15s test timeout, confirming it is a timeout-budget flake in another agent's in-flight work, not a regression from this split.
- Command: `pnpm --filter @studio/server typecheck`
  - Result: PASS (exit 0).
- Command: `npx prettier --check <the 7 new files>`
  - Result: All matched files use Prettier code style (one file was auto-formatted with `--write` first; formatting only, no semantic change).
- Command: `git status --porcelain` vs saved baseline
  - Result: Only the claimed files changed for this task (1 deletion + 7 new files); no pre-existing dirty file was modified or reverted.

## Parity Table (block -> new file)

| Original describe block                                          | Original location | Tests | New file                             |
| ---------------------------------------------------------------- | ----------------- | ----- | ------------------------------------ |
| Quiz-only task contracts                                         | line 27           | 1     | tasksContracts.test.ts               |
| markdown extraction                                              | line 34           | 2     | tasksMarkdownExtraction.test.ts      |
| sequence retry planning                                          | line 50           | 6     | tasksSequencePlanning.test.ts        |
| TaskManager locks (locks/audio-pool/video-concurrency sub-group) | line 335          | 3     | taskManagerLocks.test.ts             |
| TaskManager locks (quality-gate retry sub-group)                 | line 335          | 4     | taskManagerQualityRetries.test.ts    |
| TaskManager locks (pipeline/timer sub-group)                     | line 335          | 2     | taskManagerPipelineLifecycle.test.ts |
| TOTAL                                                            |                   | 18    | 6 test files + 1 shared utils        |

Shared fixtures moved to `tasksTestUtils.ts`: `FakeCodex` class, `fakeWav()`, `waitFor()`, `registerTestRoot()` + `afterEach` cleanup. All test bodies, titles, expectations, timeouts, and `internals` mock-patching patterns (`internals.runVideoTask = ...`, `internals.tasks.set(...)`, flat runtime field access) are byte-identical to the original.

## Open Risks

- Risk: The three manager split files all register the same describe title "TaskManager locks" (required for verbatim parity), so test-run output shows three files with the same describe name.
  - Suggested next action: None required; file names disambiguate in vitest output.
- Risk: `questionJitSeeding.test.ts` is failing in the full suite due to another agent's in-flight work; integrators should confirm that agent's own verification before integration.
  - Suggested next action: Integrator re-runs the full suite after the jit-seeding agent completes and releases.

## Next Phase Input

- Files the next agent must read: `apps/server/test/tasksTestUtils.ts` (fixtures for any new task-family test), this handoff.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json` (claim state), `cd apps/server && npx vitest run test/tasksContracts.test.ts test/tasksMarkdownExtraction.test.ts test/tasksSequencePlanning.test.ts test/taskManagerLocks.test.ts test/taskManagerQualityRetries.test.ts test/taskManagerPipelineLifecycle.test.ts`.
- Important constraints: do not modify test bodies or titles when touching these files; the TaskManager-runtime flat-field mock pattern documented in wave 2 must be preserved.
