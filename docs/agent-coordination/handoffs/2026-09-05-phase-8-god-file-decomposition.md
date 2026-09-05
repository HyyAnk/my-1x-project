# Phase 8: God File Decomposition (Question Bank Repository & Routes) Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: subagent-phase-8
- Working mode: main-direct
- Baseline before edits: 129 pre-existing dirty files on main captured via `git status --porcelain`

## Source Files Read

- AGENTS.md
- GEMINI.md
- .agents/rules/agent-coordination.md
- .agents/rules/english-only.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-phase-7-god-file-decomposition.md

## Files Changed

### Created
- `apps/server/src/repository/quiz/bank/bankPathResolver.ts` (48 lines):
  - Path resolution logic (`getQuestionBankPath`, `getQuestionBankWritePath`, `QUESTION_BANK_DIR`).
- `apps/server/src/repository/quiz/bank/bankTaxonomySync.ts` (216 lines):
  - Canonical domain metadata (`CANONICAL_DOMAIN_META`), entity scanning, format title helper, and taxonomy merging (`syncTaxonomyFromKnowledgeBase`, `readQuestionBankTaxonomy`).
- `apps/server/src/repository/quiz/bank/bankBatchStorage.ts` (193 lines):
  - Atomic read and write of subtopic JSON batch files (`matchesArchetypeFilter`, `readSubtopicBatch`, `writeSubtopicBatch`, `listQuestionBankBatches`).
- `apps/server/src/repository/quiz/bank/bankQueryEngine.ts` (417 lines):
  - Querying, filtering, pagination, text search, deduplication, 30-day channel cooldown calculation, and question CRUD (`queryQuestionBankQuestions`, `searchQuestionBank`, `getQuestionBankQuestion`, `saveQuestionBankQuestion`, `deleteQuestionBankQuestion`, `clearQuestionBank`, `clearAllQuestionBankQuestions`, `QueryQuestionBankParams`).
- `apps/server/src/repository/quiz/bank/bankTranslationStore.ts` (93 lines):
  - Translation cache persistence and retrieval (`saveQuestionBankTranslation`, `readQuestionBankTranslation`).
- `apps/server/src/repository/quiz/bank/bankIndexManager.ts` (104 lines):
  - Index reading, recalculation, and matrix coverage stats (`readQuestionBankIndex`, `recalculateQuestionBankIndex`, `getQuestionBankMatrixCoverage`).
- `apps/server/src/repository/quiz/bank/index.ts` (7 lines):
  - Barrel export for the bank repository sub-modules.
- `apps/server/src/routes/questionBank/queryRoutes.ts` (105 lines):
  - Taxonomy, stats, recalculate, matrix coverage, channel questions with cooldown, global questions, and single question query endpoints.
- `apps/server/src/routes/questionBank/crudRoutes.ts` (65 lines):
  - Create, update, delete, and clear questions endpoints.
- `apps/server/src/routes/questionBank/batchRoutes.ts` (121 lines):
  - Batch generation trigger, background job status, and job cancellation endpoints (`resolveLlmClient`, `registerBatchRoutes`).
- `apps/server/src/routes/questionBank/buildRoutes.ts` (80 lines):
  - Direct episode build and on-demand transcreation endpoints (`registerBuildRoutes`).
- `apps/server/src/routes/questionBank/index.ts` (40 lines):
  - Route registration aggregator and `QuestionBankRouteDeps` definition.
- `docs/agent-coordination/handoffs/2026-09-05-phase-8-god-file-decomposition.md`:
  - Phase 8 handoff summary documentation.

### Refactored
- `apps/server/src/repository/quiz/questionBankRepository.ts` (867 -> 50 lines, 94.2% reduction):
  - Facade strictly under 140 lines bound to `RepositoryRuntime`, providing 100% backward compatibility for all exported functions and types.
- `apps/server/src/routes/questionBank.ts` (353 -> 17 lines, 95.2% reduction):
  - Clean plugin facade strictly under 60 lines mounting sub-route modules with identical exports and signatures.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope (only target repository files, newly extracted sub-modules, and handoff document were created/modified)

## Scope

- Claimed phase: Phase 8 (God File Decomposition for questionBankRepository and questionBank routes)
- Allowed scope used: `artifact-contracts`, `api-contracts`, `agent-coordination`
- Scope deviations: None. All modifications strictly performed within declared claim and planned concrete files.

## Decisions

- Decision: Decompose `questionBankRepository.ts` into 6 cohesive sub-modules under `apps/server/src/repository/quiz/bank/`: path resolver, taxonomy sync, batch storage, query engine, translation store, and index manager, bound via `index.ts`.
  - Reason: Segregates distinct storage and query responsibilities, adhering to the Single Responsibility Principle.
  - Impact on later phases: Repository runtime methods and consumers can consume functions either through the facade or modular sub-packages without breaking changes.
- Decision: Decompose `routes/questionBank.ts` into 4 dedicated sub-route modules under `apps/server/src/routes/questionBank/`: query routes, CRUD routes, batch routes, and build routes.
  - Reason: Separates read queries, entity modifications, asynchronous background job orchestration, and episode pipeline triggering into clear, maintainable modules under 130 lines each.
  - Impact on later phases: Enables isolated testability and future endpoint extensions without file bloat.

## Verification

- Command: `pnpm --filter @studio/server test test/questionBankRepository.test.ts test/questionBankRoute.test.ts test/questionBankClear.test.ts test/questionBankIntegration.test.ts`
  - Result: 34/34 tests passed.
- Command: `pnpm --filter @studio/server test test/questionBankAutoQa.test.ts test/questionBankReverseMatrixE2E.test.ts test/questionCurationEngine.test.ts test/questionJitSeeding.test.ts`
  - Result: 73/73 tests passed.
- Command: `pnpm typecheck`
  - Result: Clean typecheck with 0 errors across `@studio/shared`, `@studio/server`, and `@studio/web`.
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: 19 zones valid, 0 errors, 0 unmapped files, 0 overlapping files.
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: 57/57 tests passed (0 failures).

## Open Risks

- None identified. All public signatures, return types, and runtime behaviors have been preserved with complete backwards compatibility.

## Next Phase Input

- Files the next agent must read:
  - `apps/server/src/repository/quiz/questionBankRepository.ts`
  - `apps/server/src/repository/quiz/bank/index.ts`
  - `apps/server/src/routes/questionBank.ts`
  - `apps/server/src/routes/questionBank/index.ts`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `pnpm --filter @studio/server test test/questionBankRepository.test.ts test/questionBankRoute.test.ts`
- Important constraints:
  - Maintain `questionBankRepository.ts` under 140 lines and `routes/questionBank.ts` under 60 lines.
  - Adhere to the strict English-only directive for all code, comments, and documentation.
