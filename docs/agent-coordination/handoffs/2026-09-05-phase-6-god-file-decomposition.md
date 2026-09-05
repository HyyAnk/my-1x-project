# Phase 6: God File Decomposition (Matrix Coverage & Question Bank Batch Services) Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity-phase-6
- Working mode: main-direct
- Baseline before edits: 116 pre-existing dirty files on main captured via `git status --porcelain`

## Source Files Read

- AGENTS.md
- GEMINI.md
- .agents/rules/agent-coordination.md
- .agents/rules/english-only.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-phase-5-god-file-decomposition.md

## Files Changed

### Created
- `apps/server/src/quiz/bank/matrix/matrixCoverageCalculator.ts` (153 lines): Calculates matrix coverage statistics, entity domain/archetype aggregations, and coverage map lookup.
- `apps/server/src/quiz/bank/matrix/matrixDeficitPlanner.ts` (409 lines): Auto and manual candidate selection with Least-Variant-First prioritization and multi-chunk virtual reservation planning.
- `apps/server/src/quiz/bank/matrix/index.ts` (2 lines): Barrel export assembling coverage calculator and deficit planner symbols.
- `apps/server/src/quiz/bank/batch/batchChunkScheduler.ts` (273 lines): Worker pool scheduler with concurrency throttling, transient 429 retry, mutex-serialized persistence, Auto-QA verification, and cancellation signal support.
- `docs/agent-coordination/handoffs/2026-09-05-phase-6-god-file-decomposition.md`: Phase 6 handoff documentation.

### Refactored
- `apps/server/src/quiz/bank/matrixCoverageService.ts` (567 -> 25 lines): Lightweight backward-compatible facade re-exporting all matrix calculation and deficit planning symbols.
- `apps/server/src/quiz/bank/questionBankBatchService.ts` (407 -> 139 lines): High-level batch generation coordinator orchestrating chunk pre-allocation, worker scheduling, and Auto-QA verification under 140 lines.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope (only target bank service files, extracted sub-modules, and handoff were touched)

## Scope

- Claimed phase: Phase 6 (God File Decomposition for Matrix Coverage and Question Bank Batch Services)
- Allowed scope used: `server-core`, `agent-coordination`
- Scope deviations: None. All modifications strictly performed within declared claim and planned files.

## Decisions

- Decision: Split `matrixCoverageService.ts` into pure calculator (`matrixCoverageCalculator.ts`), deficit planner (`matrixDeficitPlanner.ts`), and barrel facade (`matrixCoverageService.ts`).
  - Reason: Reduces `matrixCoverageService.ts` from 567 lines to 25 lines (< 80 lines) while preserving all named exports and interface contracts.
  - Impact on later phases: Consumers can import from either `./matrixCoverageService.js` or `./matrix/index.js` without changes.
- Decision: Extract batch execution logic into `batchChunkScheduler.ts` and keep `questionBankBatchService.ts` as a concise workflow coordinator.
  - Reason: De-couples chunk scheduling, mutex persistence, LLM prompt retries, and Auto-QA from high-level orchestration, reducing `questionBankBatchService.ts` from 407 lines to 139 lines (< 140 lines).
  - Impact on later phases: Consumers maintain seamless backwards compatibility with existing signatures, constants (`MAX_BATCH_CHUNK_SIZE`, `DEFAULT_BATCH_CONCURRENCY`), and types.

## Verification

- Command: `pnpm --filter @studio/server test test/matrixCoverageService.test.ts`
  - Result: 11/11 tests passed (matrix coverage calculations, auto candidate selection, manual diversity mode, chunk planning).
- Command: `pnpm --filter @studio/server test test/questionBankBatchService.test.ts`
  - Result: 7/7 tests passed (prompt builder, output parser, batch generation coordinator, offline candidate override).
- Command: `pnpm --filter @studio/server test test/questionBankReverseMatrixE2E.test.ts`
  - Result: 24/24 tests passed (full reverse generation E2E, matrix integration, multi-chunk scheduler).
- Command: `pnpm --filter @studio/server test test/questionBankAutoQa.test.ts test/questionBankRepository.test.ts test/questionBankRoute.test.ts`
  - Result: 39/39 tests passed across question bank suites.
- Command: `pnpm typecheck`
  - Result: Monorepo TypeScript check passed cleanly (0 errors across packages/shared, apps/server, apps/web).
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: 19 zones valid, 0 errors, 0 unmapped files, 0 overlapping files.
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: 57/57 tests passed (0 failures).

## Open Risks

- None identified. All exports, public types, and runtime behaviors have been preserved with zero breaking changes.

## Next Phase Input

- Files the next agent must read:
  - `apps/server/src/quiz/bank/matrixCoverageService.ts`
  - `apps/server/src/quiz/bank/matrix/index.ts`
  - `apps/server/src/quiz/bank/questionBankBatchService.ts`
  - `apps/server/src/quiz/bank/batch/batchChunkScheduler.ts`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `pnpm --filter @studio/server test test/questionBankReverseMatrixE2E.test.ts`
- Important constraints:
  - Maintain line count budgets (< 80 lines for `matrixCoverageService.ts`, < 140 lines for `questionBankBatchService.ts`).
  - Maintain English-only naming and docstrings across all server modules.
