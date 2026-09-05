# Batch-Level Balanced Round-Robin Question Generation Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 78 dirty files captured in claim baseline

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-fix-llm-batch-generation-timeout.md

## Files Changed

- apps/server/src/quiz/bank/matrixCoverageService.ts
- apps/server/test/matrixCoverageService.test.ts
- apps/server/test/questionBankBatchService.test.ts
- docs/agent-coordination/handoffs/2026-09-05-batch-level-balanced-round-robin.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope

## Scope

- Claimed phase: server-core, server-tests, agent-coordination
- Allowed scope used: apps/server/src/quiz/bank/matrixCoverageService.ts, apps/server/test/matrixCoverageService.test.ts, apps/server/test/questionBankBatchService.test.ts, docs/agent-coordination/handoffs/2026-09-05-batch-level-balanced-round-robin.md
- Scope deviations: none

## Decisions

- Decision 1: Refactored `selectAutoCandidates` in `matrixCoverageService.ts` to enforce **Batch Cohesion**: every chunk (up to 20 questions) is strictly locked to exactly ONE Domain and ONE Archetype, selecting up to 20 distinct entities from that domain.
- Reason: Previous implementation used a nested loop iterating through all 2,500 entities of the first archetype (`verdict_fact_myth` / True-False) before touching any other archetype, causing 100% of generated batches to be True/False questions.
- Decision 2: Implemented **Balanced Multi-Dimensional Round-Robin**: candidate (Domain, Archetype) pairs are ranked dynamically by unfilled status, pair variant count, domain variant total, archetype variant total, and a diagonal interleaving tie-breaker, guaranteeing that consecutive batches rotate smoothly across both domains and archetypes.
- Decision 3: Implemented **Same-Domain Backfill with Least-Variant-First**: when a domain has fewer unfilled entities than requested for an archetype, it takes all remaining unfilled entities and backfills the rest from the same domain's lowest-variant entities without duplicating any entity in the batch. Once the entire matrix is saturated ($\ge 1$ variant per cell), the system seamlessly shifts to layered least-variant generation.
- Impact on later phases: Generation of 20, 100, 200, or 500 questions produces perfectly balanced, themed 20-question batches across all 14 domains and 8 archetypes, ready for direct quiz episode production without manual filtering.

## Verification

- Command: `pnpm --filter @studio/server test test/matrixCoverageService.test.ts test/questionBankBatchService.test.ts test/questionBankJobManager.test.ts test/questionBankRoute.test.ts test/questionBankRepository.test.ts test/questionBankSchema.test.ts test/questionBankReverseMatrixE2E.test.ts`
- Result: 65 passed across 7 test suites (65/65)
- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: valid: true, 0 unmapped, 0 overlapping

## Open Risks

- None. Fully backward-compatible with manual selection, existing repository endpoints, and batch chunking engines.

## Next Phase Input

- Files the next agent must read: `apps/server/src/quiz/bank/matrixCoverageService.ts`
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`
- Important constraints: Maintain batch-level domain and archetype cohesion when modifying chunk candidate selection.
