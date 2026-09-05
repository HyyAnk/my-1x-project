# Phase 3: Question Bank REST API Layer Handoff Summary

## Status

- Result: completed
- Date: 2026-09-04
- Agent: Antigravity
- Working mode: main-direct
- Baseline before edits: 67 pre-existing dirty files preserved untouched

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-04-phase-2-question-bank-repository-and-cooldown.md

## Files Changed

- apps/server/src/routes/questionBank.ts (NEW)
- apps/server/src/app.ts (MODIFIED - registered question bank routes)
- apps/server/src/repository/quiz/questionBankRepository.ts (MODIFIED - auto-recalculation, robust multi-root batch resolution, sync save/delete)
- apps/server/test/questionBankRoute.test.ts (NEW - 6 route integration tests)
- docs/agent-coordination/handoffs/2026-09-04-phase-3-question-bank-api-layer.md (NEW)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: Phase 3 (REST API Routes for Question Bank)
- Allowed scope used: api-contracts, server-tests, agent-coordination, artifact-contracts
- Scope deviations: Expanded claim to include `artifact-contracts` for `apps/server/src/repository/quiz/questionBankRepository.ts` to harden batch reading and index synchrony across dual runtime/project storage roots.

## Decisions

- Decision: Designed RESTful endpoints under `/api/question-bank/*` and channel-scoped questions under `/api/channels/:channelId/question-bank/questions`.
- Reason: Clean separation of concerns; channels need channel-scoped cooldown indicators (`is_cooldown`, `cooldown_until`, `cooldown_days_remaining`, `rendered_count`), while global endpoints handle taxonomy, overall stats, and CRUD.
- Decision: Implemented strict Zod schema validation using `BankQuestionSchema` on POST/PUT requests and returned structured JSON error responses with detailed issues on failure.
- Reason: Guarantees question data integrity before writing to batch JSON files on disk.
- Decision: Synchronous `await recalculateQuestionBankIndex` in `saveQuestionBankQuestion` and `deleteQuestionBankQuestion`, and reading existing batch via `getQuestionBankPath` before write.
- Reason: Eliminates race conditions and prevents overwriting existing seed questions when creating/deleting questions across runtime and project repository storage roots.

## Verification

- Command: `pnpm --filter @studio/server test -- test/questionBankRoute.test.ts test/questionBankRepository.test.ts test/questionBankSchema.test.ts`
  - Result: Passed (18/18 tests passed across 3 test suites)
- Command: `pnpm typecheck`
  - Result: Passed (all 3 workspaces @studio/shared, @studio/server, @studio/web clean)
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: Passed (91/91 coordination tests passed)
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (0 definition errors, 0 unmapped, 0 overlapping files)

## Open Risks

- Risk: None identified. All endpoints are non-breaking and backward-compatible.
- Suggested next action: Proceed to Phase 4 (AI Batch Ingestion & Auto-QA Pipeline).

## Next Phase Input

- Files the next agent must read:
  - `apps/server/src/routes/questionBank.ts`
  - `apps/server/src/repository/quiz/questionBankRepository.ts`
  - `packages/shared/src/schemas/questionBank.ts`
  - `docs/agent-coordination/handoffs/2026-09-04-phase-3-question-bank-api-layer.md`
- Commands the next agent should run first:
  - `git status --porcelain`
  - `node scripts/agent-status.mjs --json`
- Important constraints:
  - Keep AI batch ingestion streaming/chunked to handle 50-100 questions per batch without OpenAI API token limits.
  - Apply automated deduplication/QA check against existing questions before persisting into batches.
