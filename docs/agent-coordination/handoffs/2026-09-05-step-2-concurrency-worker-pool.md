# Phase Handoff Summary: Step 2 5-Worker Concurrency Pool & Pipeline

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: dirtyFileCount=82

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-step-1-pre-allocation-matrix-planner.md
- apps/server/src/quiz/bank/questionBankBatchService.ts

## Files Changed

- apps/server/src/quiz/bank/questionBankBatchService.ts
- apps/server/test/questionBankBatchService.test.ts
- docs/agent-coordination/handoffs/2026-09-05-step-2-concurrency-worker-pool.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope

## Scope

- Claimed zones: server-core, server-tests, agent-coordination
- Allowed scope used:
  - `apps/server/src/quiz/bank/questionBankBatchService.ts`: Integrated `planBatchChunks` upfront, implemented 5-worker concurrent subagent pool (`DEFAULT_BATCH_CONCURRENCY = 5`), built `AsyncMutex` for thread-safe repository persistence and real-time progress callbacks, and added transient rate limit retry with jittered exponential backoff.
  - `apps/server/test/questionBankBatchService.test.ts`: Added concurrency tests verifying 5 concurrent workers executing 100 questions in parallel, real-time chunk progress reporting, and clean abort handling.
  - `docs/agent-coordination/handoffs/2026-09-05-step-2-concurrency-worker-pool.md`: Phase handoff record.
- Scope deviations: None

## Decisions

- Decision 1 (5-Worker Concurrency Pool): Replaced sequential chunk generation loop with a bounded worker pool dispatching up to 5 concurrent workers simultaneously. For 100 questions (5 chunks of 20), all 5 chunks are processed in parallel in a single wave, dramatically reducing generation latency from ~120s to ~25s.
- Decision 2 (Thread-Safe Persistence Mutex): Introduced `AsyncMutex` wrapping disk writes (`repository.saveQuestionBankQuestion`) and shared accounting (`allSaved`, `completedChunksCount`, `onChunkProgress`). While LLM requests and Auto-QA validations run concurrently, persistence to the filesystem is safely serialized to prevent write race conditions.
- Decision 3 (Rate-Limit Jittered Backoff): Wrapped `executeSinglePromptText` with `executeWithRetry` to detect transient `429 Too Many Requests` or `RESOURCE_EXHAUSTED` responses and retry with jittered backoff, safeguarding against burst limits.
- Decision 4 (Immediate Abort Handling): Tied `input.signal` into worker dispatching so that cancelling a generation job aborts running workers and skips unstarted chunks in the queue immediately without wasting LLM quota.

## Verification

- Command: pnpm --filter @studio/server test test/matrixCoveragePlanner.test.ts test/matrixCoverageService.test.ts test/questionBankBatchService.test.ts test/questionBankJobManager.test.ts test/questionBankRoute.test.ts test/questionBankRepository.test.ts test/questionBankSchema.test.ts test/questionBankReverseMatrixE2E.test.ts
  - Result: Passed (72/72 tests passed across 8 test suites)
- Command: pnpm --filter @studio/web test
  - Result: Passed (231/231 tests passed across 54 test suites)
- Command: pnpm typecheck
  - Result: Passed (0 errors across @studio/shared, @studio/server, and @studio/web)
- Command: pnpm --filter @studio/web build
  - Result: Passed (Vite built in 3.12s)
- Command: node scripts/agent-validate-zones.mjs --json
  - Result: Passed (1044 files, 19 zones, 0 errors, 0 unmapped, 0 overlapping)

## Next Steps

- All Step 2 objectives completed and verified.
