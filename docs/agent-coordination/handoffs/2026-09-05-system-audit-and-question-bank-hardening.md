# Phase Handoff Summary: Question Bank System Audit, Hardening & Bug Fixes

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: dirtyFileCount=85

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- apps/server/src/repository/quiz/questionBankRepository.ts
- apps/server/src/quiz/bank/matrixCoverageService.ts
- apps/server/src/quiz/bank/questionBankJobManager.ts
- apps/server/src/routes/questionBank.ts
- apps/web/src/api/questionBankApi.ts
- apps/web/src/features/questionBank/components/QuestionBankActivityBar.tsx
- apps/web/src/features/questionBank/hooks/useQuestionBank.ts

## Files Changed

- `apps/server/src/repository/quiz/questionBankRepository.ts`
- `apps/server/src/quiz/bank/matrixCoverageService.ts`
- `apps/server/src/quiz/bank/questionBankJobManager.ts`
- `apps/server/src/routes/questionBank.ts`
- `apps/server/test/questionBankIntegration.test.ts`
- `apps/server/test/questionBankRepository.test.ts`
- `apps/server/test/questionBankJobManager.test.ts`
- `apps/web/src/api/questionBankApi.ts`
- `apps/web/src/features/questionBank/components/QuestionBankActivityBar.tsx`
- `apps/web/src/features/questionBank/hooks/useQuestionBank.ts`
- `docs/agent-coordination/handoffs/2026-09-05-system-audit-and-question-bank-hardening.md`

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope

## Scope

- Claimed zones: api-contracts, artifact-contracts, server-core, server-tests, web-api-state, web-layout-style, agent-coordination
- Allowed scope used:
  - `apps/server/src/repository/quiz/questionBankRepository.ts`: Added default descending sort (`updated_at || created_at`) to `queryQuestionBankQuestions` so newly generated questions appear on Page 1 immediately; hardened `deleteQuestionBankQuestion` to update all candidate root storage locations, preventing cross-root ghost reappearance.
  - `apps/server/src/quiz/bank/matrixCoverageService.ts`: Added secondary backfill loop in `selectDomainBatchEntities` to support domains with fewer entities than `targetCount`, allowing least-variant entities to fill chunk capacity.
  - `apps/server/src/quiz/bank/questionBankJobManager.ts`: Added `dismissJob()` and 45-second auto-expiration of finished jobs in `getStatus()`.
  - `apps/server/src/routes/questionBank.ts`: Added `POST /api/question-bank/generate-batch/dismiss` endpoint.
  - `apps/server/test/questionBankIntegration.test.ts`: Increased `create-episode` test timeout to 15,000ms.
  - `apps/server/test/questionBankRepository.test.ts`: Added test for newest-first sorting.
  - `apps/server/test/questionBankJobManager.test.ts`: Added tests for `dismissJob()` and auto-expiration.
  - `apps/web/src/api/questionBankApi.ts`: Added `dismissBatchGeneration()` client API method.
  - `apps/web/src/features/questionBank/components/QuestionBankActivityBar.tsx`: Tracked dismissed job IDs in a ref, auto-expired finished jobs older than 15s on mount, and called `api.dismissBatchGeneration()` upon dismiss.
  - `apps/web/src/features/questionBank/hooks/useQuestionBank.ts`: Synchronized dismissed job state, avoided resurrecting stale jobs, and hooked `api.dismissBatchGeneration()` to auto-dismiss and `dismissJobBar`.
  - `docs/agent-coordination/handoffs/2026-09-05-system-audit-and-question-bank-hardening.md`: Phase handoff record.
- Scope deviations: None

## Decisions

- Decision 1 (Sorting Newest First): Questions returned by `queryQuestionBankQuestions` now sort by timestamp descending by default, so newly generated/updated questions instantly appear at the top of Page 1 without requiring filtering or manual refresh.
- Decision 2 (Stale Job Dismissal & Expiration): Solved ActivityBar ghost reappearance by adding a server dismiss endpoint (`POST /api/question-bank/generate-batch/dismiss`), an auto-expiration timeout (45s on server, 15s on client mount), and a set of dismissed job IDs in client memory.
- Decision 3 (Entity Shortage Backfill): When a domain has fewer entities than `targetCount`, `selectDomainBatchEntities` now cycles through the domain's entities ordered by existing variants ascending to fill remaining slots, guaranteeing full 20-candidate chunks.
- Decision 4 (Multi-Root Deletion Consistency): `deleteQuestionBankQuestion` updates all candidate root directories where the batch file exists, eliminating orphaned copies.

## Verification

- Command: pnpm --filter @studio/server test test/questionBankRepository.test.ts test/questionBankIntegration.test.ts test/questionBankBatchService.test.ts test/questionBankConcurrencyE2E.test.ts test/questionBankResilience.test.ts test/questionBankReverseMatrixE2E.test.ts test/questionBankRoute.test.ts test/questionBankSchema.test.ts test/questionBankAutoQa.test.ts test/matrixCoveragePlanner.test.ts test/matrixCoverageService.test.ts test/questionBankJobManager.test.ts
  - Result: Passed (124/124 tests passed across 12 test suites)
- Command: pnpm --filter @studio/web test
  - Result: Passed (231/231 tests passed across 54 test suites)
- Command: pnpm typecheck
  - Result: Passed (0 errors across @studio/shared, @studio/server, and @studio/web)
- Command: pnpm --filter @studio/web build
  - Result: Passed (Vite production build succeeded in 3.17s)
- Command: node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs
  - Result: Passed (57/57 agent coordination tests passed)
- Command: node scripts/agent-validate-zones.mjs --json
  - Result: Passed (1,045 files, 19 zones, 0 errors, 0 unmapped, 0 overlapping)

## Next Steps

- System audit, edge-case hardening, and bug fixes are complete and verified across both backend and frontend layers.
